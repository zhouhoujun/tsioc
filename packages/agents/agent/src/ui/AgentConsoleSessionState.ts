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

export interface AgentConsoleSessionItem {
    id: string;
    current: boolean;
    updatedAt?: number;
    messageCount?: number;
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

export interface AgentConsoleApprovalRequest {
    id: string;
    toolName: string;
    sessionId: string;
    reason: string;
    summary: string;
    hasInput: boolean;
    inputSummary?: string;
    createdAt: number;
    timeoutMs: number;
}

export interface AgentConsoleSessionMeta {
    sessionId?: string;
    provider?: string;
    model?: string;
    modelProfile?: string;
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
    messagesFocused = false;
    selectedMessageId = '';
    messageDetailOpen = false;
    messageDetailScroll = 0;
    messageDetailColumnScroll = 0;
    turnStartedAt = 0;
    workingFrame = '◦';
    status = 'idle';
    provider = '';
    model = '';
    modelProfile = '';
    workspace = '';
    tasksCount = 0;
    sessions: AgentConsoleSessionItem[] = [];
    sessionsFocused = false;
    selectedSessionId = '';
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
    pendingApprovals: AgentConsoleApprovalRequest[] = [];
    submitAction?: () => Promise<void>;
    selectMenuAction?: (value: string | undefined) => void | Promise<void>;
    commandHints = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

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
        if (meta.modelProfile !== undefined) {
            this.modelProfile = meta.modelProfile;
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

    setModelProfile(modelProfile: string): void {
        this.modelProfile = modelProfile;
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
        if (!this.messages.length) {
            this.selectedMessageId = '';
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        } else if (this.selectedMessageId && this.messages.some(item => item.id === this.selectedMessageId)) {
            // Preserve explicit message selection when possible.
        } else {
            this.selectedMessageId = this.messages[this.messages.length - 1].id;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        }
        this.notify();
    }

    setMessagesFocused(focused: boolean): void {
        this.messagesFocused = focused;
        if (focused && !this.selectedMessageId && this.messages.length) {
            this.selectedMessageId = this.messages[this.messages.length - 1].id;
        }
        if (!focused) {
            this.messageDetailOpen = false;
            this.messageDetailScroll = 0;
            this.messageDetailColumnScroll = 0;
        }
        this.notify();
    }

    setSelectedMessageId(messageId: string): void {
        if (!messageId || !this.messages.some(item => item.id === messageId)) {
            return;
        }
        this.selectedMessageId = messageId;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    moveMessageSelection(delta: number): void {
        if (!this.messages.length) {
            return;
        }
        const currentIndex = Math.max(0, this.messages.findIndex(item => item.id === this.selectedMessageId));
        const nextIndex = (currentIndex + delta + this.messages.length) % this.messages.length;
        this.selectedMessageId = this.messages[nextIndex].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    moveMessageSelectionPage(delta: number, pageSize = 6): void {
        if (!this.messages.length) {
            return;
        }
        const currentIndex = Math.max(0, this.messages.findIndex(item => item.id === this.selectedMessageId));
        const nextIndex = Math.max(0, Math.min(this.messages.length - 1, currentIndex + (delta * Math.max(1, pageSize))));
        this.selectedMessageId = this.messages[nextIndex].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    selectFirstMessage(): void {
        if (!this.messages.length) {
            return;
        }
        this.selectedMessageId = this.messages[0].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    selectLastMessage(): void {
        if (!this.messages.length) {
            return;
        }
        this.selectedMessageId = this.messages[this.messages.length - 1].id;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    get selectedMessage(): AgentMessage | undefined {
        return this.messages.find(item => item.id === this.selectedMessageId);
    }

    openMessageDetail(): void {
        if (!this.selectedMessage) {
            return;
        }
        this.messageDetailOpen = true;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    closeMessageDetail(): void {
        if (!this.messageDetailOpen && this.messageDetailScroll === 0) {
            return;
        }
        this.messageDetailOpen = false;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
        this.notify();
    }

    scrollMessageDetail(delta: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        const maxScroll = Math.max(0, lines.length - 6);
        this.messageDetailScroll = Math.max(0, Math.min(maxScroll, this.messageDetailScroll + delta));
        this.notify();
    }

    scrollMessageDetailPage(delta: number, pageSize = 5): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        this.scrollMessageDetail(delta * Math.max(1, pageSize));
    }

    scrollMessageDetailToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const lines = this.messageDetailLines;
        this.messageDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - 6);
        this.notify();
    }

    get messageDetailLines(): string[] {
        if (!this.selectedMessage) {
            return [];
        }
        return String(this.selectedMessage?.content || '')
            .replace(/\r/g, '')
            .split('\n')
            .map(line => this.expandTabs(line));
    }

    get messageDetailMaxColumn(): number {
        return this.messageDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }

    scrollMessageDetailColumns(delta: number): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        const maxScroll = Math.max(0, this.messageDetailMaxColumn - 1);
        this.messageDetailColumnScroll = Math.max(0, Math.min(maxScroll, this.messageDetailColumnScroll + delta));
        this.notify();
    }

    scrollMessageDetailColumnsToEdge(position: 'start' | 'end'): void {
        if (!this.messageDetailOpen || !this.selectedMessage) {
            return;
        }
        this.messageDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, this.messageDetailMaxColumn - 1);
        this.notify();
    }

    setStatus(status: string): void {
        const nextStatus = status || 'idle';
        if (this.status === nextStatus) {
            return;
        }
        if ((nextStatus === 'running' || nextStatus === 'reasoning') && !this.turnStartedAt) {
            this.turnStartedAt = Date.now();
        }
        if (nextStatus === 'idle' || nextStatus === 'error') {
            this.turnStartedAt = 0;
            this.workingFrame = '◦';
        }
        this.status = nextStatus;
        this.notify();
    }

    setWorkingFrame(frame: string): void {
        const next = frame || '◦';
        if (this.workingFrame === next) {
            return;
        }
        this.workingFrame = next;
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

    setSessions(sessions: AgentConsoleSessionItem[]): void {
        this.sessions = sessions.slice();
        if (!this.sessions.length) {
            this.selectedSessionId = '';
        } else if (this.selectedSessionId && this.sessions.some(item => item.id === this.selectedSessionId)) {
            // Preserve explicit selection when the session list refreshes.
        } else {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.notify();
    }

    setSessionsFocused(focused: boolean): void {
        this.sessionsFocused = focused;
        if (focused && !this.selectedSessionId && this.sessions.length) {
            this.selectedSessionId = this.sessions.find(item => item.current)?.id || this.sessions[0].id;
        }
        this.notify();
    }

    setSelectedSessionId(sessionId: string): void {
        if (!sessionId || !this.sessions.some(item => item.id === sessionId)) {
            return;
        }
        this.selectedSessionId = sessionId;
        this.notify();
    }

    moveSessionSelection(delta: number): void {
        if (!this.sessions.length) {
            return;
        }
        const currentIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.selectedSessionId));
        const nextIndex = (currentIndex + delta + this.sessions.length) % this.sessions.length;
        this.selectedSessionId = this.sessions[nextIndex].id;
        this.notify();
    }

    moveSessionSelectionPage(delta: number, pageSize = 5): void {
        if (!this.sessions.length) {
            return;
        }
        const currentIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.selectedSessionId));
        const nextIndex = Math.max(0, Math.min(this.sessions.length - 1, currentIndex + (delta * Math.max(1, pageSize))));
        this.selectedSessionId = this.sessions[nextIndex].id;
        this.notify();
    }

