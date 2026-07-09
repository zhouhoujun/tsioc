import { Injectable, Optional } from '@tsdi/ioc';
import { ApplicationContext, ApplicationEventMulticaster } from '@tsdi/core';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { ToolRegistry } from '../tools/ToolRegistry';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentErrorEvent,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    AgentTurnCompletedEvent,
    AgentTurnStartedEvent
} from '../runtime/AgentEvents';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

@Injectable()
export class AgentConsoleEventBridge {
    protected eventBindings: Array<{ event: any; handler: (event: any) => void | Promise<void> }> = [];
    protected subscribed = false;
    protected stateRef: AgentConsoleSessionState;

    constructor(
        state: AgentConsoleSessionState,
        private runtime: AgentRuntime,
        @Optional() private toolRegistry?: ToolRegistry | null,
        @Optional() private app?: ApplicationContext | null
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
        const bind = (event: any, handler: (evt: any) => void | Promise<void>) => {
            this.eventBindings.push({ event, handler });
            multicaster.addListener(event, handler as any);
        };

        bind(AgentTurnStartedEvent, (event: AgentTurnStartedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.setStatus('running');
            this.state.pushActivity('turn', 'Turn started');
        });

        bind(AgentStreamChunkEvent, (event: AgentStreamChunkEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            if (event.usage) {
                this.state.setTokenUsage(event.usage);
            }
        });

        bind(AgentTurnCompletedEvent, async (event: AgentTurnCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.setStatus('idle');
            this.state.setMessages(await this.runtime.getMessages(this.state.sessionId));
        });

        bind(AgentToolInvokedEvent, (event: AgentToolInvokedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.setRunningTool(event.toolName);
            this.state.upsertToolRun({
                name: event.toolName,
                status: 'running',
                message: 'Running',
                inputSummary: event.inputSummary || event.receipt?.inputSummary,
                attemptCount: event.receipt?.attemptCount,
                executionMode: event.receipt?.executionMode,
                receiptId: event.receipt?.receiptId,
                toolCallId: event.receipt?.toolCallId,
                updatedAt: Date.now()
            });
            this.state.pushActivity('tool', `Running ${event.toolName}`);
        });

        bind(AgentToolCompletedEvent, async (event: AgentToolCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.clearRunningTool(event.toolName);
            this.state.upsertToolRun({
                name: event.toolName,
                status: 'success',
                durationMs: event.receipt?.durationMs,
                message: event.receipt?.durationMs != null
                    ? `Completed in ${event.receipt.durationMs}ms`
                    : 'Completed',
                inputSummary: event.receipt?.inputSummary,
                outputSummary: event.receipt?.outputSummary,
                attemptCount: event.receipt?.attemptCount,
                executionMode: event.receipt?.executionMode,
                receiptId: event.receipt?.receiptId,
                toolCallId: event.receipt?.toolCallId,
                updatedAt: Date.now()
            });
            this.state.pushActivity('tool', `Completed ${event.toolName}`);
            await this.refreshTools();
        });

        bind(AgentToolFailedEvent, (event: AgentToolFailedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.clearRunningTool(event.toolName);
            this.state.setLastError(event.error.message);
            this.state.upsertToolRun({
                name: event.toolName,
                status: 'error',
                durationMs: event.receipt?.durationMs,
                message: event.error.message,
                inputSummary: event.receipt?.inputSummary,
                outputSummary: event.receipt?.outputSummary,
                error: event.receipt?.error || event.error.message,
                attemptCount: event.receipt?.attemptCount,
                executionMode: event.receipt?.executionMode,
                receiptId: event.receipt?.receiptId,
                toolCallId: event.receipt?.toolCallId,
                updatedAt: Date.now()
            });
            this.state.pushActivity('error', `${event.toolName}: ${event.error.message}`);
        });

        bind(AgentModelCompletedEvent, (event: AgentModelCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            if (event.response.metadata?.provider) {
                this.state.setProvider(String(event.response.metadata.provider));
            }
            if (event.response.metadata?.model) {
                this.state.setModel(String(event.response.metadata.model));
            }
            this.state.setTokenUsage(event.response.metadata?.usage);
            this.state.pushActivity('model', `Model: ${this.state.provider || 'unknown'} / ${this.state.model || 'unknown'}`);
        });

        bind(AgentApprovalRequestedEvent, (event: AgentApprovalRequestedEvent) => {
            if (event.request.sessionId !== this.state.sessionId) return;
            this.state.upsertPendingApproval({
                id: event.request.id,
                toolName: event.request.toolName,
                sessionId: event.request.sessionId,
                reason: event.request.reason,
                summary: event.request.summary,
                hasInput: event.request.hasInput,
                inputSummary: event.request.inputSummary,
                createdAt: Date.now(),
                timeoutMs: event.request.timeoutMs
            });
            this.state.pushActivity('tool', `Approval required for ${event.request.toolName}`);
        });

        bind(AgentApprovalCompletedEvent, (event: AgentApprovalCompletedEvent) => {
            if (event.request.sessionId !== this.state.sessionId) return;
            this.state.removePendingApproval(event.request.id);
            this.state.pushActivity(
                'tool',
                `${event.approved ? 'Approved' : 'Denied'} ${event.request.toolName}`
            );
        });

        bind(AgentApprovalFailedEvent, (event: AgentApprovalFailedEvent) => {
            if (event.request.sessionId !== this.state.sessionId) return;
            this.state.removePendingApproval(event.request.id);
            this.state.setLastError(event.error.message);
            this.state.pushActivity('error', `${event.request.toolName}: ${event.error.message}`);
        });

        bind(AgentErrorEvent, (event: AgentErrorEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.setStatus('error');
            this.state.setLastError(event.error.message);
            this.state.pushActivity('error', event.error.message);
        });

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
