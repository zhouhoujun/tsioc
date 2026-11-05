import {
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
import type { BackgroundTaskManager } from '@tsdi/agent-tools';
import type { TranslatorService } from '@tsdi/i18n';
import type { AgentConsolePendingQuestion, AgentConsolePlanTodoItem, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { resolveTimelineToolCategory } from './AgentConsoleTimelineEventPresenter';
import { presentModelFailure } from './AgentConsoleModelFailurePresenter';
import { formatToolEventRow, resolveAgentToolLabel } from './AgentConsoleStreamHelpers';
import { AgentConsoleLocalEventHelperHost } from './AgentConsoleLocalEventHelperHost';

export interface AgentConsoleLocalEventContext {
    state: AgentConsoleSessionState;
    appRpc?: AgentConsoleAppRpc | null;
    translator?: TranslatorService;
    backgroundTasks?: BackgroundTaskManager | null;
    refreshTools(): Promise<void>;
}

/** Binds runtime-local agent events to the console state projection. */
export class AgentConsoleLocalEventBindings extends AgentConsoleLocalEventHelperHost {
    constructor(private readonly ctx: AgentConsoleLocalEventContext) {
        super();
    }

    get state(): AgentConsoleSessionState { return this.ctx.state; }
    get appRpc(): AgentConsoleAppRpc | null | undefined { return this.ctx.appRpc; }
    get translator(): TranslatorService | undefined { return this.ctx.translator; }
    get backgroundTasks(): BackgroundTaskManager | null | undefined { return this.ctx.backgroundTasks; }
    refreshTools(): Promise<void> { return this.ctx.refreshTools(); }

    bindAll(bind: (event: any, handler: (event: any) => void | Promise<void>) => void): void {
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
                        category: resolveTimelineToolCategory(event.toolName),
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
                        content: this.describeToolTimelineEvent(event.toolName, event.receipt?.inputSummary, event.receipt?.outputSummary),
                        status: 'success',
                        durationMs: event.receipt?.durationMs,
                        toolCallId: event.receipt?.toolCallId,
                        receiptId: event.receipt?.receiptId,
                        attempt: event.receipt?.attemptCount,
                        category: resolveTimelineToolCategory(event.toolName),
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
                    ? (this.translator?.translate('agent.tool.gitMissing') || 'Git repository not detected. If you want version control, ask the agent to initialize one (git init).')
                    : (this.translator?.translate('agent.tool.failedWithError', {
                        label: this.describeToolName(event.toolName),
                        error: event.error.message
                    }) || `${this.describeToolName(event.toolName)} failed: ${event.error.message}`));
                if (!this.appRpc) {
                    this.state.projectThreadItem({
                        kind: 'tool',
                        key: threadItemKey('tool', event.receipt?.toolCallId || event.receipt?.receiptId || event.toolName),
                        sessionId: event.sessionId,
                        content: this.describeToolTimelineEvent(event.toolName, event.receipt?.inputSummary, event.receipt?.outputSummary, event.error.message),
                        status: 'error',
                        durationMs: event.receipt?.durationMs,
                        toolCallId: event.receipt?.toolCallId,
                        receiptId: event.receipt?.receiptId,
                        attempt: event.receipt?.attemptCount,
                        category: resolveTimelineToolCategory(event.toolName),
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
                if (event.cumulativeUsage) {
                    this.state.setTokenUsageAbsolute(event.cumulativeUsage);
                } else {
                    this.state.setTokenUsage(event.response.metadata?.usage);
                }
                this.state.pushActivity('model', `Model: ${this.state.provider || 'unknown'} / ${this.state.model || 'unknown'}`);
        });

        bind(AgentApprovalRequestedEvent, (event: AgentApprovalRequestedEvent) => {
            if (event.request.sessionId !== this.state.sessionId) return;
                this.state.upsertPendingApproval({
                    id: event.request.id,
                    toolName: event.request.toolName,
                    sessionId: event.request.sessionId,
                    reason: event.request.reason,
                    reasonDetail: event.request.reasonDetail,
                    summary: event.request.summary,
                    hasInput: event.request.hasInput,
                    inputSummary: event.request.inputSummary,
                    createdAt: event.request.createdAt ?? Date.now(),
                    timeoutMs: event.request.timeoutMs,
                    expiresAt: event.request.expiresAt ?? Date.now() + event.request.timeoutMs
                });
                this.state.requestApprovalAttention();
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
                const translator = this.translator;
                const translate = translator
                    ? (key: string, params?: Record<string, any>) => translator.translate(key, params)
                    : undefined;
                const message = presentModelFailure(event.error, translate) ?? event.error.message;
                this.state.setStatus('error');
                this.state.setLastError(message);
                this.state.pushActivity('error', message);
                if (!this.appRpc) {
                    this.state.appendUiEventMessage(message, {
                        eventType: 'error',
                        label: 'error',
                        status: 'error'
                    });
                }
                this.state.appendAssistantErrorMessage(message);
                const failure = asModelFailure(event.error);
                if (failure) {
                    void this.state.modelUnavailableAction?.(failure);
                }
        });
    }


}
