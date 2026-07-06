import { Component } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentScheduler } from '../scheduler/AgentScheduler';
import { ToolRegistry } from '../tools/ToolRegistry';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleSelectOption, AgentConsoleSessionMeta, AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent
} from './AgentConsolePanels';

@Component({
    selector: 'agent-console',
    imports: [
        AgentConsoleStatusPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleActivityPanelComponent
    ],
    template: `
    <div class="agent-console">
        <h1>{{title}}</h1>
        <agent-console-status-panel></agent-console-status-panel>
        <agent-console-select-panel></agent-console-select-panel>
        <agent-console-input-panel></agent-console-input-panel>
        <agent-console-tools-panel></agent-console-tools-panel>
        <agent-console-tool-runs-panel></agent-console-tool-runs-panel>
        <agent-console-messages-panel></agent-console-messages-panel>
        <agent-console-activity-panel></agent-console-activity-panel>
    </div>
    `
})
export class AgentConsoleComponent {
    protected commandActions = new Map<string, () => void | Promise<void>>();

    constructor(
        private state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        private bridge: AgentConsoleEventBridge,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions,
        @Optional() private toolRegistry?: ToolRegistry | null
    ) {
        this.state.title = this.options.ui?.title ?? defaultAgentOptions.ui!.title!;
        this.state.provider = this.options.model?.provider ?? '';
        this.state.model = this.options.model?.model ?? '';
        this.state.submitAction = () => this.submit();
    }

    get title(): string {
        return this.state.title;
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

    showNotice(message: string): void {
        this.state.setNotice(message);
        this.state.notify();
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
            this.state.notify();
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

    subscribe(listener: () => void): () => void {
        return this.state.subscribe(listener);
    }

    async onInit(): Promise<void> {
        this.bridge.subscribe();
        this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        await this.refreshTools();
        this.state.setTasksCount(this.scheduler.getTasks().length);
        this.state.notify();
    }

    async submit(): Promise<void> {
        const value = this.state.input.trim();
        if (!value) {
            return;
        }
        this.state.setStatus('running');
        this.state.pushActivity('turn', `User: ${this.state.summarize(value)}`);
        this.state.notify();

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
            this.state.notify();

            try {
                const stream = (this.runtime as any).runStreamingTurn(this.state.sessionId, value);
                for await (const chunk of stream) {
                    if (chunk.type === 'text' && chunk.content) {
                        assistantMessage.content += chunk.content;
                        this.state.notify();
                    } else if (chunk.type === 'reasoning' && chunk.content) {
                        this.state.setStatus('reasoning');
                        this.state.pushActivity('model', `Reasoning: ${this.state.summarize(chunk.content)}`);
                        this.state.notify();
                    } else if (chunk.type === 'tool_call') {
                        this.state.pushActivity('tool', `Tool call: ${chunk.content || '...'}`);
                        this.state.notify();
                    }
                }
            } finally {
                this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
            }
        } else {
            await this.runtime.runTurn(this.state.sessionId, value);
            this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        }

        await this.refreshTools();
        this.state.setInput('');
        this.state.setStatus('idle');
        this.state.setTasksCount(this.scheduler.getTasks().length);
        this.state.notify();
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
        this.state.notify();
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
}
