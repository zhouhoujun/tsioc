import { Component, ComponentRef } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolRegistry } from '../tools/ToolRegistry';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { mergeAgentConsoleTheme } from './AgentConsoleTheme';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent
} from './AgentConsolePanels';

@Component({
    selector: 'agent-console',
    imports: [
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleActivityPanelComponent
    ],
    template: `
    <div class="agent-console">
        <h1>{{title}}</h1>
        <agent-console-status-panel></agent-console-status-panel>
        <agent-console-messages-panel></agent-console-messages-panel>
        <agent-console-tool-runs-panel></agent-console-tool-runs-panel>
        <agent-console-activity-panel></agent-console-activity-panel>
        <agent-console-tools-panel></agent-console-tools-panel>
        <agent-console-working-panel></agent-console-working-panel>
        <agent-console-input-panel></agent-console-input-panel>
        <agent-console-select-panel></agent-console-select-panel>
    </div>
    `
})
export class AgentConsoleComponent {
    protected commandActions = new Map<string, () => void | Promise<void>>();
    protected unsubscribeState?: () => void;
    protected refreshQueued = false;

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() private componentRef?: ComponentRef<AgentConsoleComponent> | null
    ) {
        this.state.setTitle(this.options.ui?.title ?? defaultAgentOptions.ui!.title!);
        this.state.setProvider(this.options.model?.provider ?? '');
        this.state.setModel(this.options.model?.model ?? '');
        this.state.setTheme(mergeAgentConsoleTheme(this.options.ui?.theme));
    }

    get title(): string {
        return this.state.title;
    }

    get theme() {
        return this.state.theme;
    }

    get sessionState(): AgentConsoleSessionState {
        return this.state;
    }

    get sessionId(): string {
        return this.state.sessionId;
    }

    get input(): string {
        return this.state.input;
    }

    set input(value: string) {
        this.state.setInput(value);
    }

    get messages(): AgentMessage[] {
        return this.state.messages;
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    get tools() {
        return this.state.tools;
    }

    get activities() {
        return this.state.activities;
    }

    get runningTools(): string[] {
        return this.state.runningTools;
    }

    get toolRuns() {
        return this.state.toolRuns;
    }

    get highlightedToolRun() {
        return this.state.highlightedToolRun;
    }

    get tokenUsage() {
        return this.state.tokenUsage;
    }

    get lastError(): string {
        return this.state.lastError;
    }

    get notice(): string {
        return this.state.notice;
    }

    get selectMenu() {
        return this.state.selectMenu;
    }

    get commandHints(): string[] {
        return this.state.commandHints;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get submitActionHandler(): () => Promise<void> {
        return async () => {
            await this.submit();
        };
    }

    get selectActionHandler(): (value: string) => Promise<void> {
        return async (value: string) => {
            await this.state.confirmSelectMenu(value);
        };
    }

    showNotice(message: string): void {
        this.state.setNotice(message);
    }

    clearNotice(): void {
        this.showNotice('');
    }

    async select(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            const resolveSelection = async (value: string | undefined) => {
                resolve(value);
            };
            this.state.openSelectMenu(title, options, selectedIndex, hint);
            this.state.selectMenuAction = resolveSelection;
        });
    }

    setCommandAction(command: string, action: () => void | Promise<void>): this {
        this.commandActions.set(command, action);
        return this;
    }

    clearCommandAction(command: string): this {
        this.commandActions.delete(command);
        return this;
    }

    async runCommand(command: string): Promise<boolean> {
        const action = this.commandActions.get(command);
        if (!action) {
            return false;
        }
        await action();
        return true;
    }

    configure(meta: AgentConsoleSessionMeta): this {
        this.state.configure(meta);
        return this;
    }

    async onInit(): Promise<void> {
        this.state.submitAction = this.submitActionHandler;
        this.bridge.bindState(this.sessionState);
        this.bridge.subscribe();
        this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        await this.refreshTools();
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    onAfterViewInit(): void {
        this.unsubscribeState = this.state.subscribe(() => {
            this.queuePanelRefresh();
        });
    }

    onDestroy(): void {
        this.unsubscribeState?.();
        this.unsubscribeState = undefined;
    }

    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) {
            return;
        }
        this.state.setStatus('running');
        this.state.setLastError('');
        this.state.pushActivity('turn', `User: ${this.state.summarize(value)}`);

        try {
            if (typeof (this.runtime as any).runStreamingTurn === 'function') {
                const userMessage: AgentMessage = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: value,
                    createdAt: Date.now()
                };
                const assistantMessage: AgentMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: '',
                    createdAt: Date.now()
                };
                this.state.setMessages([...this.state.messages, userMessage, assistantMessage]);

                try {
                    const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, value);
                    for await (const chunk of stream) {
                        if (chunk.type === 'text' && chunk.content) {
                            assistantMessage.content += chunk.content;
                            this.state.setMessages([
                                ...this.state.messages.slice(0, -1),
                                { ...assistantMessage }
                            ]);
                        } else if (chunk.type === 'reasoning' && chunk.content) {
                            this.state.setStatus('reasoning');
                            this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                        } else if (chunk.type === 'tool_call') {
                            this.state.pushActivity('tool', `Tool call: ${chunk.content || '...'}`);
                        } else if (chunk.type === 'done' && chunk.usage) {
                            this.state.setTokenUsage(chunk.usage);
                        }
                    }
                } finally {
                    this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
                }
            } else {
                await this.runtime.runTurn(this.state.sessionId, value);
                this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
            }
        } catch (error: any) {
            const message = error?.message || String(error || 'Unknown error');
            this.state.setStatus('error');
            this.state.setLastError(message);
            this.state.pushActivity('error', message);
        }

        await this.refreshTools();
        this.state.setInput('');
        if (this.state.status === 'running' || this.state.status === 'reasoning') {
            this.state.setStatus('idle');
        }
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.state.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
        this.state.setTasksCount(this.scheduler.getTasks().length);
    }

    dispose(): void {
        this.commandActions.clear();
        this.bridge.dispose();
    }

    protected async refreshTools(): Promise<void> {
        if (!this.toolRegistry) {
            this.state.setTools([]);
            return;
        }
        const definitions = this.toolRegistry.getToolDefinitions(this.state.sessionId);
        const tools = await Promise.all(definitions.map(async def => {
            const active = this.toolRegistry && typeof this.toolRegistry.isToolActive === 'function'
                ? await this.toolRegistry.isToolActive(this.state.sessionId, def.name)
                : def.activation?.activated ?? true;
            return this.state.toToolItem(def, active);
        }));
        tools.sort((a, b) => a.name.localeCompare(b.name));
        this.state.setTools(tools);
    }

    protected queuePanelRefresh(): void {
        if (this.refreshQueued) {
            return;
        }
        this.refreshQueued = true;
        Promise.resolve().then(async () => {
            this.refreshQueued = false;
            await this.refreshPanels();
        });
    }

    protected async refreshPanels(): Promise<void> {
        const hostView = this.componentRef?.hostView;
        if (!hostView) {
            return;
        }
        const refs = [
            hostView.query(AgentConsoleStatusPanelComponent),
            hostView.query(AgentConsoleMessagesPanelComponent),
            hostView.query(AgentConsoleToolRunsPanelComponent),
            hostView.query(AgentConsoleActivityPanelComponent),
            hostView.query(AgentConsoleToolsPanelComponent),
            hostView.query(AgentConsoleWorkingPanelComponent),
            hostView.query(AgentConsoleInputPanelComponent),
            hostView.query(AgentConsoleSelectPanelComponent)
        ].filter(Boolean) as Array<ComponentRef<any>>;

        for (const ref of refs) {
            await ref.render();
        }
    }
}
