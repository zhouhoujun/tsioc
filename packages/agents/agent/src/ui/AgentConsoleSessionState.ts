import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { AgentConsoleTheme, AgentConsoleThemeInput, defaultAgentConsoleTheme, mergeAgentConsoleTheme } from './AgentConsoleTheme';

export interface AgentConsoleToolItem {
    name: string;
    toolset?: string;
    active: boolean;
    activationKind?: string;
}

export interface AgentConsoleActivity {
    id: string;
    kind: 'turn' | 'tool' | 'model' | 'error';
    message: string;
    createdAt: number;
}

export interface AgentConsoleToolRun {
    name: string;
    status: 'running' | 'success' | 'error';
    durationMs?: number;
    message: string;
    inputSummary?: string;
    outputSummary?: string;
    error?: string;
    attemptCount?: number;
    executionMode?: 'sequential' | 'parallel';
    receiptId?: string;
    toolCallId?: string;
    updatedAt: number;
}

export interface AgentConsoleTokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AgentConsoleSessionMeta {
    sessionId?: string;
    provider?: string;
    model?: string;
    workspace?: string;
}

export interface AgentConsoleSelectOption {
    label: string;
    value: string;
    description?: string;
    detail?: string | Record<string, any> | any[];
}

export interface AgentConsoleSelectMenu {
    title: string;
    hint?: string;
    options: AgentConsoleSelectOption[];
    selectedIndex: number;
}

@Injectable()
export class AgentConsoleSessionState {
    sessionId = 'console';
    input = '';
    title = '';
    messages: AgentMessage[] = [];
    status = 'idle';
    provider = '';
    model = '';
    workspace = '';
    tasksCount = 0;
    tools: AgentConsoleToolItem[] = [];
    activities: AgentConsoleActivity[] = [];
    runningTools: string[] = [];
    toolRuns: AgentConsoleToolRun[] = [];
    tokenUsage: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };
    lastError = '';
    notice = '';
    theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    selectMenu?: AgentConsoleSelectMenu;
    submitAction?: () => Promise<void>;
    selectMenuAction?: (value: string | undefined) => void | Promise<void>;
    commandHints = ['/help', '/tools', '/model', '/clear', '/quit', '/exit'];

    protected activeToolSet = new Set<string>();
    protected listeners = new Set<() => void>();

    configure(meta: AgentConsoleSessionMeta): this {
        if (meta.sessionId) {
            this.sessionId = meta.sessionId;
        }
        if (meta.provider !== undefined) {
            this.provider = meta.provider;
        }
        if (meta.model !== undefined) {
            this.model = meta.model;
        }
        if (meta.workspace !== undefined) {
            this.workspace = meta.workspace;
        }
        this.notify();
        return this;
    }

    setTitle(title: string): void {
        this.title = title;
        this.notify();
    }

    setProvider(provider: string): void {
        this.provider = provider;
        this.notify();
    }

    setModel(model: string): void {
        this.model = model;
        this.notify();
    }

    setWorkspace(workspace: string): void {
        this.workspace = workspace;
        this.notify();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    notify(): void {
        Array.from(this.listeners.values()).forEach(listener => listener());
    }

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        const active = this.toolRuns.find(item => item.status === 'running');
        if (active) {
            return active;
        }
        return this.toolRuns
            .slice()
            .sort((left, right) => right.updatedAt - left.updatedAt)[0];
    }

    setMessages(messages: AgentMessage[]): void {
        this.messages = messages;
        this.notify();
    }

    setStatus(status: string): void {
        this.status = status;
        this.notify();
    }

    setTools(tools: AgentConsoleToolItem[]): void {
        this.tools = tools;
        this.notify();
    }

    setTokenUsage(usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null): void {
        const promptTokens = this.resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']);
        const completionTokens = this.resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']);
        const totalTokens = this.resolveUsageNumber(usage, ['totalTokens', 'total_tokens'])
            ?? (promptTokens != null || completionTokens != null
                ? (promptTokens || 0) + (completionTokens || 0)
                : undefined);

        this.tokenUsage = {
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: totalTokens || 0
        };
        this.notify();
    }

    setInput(value: string): void {
        this.input = value;
        this.notify();
    }

    setLastError(message: string): void {
        this.lastError = message;
        this.notify();
    }

    setTasksCount(value: number): void {
        this.tasksCount = value;
        this.notify();
    }

    setNotice(message: string): void {
        this.notice = message;
        this.notify();
    }

    setTheme(theme?: AgentConsoleThemeInput | null): void {
        this.theme = mergeAgentConsoleTheme(theme);
        this.notify();
    }

    openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): void {
        this.selectMenu = {
            title,
            hint,
            options: options.slice(),
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex))
        };
        this.notify();
    }

    closeSelectMenu(): void {
        this.selectMenu = undefined;
        this.notify();
    }

    setSelectMenuIndex(index: number): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.selectMenu.selectedIndex = Math.max(0, Math.min(this.selectMenu.options.length - 1, index));
        this.notify();
    }

    moveSelectMenu(delta: number): void {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        const next = (this.selectMenu.selectedIndex + delta + this.selectMenu.options.length) % this.selectMenu.options.length;
        this.selectMenu.selectedIndex = next;
        this.notify();
    }

    get selectedSelectMenuOption(): AgentConsoleSelectOption | undefined {
        if (!this.selectMenu) {
            return undefined;
        }
        return this.selectMenu.options[this.selectMenu.selectedIndex];
    }

    async confirmSelectMenu(value?: string): Promise<void> {
        const resolved = value ?? this.selectedSelectMenuOption?.value;
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(resolved);
    }

    async chooseSelectMenuIndex(index: number): Promise<void> {
        if (!this.selectMenu || !this.selectMenu.options.length) {
            return;
        }
        this.setSelectMenuIndex(index);
        await this.confirmSelectMenu(this.selectedSelectMenuOption?.value);
    }

    async cancelSelectMenu(): Promise<void> {
        const action = this.selectMenuAction;
        this.selectMenuAction = undefined;
        this.closeSelectMenu();
        await action?.(undefined);
    }

    setRunningTool(toolName: string): void {
        this.activeToolSet.add(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
        this.notify();
    }

    clearRunningTool(toolName: string): void {
        this.activeToolSet.delete(toolName);
        this.runningTools = Array.from(this.activeToolSet.values()).sort();
        this.notify();
    }

    pushActivity(kind: AgentConsoleActivity['kind'], message: string): void {
        this.activities = [
            ...this.activities.slice(-29),
            {
                id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                kind,
                message,
                createdAt: Date.now()
            }
        ];
        this.notify();
    }

    upsertToolRun(run: AgentConsoleToolRun): void {
        const next = this.toolRuns.filter(item => item.name !== run.name);
        next.unshift(run);
        this.toolRuns = next.slice(0, 8);
        this.notify();
    }

    summarize(value: string): string {
        const text = value.replace(/\s+/g, ' ').trim();
        return text.length > 80 ? `${text.slice(0, 80)}...` : text;
    }

    toToolItem(definition: AgentToolDefinition, active: boolean): AgentConsoleToolItem {
        return {
            name: definition.name,
            toolset: definition.toolset,
            active,
            activationKind: definition.activation?.kind
        };
    }

    protected resolveUsageNumber(usage: any, keys: string[]): number | undefined {
        if (!usage || typeof usage !== 'object') {
            return undefined;
        }
        for (const key of keys) {
            const value = usage[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
        }
        return undefined;
    }
}