    selectFirstSession(): void {
        if (!this.sessions.length) {
            return;
        }
        this.selectedSessionId = this.sessions[0].id;
        this.notify();
    }

    selectLastSession(): void {
        if (!this.sessions.length) {
            return;
        }
        this.selectedSessionId = this.sessions[this.sessions.length - 1].id;
        this.notify();
    }

    get selectedSession(): AgentConsoleSessionItem | undefined {
        return this.sessions.find(item => item.id === this.selectedSessionId);
    }

    setNotice(message: string): void {
        this.notice = message;
        this.notify();
    }

    setCommandHints(commands: string[]): void {
        this.commandHints = Array.from(new Set(commands.filter(Boolean)));
        this.notify();
    }

    setTheme(theme?: AgentConsoleThemeInput | null): void {
        this.theme = mergeAgentConsoleTheme(theme);
        this.notify();
    }

    setPendingApprovals(requests: AgentConsoleApprovalRequest[]): void {
        this.pendingApprovals = requests
            .slice()
            .sort((left, right) => left.createdAt - right.createdAt);
        this.notify();
    }

    upsertPendingApproval(request: AgentConsoleApprovalRequest): void {
        const next = this.pendingApprovals.filter(item => item.id !== request.id);
        next.push(request);
        this.pendingApprovals = next.sort((left, right) => left.createdAt - right.createdAt);
        this.notify();
    }

    removePendingApproval(requestId: string): void {
        const next = this.pendingApprovals.filter(item => item.id !== requestId);
        if (next.length === this.pendingApprovals.length) {
            return;
        }
        this.pendingApprovals = next;
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

    protected expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
    }
}
