import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, ApplicationEventMulticaster } from '@tsdi/core';
import {
    AGENT_CONSOLE_APP_RPC,
    AgentRuntime,
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentBackgroundTaskCompletedEvent,
    AgentBackgroundTaskFailedEvent,
    AgentBackgroundTaskStartedEvent,
    AgentCompensationEvent,
    AgentContextPreparedEvent,
    AgentConsoleAppRpc,
    AgentErrorEvent,
    AgentModelCompletedEvent,
    AgentPlanCompletedEvent,
    AgentPlanCreatedEvent,
    AgentPlanStepBlockedEvent,
    AgentPlanStepCompletedEvent,
    AgentPlanStepStartedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    AgentTurnCancelledEvent,
    AgentTurnCompletedEvent,
    AgentTurnStartedEvent,
    threadItemKey,
    asModelFailure
} from '@tsdi/agent';
import { ToolRegistry } from '@tsdi/agent';
import { TranslatorService } from '@tsdi/i18n';
import { AgentConsolePendingQuestion, AgentConsolePlanTodoItem, AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { BackgroundTaskManager } from '@tsdi/agent-tools';
import { resolveTimelineToolCategory } from './AgentConsoleTimelineEventPresenter';
import { presentModelFailure } from './AgentConsoleModelFailurePresenter';
import { formatToolEventRow, resolveAgentToolLabel } from './AgentConsoleStreamHelpers';
import { AgentConsoleLocalEventBindings } from './AgentConsoleLocalEventBindings';

@Injectable()
export class AgentConsoleEventBridge {
    protected eventBindings: Array<{ event: any; handler: (event: any) => void | Promise<void> }> = [];
    protected subscribed = false;
    protected stateRef: AgentConsoleSessionState;

    constructor(
        state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() @Inject(ApplicationContext) private app?: ApplicationContext | null,
        @Optional() private translator?: TranslatorService,
        @Optional() private backgroundTasks?: BackgroundTaskManager | null
    ) {
        this.stateRef = state;
    }

    get state(): AgentConsoleSessionState {
        return this.stateRef;
    }

    bindState(state: AgentConsoleSessionState): this {
        this.stateRef = state;
        return this;
    }

    subscribe(): void {
        if (this.subscribed || !this.app) {
            return;
        }
        const multicaster = this.app.eventMulticaster as ApplicationEventMulticaster;
        if (this.backgroundTasks) {
            const manager = this.backgroundTasks as BackgroundTaskManager & { listAll?: () => any[]; subscribe?: (listener: (record: any) => void) => () => void };
            const initial = typeof manager.listAll === 'function' ? manager.listAll() : manager.list(this.state.sessionId);
            this.state.setBackgroundTaskFeed(initial);
            if (typeof manager.subscribe === 'function') {
                manager.subscribe(record => this.state.upsertBackgroundTask(record));
            }
        }
        const bind = (event: any, handler: (evt: any) => void | Promise<void>) => {
            this.eventBindings.push({ event, handler });
            multicaster.addListener(event, handler as any);
        };

        new AgentConsoleLocalEventBindings({
            getState: () => this.state,
            appRpc: this.appRpc,
            translator: this.translator,
            backgroundTasks: this.backgroundTasks,
            refreshTools: () => this.refreshTools()
        }).bindAll(bind);

        this.subscribed = true;
    }

    dispose(): void {
        if (!this.subscribed || !this.app) {
            return;
        }
        const multicaster = this.app.eventMulticaster as ApplicationEventMulticaster;
        this.eventBindings.forEach(binding => multicaster.removeListener(binding.event, binding.handler as any));
        this.eventBindings = [];
        this.subscribed = false;
    }

    protected async refreshTools(): Promise<void> {
        if (this.appRpc) {
            const definitions = await this.appRpc.request('tools.list', { sessionId: this.state.sessionId });
            const tools = Array.isArray(definitions)
                ? definitions.map((def: any) => this.state.toToolItem(def, def?.activation?.activated ?? true))
                : [];
            tools.sort((a, b) => a.name.localeCompare(b.name));
            this.state.setTools(tools);
            return;
        }
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
