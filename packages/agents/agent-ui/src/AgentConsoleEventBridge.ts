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
    threadItemKey
} from '@tsdi/agent';
import { ToolRegistry } from '@tsdi/agent';
import { TranslatorService } from '@tsdi/i18n';
import { AgentConsolePendingQuestion, AgentConsolePlanTodoItem, AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { BackgroundTaskManager } from '@tsdi/agent-tools';

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
        @Optional() private app?: ApplicationContext | null,
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

        bind(AgentTurnStartedEvent, (event: AgentTurnStartedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                this.state.setStatus('running');
                this.state.setPendingQuestion(null);
                this.state.pushActivity('turn', this.translator?.translate('agent.turn.understanding') || 'Understanding the request');
                if (!this.appRpc) {
                    this.state.upsertUiEventMessage(this.state.qualifyUiEventKey('turn-start'), 'Analyzing request', {
                        eventType: 'turn_started',
                        label: 'state',
                        status: 'running'
                    });
                }
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
        });

        bind(AgentTurnCancelledEvent, (event: AgentTurnCancelledEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                this.state.setStatus('cancelled');
                this.state.clearToolActivity();
                this.state.pushActivity('turn', 'Turn cancelled');
                if (!this.appRpc) {
                    this.state.upsertUiEventMessage(this.state.qualifyUiEventKey('turn-cancel'), 'Turn cancelled', {
                        eventType: 'turn_cancelled',
                        label: 'state',
                        status: 'failed'
                    });
                }
        });

        bind(AgentCompensationEvent, (event: AgentCompensationEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            if (event.compensated > 0) {
                this.state.pushActivity(
                    'rollback',
                    `Rolled back ${event.compensated} side-effecting tool call${event.compensated === 1 ? '' : 's'}`
                );
            }
        });

        bind(AgentContextPreparedEvent, (event: AgentContextPreparedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                this.state.setContextPreparation(event.report);
                this.state.pushActivity('model', `Context ${event.report.strategy}: ${event.report.beforeTokens}→${event.report.afterTokens}`);
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
                this.state.pushActivity('tool', this.describeToolActivity(event.toolName, 'running'));
                if (!this.appRpc) {
                    this.state.projectThreadItem({
                        kind: 'tool',
                        key: threadItemKey('tool', event.receipt?.toolCallId || event.receipt?.receiptId || event.toolName),
                        sessionId: event.sessionId,
                        content: this.describeToolTimelineEvent(event.toolName, event.receipt?.inputSummary || event.inputSummary),
                        status: 'running',
                        toolCallId: event.receipt?.toolCallId,
                        receiptId: event.receipt?.receiptId,
                        attempt: event.receipt?.attemptCount,
                        source: 'local'
                    });
                }
        });

        bind(AgentToolCompletedEvent, async (event: AgentToolCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                this.state.clearRunningTool(event.toolName);
                if (event.toolName === 'todo') {
                    const output = event.output && typeof event.output === 'object' ? event.output as any : {};
                    this.state.setPlanTodos(this.normalizePlanTodos(output.todos ?? output), undefined, undefined, undefined, Number(output.revision), String(output.planId || ''));
                }
                if (event.toolName === 'ask_user') {
                    this.state.setPendingQuestion(this.normalizePendingQuestion(event.output));
                }
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
                this.state.pushActivity('tool', this.describeToolActivity(event.toolName, 'completed'));
                if (!this.appRpc) {
                    this.state.projectThreadItem({
                        kind: 'tool',
                        key: threadItemKey('tool', event.receipt?.toolCallId || event.receipt?.receiptId || event.toolName),
                        sessionId: event.sessionId,
                        content: this.describeToolTimelineEvent(event.toolName, event.receipt?.outputSummary),
                        status: 'success',
                        durationMs: event.receipt?.durationMs,
                        toolCallId: event.receipt?.toolCallId,
                        receiptId: event.receipt?.receiptId,
                        attempt: event.receipt?.attemptCount,
                        source: 'local'
                    });
                }
            await this.refreshTools();
        });

        bind(AgentPlanCreatedEvent, (event: AgentPlanCreatedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.mergePlanCreated(
                event.steps as Array<Partial<AgentConsolePlanTodoItem> & { id: string; content: string }>,
                event.planId,
                undefined,
                event.sequence
            );
        });

        bind(AgentPlanStepStartedEvent, (event: AgentPlanStepStartedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.mergePlanStepStatus(event.planId, event.stepId, 'in_progress', {
                sequence: event.sequence,
                owner: event.owner
            });
        });

        bind(AgentPlanStepBlockedEvent, (event: AgentPlanStepBlockedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.mergePlanStepStatus(event.planId, event.stepId, 'pending', {
                sequence: event.sequence,
                reason: event.reason
            });
        });

        bind(AgentPlanStepCompletedEvent, (event: AgentPlanStepCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.mergePlanStepStatus(event.planId, event.stepId, event.status, {
                sequence: event.sequence
            });
        });

        bind(AgentPlanCompletedEvent, (event: AgentPlanCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
            this.state.cancelRemainingPlanSteps(event.planId, event.sequence);
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
                const nonGitRepo = event.toolName === 'git_operations' && /not a Git repository/i.test(event.error.message);
                this.state.pushActivity('error', nonGitRepo
                    ? (this.translator?.translate('agent.tool.gitMissing') || 'Git repository not detected; continuing with files')
                    : (this.translator?.translate('agent.tool.failedWithError', {
                        label: this.describeToolName(event.toolName),
                        error: event.error.message
                    }) || `${this.describeToolName(event.toolName)} failed: ${event.error.message}`));
                if (!this.appRpc) {
                    this.state.projectThreadItem({
                        kind: 'tool',
                        key: threadItemKey('tool', event.receipt?.toolCallId || event.receipt?.receiptId || event.toolName),
                        sessionId: event.sessionId,
                        content: `${event.toolName} failed: ${event.error.message}`,
                        status: 'error',
                        durationMs: event.receipt?.durationMs,
                        toolCallId: event.receipt?.toolCallId,
                        receiptId: event.receipt?.receiptId,
                        attempt: event.receipt?.attemptCount,
                        source: 'local'
                    });
                }
        });

        bind(AgentModelCompletedEvent, (event: AgentModelCompletedEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                if (event.response.metadata?.provider && !this.state.provider) {
                    this.state.setProvider(String(event.response.metadata.provider));
                }
                if (event.response.metadata?.model && !this.state.model) {
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
                    createdAt: event.request.createdAt ?? Date.now(),
                    timeoutMs: event.request.timeoutMs,
                    expiresAt: event.request.expiresAt ?? Date.now() + event.request.timeoutMs
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

        bind(AgentBackgroundTaskStartedEvent, (event: AgentBackgroundTaskStartedEvent) => {
            const task = this.backgroundTasks?.get(event.taskId);
            if (task) this.state.upsertBackgroundTask(task);
            if (event.sessionId !== this.state.sessionId) return;
            this.state.pushActivity('tool', `Background task ${event.taskId} started: ${this.truncateNotification(event.goal)}`);
        });

        bind(AgentBackgroundTaskCompletedEvent, (event: AgentBackgroundTaskCompletedEvent) => {
            const task = this.backgroundTasks?.get(event.taskId);
            if (task) this.state.upsertBackgroundTask(task);
            if (event.sessionId !== this.state.sessionId) return;
            const detail = event.summary ? `: ${this.truncateNotification(event.summary)}` : '';
            this.state.pushActivity('tool', `Background task ${event.taskId} completed${detail}`);
        });

        bind(AgentBackgroundTaskFailedEvent, (event: AgentBackgroundTaskFailedEvent) => {
            const task = this.backgroundTasks?.get(event.taskId);
            if (task) this.state.upsertBackgroundTask(task);
            if (event.sessionId !== this.state.sessionId) return;
            this.state.setLastError(event.error.message);
            this.state.pushActivity('error', `Background task ${event.taskId} failed: ${event.error.message}`);
        });

        bind(AgentErrorEvent, (event: AgentErrorEvent) => {
            if (event.sessionId !== this.state.sessionId) return;
                this.state.setStatus('error');
                this.state.setLastError(event.error.message);
                this.state.pushActivity('error', event.error.message);
                if (!this.appRpc) {
                    this.state.appendUiEventMessage(event.error.message, {
                        eventType: 'error',
                        label: 'error',
                        status: 'error'
                    });
                }
                this.state.appendAssistantErrorMessage(event.error.message);
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

    protected normalizePlanTodos(output: any): Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }> {
        const todos = Array.isArray(output?.todos) ? output.todos : [];
        return todos
            .map((item: any) => ({
                id: String(item?.id || '').trim(),
                content: String(item?.content || '').trim(),
                status: this.normalizeTodoStatus(item?.status)
            }))
            .filter((item: { id: string; content: string }) => !!item.id && !!item.content);
    }

    protected normalizePendingQuestion(output: any): AgentConsolePendingQuestion | null {
        const question = String(output?.question || '').trim();
        if (!question) {
            return null;
        }
        return {
            questionId: this.resolveQuestionId(output, question),
            sessionId: String(output?.sessionId || this.state.sessionId),
            question,
            options: Array.isArray(output?.options) ? output.options.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
            context: typeof output?.context === 'string' && output.context.trim() ? output.context.trim() : undefined,
            severity: ['low', 'medium', 'high'].includes(output?.severity) ? output.severity : 'medium',
            createdAt: Number(output?.createdAt) || Date.now(),
            updatedAt: Number(output?.updatedAt) || Date.now(),
            expiresAt: Number(output?.expiresAt) || undefined,
            status: 'pending'
        };
    }

    protected resolveQuestionId(output: any, question: string): string {
        const explicit = String(output?.questionId || '').trim();
        return explicit || `legacy-question-${String(output?.sessionId || this.state.sessionId)}-${question}`;
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        switch (String(status || '').trim()) {
            case 'in_progress':
            case 'completed':
            case 'cancelled':
                return status as 'in_progress' | 'completed' | 'cancelled';
            default:
                return 'pending';
        }
    }

    protected describeToolTimelineEvent(toolName: string, summary?: string): string {
        const resolvedSummary = this.summarizeToolEventDetail(toolName, summary);
        const label = this.describeToolName(toolName);
        return resolvedSummary ? `${label} · ${resolvedSummary}` : label;
    }

    protected describeToolName(toolName: string): string {
        return this.translator?.translate(`agent.tool.${toolName}`) || toolName.replace(/[._-]+/g, ' ');
    }

    protected describeToolActivity(toolName: string, status: 'running' | 'completed'): string {
        const name = this.describeToolName(toolName);
        return status === 'running'
            ? (this.translator?.translate('agent.tool.invoked', { label: name }) || `Running ${name}`)
            : (this.translator?.translate('agent.tool.completed', { label: name }) || `${name} completed`);
    }

    protected summarizeToolEventDetail(toolName: string, summary?: string): string {
        const text = String(summary || '').trim();
        if (!text || text === '{}' || text === '[]') {
            return '';
        }
        const payload = this.parseToolSummary(text);
        if (!payload) {
            return text;
        }

        const pathSummary = this.pickPathSummary(payload);
        if (pathSummary) {
            if (toolName === 'read_file' && payload.truncated === true) {
                return `${pathSummary} (truncated)`;
            }
            return pathSummary;
        }

        if (toolName === 'location') {
            const label = this.pickString(payload.label)
                || [this.pickString(payload.city), this.pickString(payload.region), this.pickString(payload.countryCode) || this.pickString(payload.country)]
                    .filter(Boolean)
                    .join(', ');
            return label || '';
        }

        if (toolName === 'weather') {
            const location = this.pickString(payload.location) || this.pickString(payload.label);
            const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
            const description = this.pickString(payload.description);
            const unit = payload.units === 'imperial' ? 'F' : 'C';
            return [location, temperature !== undefined ? `${temperature}°${unit}` : '', description].filter(Boolean).join(' ');
        }

        const url = this.pickString(payload.url) || this.pickString(payload.href);
        if (url) {
            return url;
        }

        const location = this.pickString(payload.location) || this.pickString(payload.label) || this.pickString(payload.name);
        if (location) {
            return location;
        }

        return text;
    }

    protected parseToolSummary(text: string): Record<string, any> | undefined {
        try {
            const payload = JSON.parse(text);
            return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : undefined;
        } catch {
            return undefined;
        }
    }

    protected pickPathSummary(payload: Record<string, any>): string {
        const single = this.pickString(payload.path)
            || this.pickString(payload.file)
            || this.pickString(payload.filePath)
            || this.pickString(payload.dir)
            || this.pickString(payload.directory)
            || this.pickString(payload.from)
            || this.pickString(payload.to);
        if (single) {
            return single;
        }
        if (Array.isArray(payload.paths)) {
            const values = payload.paths.map((value: unknown) => this.pickString(value)).filter(Boolean);
            if (values.length) {
                return values.join(', ');
            }
        }
        return '';
    }

    protected pickString(value: unknown): string {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    protected truncateNotification(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > 120 ? `${text.slice(0, 120)}...` : text;
    }

    protected resolveToolEventKey(toolName: string, toolCallId?: string, receiptId?: string): string {
        return toolCallId || receiptId ? `tool:${toolCallId || receiptId}` : `tool:${toolName}`;
    }
}
