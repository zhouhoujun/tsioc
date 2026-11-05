import { threadItemKey } from '@tsdi/agent';
import type { AgentConsolePendingQuestion, AgentConsoleSessionState, AgentConsoleToolRun } from './AgentConsoleSessionState';
import { formatTimelineEventLine, presentTimelineToolEvent, resolveTimelineToolCategory } from './AgentConsoleTimelineEventPresenter';
import type { RemoteAgentConsoleEvent } from './AgentConsoleRemoteEventProtocol';

export function applyRemoteEvent(state: AgentConsoleSessionState, event: RemoteAgentConsoleEvent): void {
    const data = event.data && typeof event.data === 'object' ? event.data : {};
    if (data.cumulativeUsage) {
        state.setTokenUsageAbsolute(data.cumulativeUsage);
    } else {
        state.setTokenUsage(data);
    }
    switch (event.type) {
        case 'turn_started':
            state.setStatus('running');
            state.setPendingQuestion(null);
            state.pushActivity('turn', 'Understanding the request');
            break;
        case 'stream_chunk':
            break;
        case 'turn_completed':
            state.setStatus('idle');
            break;
        case 'turn_cancelled':
            state.setStatus('cancelled');
            state.clearToolActivity();
            state.pushActivity('turn', 'Turn cancelled');
            break;
        case 'compensation':
            if (Number(data.compensated || 0) > 0) {
                state.pushActivity('rollback', `Rolled back ${data.compensated} side-effecting tool call${data.compensated === 1 ? '' : 's'}`);
            }
            break;
        case 'context_prepared':
            state.setContextPreparation(data.report ?? null);
            state.pushActivity('model', `Context ${data.report?.strategy || 'prepared'}: ${data.report?.beforeTokens ?? '?'}→${data.report?.afterTokens ?? '?'}`);
            break;
        case 'tool_invoked':
            state.setRunningTool(String(data.toolName || ''));
            state.upsertToolRun(buildToolRun('running', data, {
                message: 'Running',
                inputSummary: data.inputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('tool', describeToolInvoked(String(data.toolName || '')));
            projectRemoteToolTimeline(state, data, 'tool_invoked', 'running', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || ''),
                eventType: 'tool_invoked',
                inputSummary: String(data.inputSummary || data.receipt?.inputSummary || ''),
                status: 'running'
            })));
            break;
        case 'tool_completed':
            state.clearRunningTool(String(data.toolName || ''));
            if (data.toolName === 'todo' && data.output?.todos) {
                state.setPlanTodos(normalizePlanTodos(data.output.todos), undefined, undefined, undefined, Number(data.output.revision), String(data.output.planId || ''));
            }
            if (data.toolName === 'ask_user' && data.output?.kind === 'ask_user') {
                state.setPendingQuestion(normalizePendingQuestion(data.output));
            }
            state.upsertToolRun(buildToolRun('success', data, {
                durationMs: data.receipt?.durationMs,
                message: data.receipt?.durationMs != null
                    ? `Completed in ${data.receipt.durationMs}ms`
                    : 'Completed',
                inputSummary: data.receipt?.inputSummary,
                outputSummary: data.receipt?.outputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('tool', describeToolCompleted(String(data.toolName || '')));
            projectRemoteToolTimeline(state, data, 'tool_completed', 'success', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || ''),
                eventType: 'tool_completed',
                inputSummary: String(data.receipt?.inputSummary || data.inputSummary || ''),
                outputSummary: String(data.receipt?.outputSummary || ''),
                status: 'success'
            })));
            break;
        case 'tool_failed':
            state.clearRunningTool(String(data.toolName || ''));
            state.setLastError(String(data.error || ''));
            state.upsertToolRun(buildToolRun('error', data, {
                message: String(data.error || ''),
                error: data.receipt?.error || String(data.error || ''),
                inputSummary: data.receipt?.inputSummary,
                outputSummary: data.receipt?.outputSummary,
                updatedAt: Date.now()
            }));
            state.pushActivity('error', `${data.toolName || 'tool'} failed: ${data.error || 'unknown error'}`);
            projectRemoteToolTimeline(state, data, 'tool_failed', 'error', formatTimelineEventLine(presentTimelineToolEvent({
                toolName: String(data.toolName || 'tool'),
                eventType: 'tool_failed',
                inputSummary: String(data.receipt?.inputSummary || data.inputSummary || ''),
                outputSummary: String(data.receipt?.outputSummary || ''),
                error: String(data.error || ''),
                status: 'error'
            })));
            break;
        case 'approval_requested': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            const timeoutMs = Number(request.timeoutMs || 0);
            state.upsertPendingApproval({
                id: String(request.id || ''),
                toolName: String(request.toolName || ''),
                sessionId: String(request.sessionId || event.sessionId || ''),
                reason: String(request.reason || ''), reasonDetail: request.reasonDetail && typeof request.reasonDetail === 'object' ? request.reasonDetail : undefined,
                summary: String(request.summary || ''),
                hasInput: request.hasInput === true,
                inputSummary: request.inputSummary,
                createdAt: Number(request.createdAt || Date.now()),
                timeoutMs: timeoutMs > 0 ? timeoutMs : 0,
                expiresAt: timeoutMs > 0 ? Date.now() + timeoutMs : 0
            });
            state.requestApprovalAttention();
            state.pushActivity('tool', `Approval required for ${request.toolName || 'tool'}`);
            break;
        }
        case 'approval_completed': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            state.removePendingApproval(String(request.id || ''));
            state.pushActivity('tool', `${data.approved === true ? 'Approved' : 'Denied'} ${request.toolName || 'tool'}`);
            break;
        }
        case 'approval_failed': {
            const request = data.request && typeof data.request === 'object' ? data.request : {};
            state.removePendingApproval(String(request.id || ''));
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', `${request.toolName || 'tool'}: ${data.error || 'approval failed'}`);
            break;
        }
        case 'background_task_started':
            state.pushActivity('tool', `Background task ${data.taskId || '?'} started: ${truncateText(String(data.goal || ''))}`);
            break;
        case 'background_task_completed':
            state.pushActivity('tool', `Background task ${data.taskId || '?'} completed${data.summary ? `: ${truncateText(String(data.summary))}` : ''}`);
            break;
        case 'background_task_failed':
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', `Background task ${data.taskId || '?'} failed: ${data.error || 'unknown error'}`);
            break;
        case 'plan_created': {
            const steps = Array.isArray(data.steps) ? data.steps : [];
            const normalized = normalizePlanTodos(steps);
            const seq = Number(data.sequence) || 0;
            state.setPlanTodos(normalized, undefined, undefined, seq, Number(data.revision) || undefined, String(data.planId || ''));
            state.pushActivity('plan', `Plan created: ${normalized.length} step${normalized.length === 1 ? '' : 's'}`);
            projectRemotePlanTimeline(state, data, 'plan_created', 'success', `Plan created (${normalized.length} steps)`);
            break;
        }
        case 'plan_step_started': {
            const stepId = String(data.stepId || '');
            const owner = data.owner ? ` → ${data.owner}` : '';
            state.pushActivity('plan', `Step started: ${stepId}${owner}`);
            projectRemotePlanTimeline(state, data, 'plan_step_started', 'running', `Step started: ${stepId}`);
            break;
        }
        case 'plan_step_blocked': {
            const blockedId = String(data.stepId || '');
            const reason = String(data.reason || 'dependencies not met');
            state.pushActivity('plan', `Step blocked: ${blockedId} (${reason})`);
            projectRemotePlanTimeline(state, data, 'plan_step_blocked', 'running', `Step blocked: ${blockedId} (${reason})`);
            break;
        }
        case 'plan_step_completed': {
            const completedId = String(data.stepId || '');
            const stepStatus = String(data.status || 'completed');
            state.pushActivity('plan', `Step ${stepStatus}: ${completedId}`);
            projectRemotePlanTimeline(state, data, 'plan_step_completed', stepStatus === 'failed' ? 'error' : 'success', `Step ${stepStatus}: ${completedId}`);
            break;
        }
        case 'plan_completed': {
            const summary = data.summary && typeof data.summary === 'object' ? data.summary : {};
            state.pushActivity('plan', `Plan completed: ${summary.completed ?? '?'} done, ${summary.failed ?? 0} failed`);
            projectRemotePlanTimeline(state, data, 'plan_completed', 'success', 'Plan completed');
            break;
        }
        case 'error':
            state.setStatus('error');
            state.setLastError(String(data.error || ''));
            state.pushActivity('error', String(data.error || ''));
            state.appendAssistantErrorMessage(String(data.error || ''));
            break;
        default:
            break;
    }
}

function buildToolRun(
    status: AgentConsoleToolRun['status'],
    data: any,
    extra: Partial<AgentConsoleToolRun>
): AgentConsoleToolRun {
    return {
        name: String(data.toolName || ''),
        status,
        message: String(extra.message || ''),
        inputSummary: extra.inputSummary,
        outputSummary: extra.outputSummary,
        error: extra.error,
        durationMs: extra.durationMs,
        attemptCount: data.receipt?.attemptCount,
        executionMode: data.receipt?.executionMode,
        receiptId: data.receipt?.receiptId,
        toolCallId: data.receipt?.toolCallId,
        updatedAt: Number(extra.updatedAt || Date.now())
    };
}

function normalizePlanTodos(todos: any): Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }> {
    return (Array.isArray(todos) ? todos : [])
        .map((item: any) => ({
            id: String(item?.id || '').trim(),
            content: String(item?.content || '').trim(),
            status: normalizeTodoStatus(item?.status)
        }))
        .filter(item => !!item.id && !!item.content);
}

function normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    switch (String(status || '').trim()) {
        case 'in_progress':
        case 'completed':
        case 'cancelled':
            return status as 'pending' | 'in_progress' | 'completed' | 'cancelled';
        default:
            return 'pending';
    }
}

export function normalizePendingQuestion(output: any): AgentConsolePendingQuestion | null {
    const question = String(output?.question || '').trim();
    if (!question) {
        return null;
    }
    return {
        questionId: String(output?.questionId || '').trim() || `legacy-question-${String(output?.sessionId || '')}-${question}`,
        sessionId: String(output?.sessionId || '').trim() || undefined as any,
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

function describeToolInvoked(toolName: string): string {
    return `Running ${toolName.replace(/[._-]+/g, ' ')}`;
}

function describeToolCompleted(toolName: string): string {
    return `${toolName.replace(/[._-]+/g, ' ')} completed`;
}

function projectRemoteToolTimeline(
    state: AgentConsoleSessionState,
    data: any,
    eventType: string,
    status: 'running' | 'success' | 'error',
    content: string
): void {
    const toolName = String(data?.toolName || '').trim() || 'tool';
    const toolCallId = String(data?.toolCallId || data?.receipt?.toolCallId || '').trim();
    const receiptId = String(data?.receiptId || data?.receipt?.receiptId || '').trim();
    state.projectThreadItem({
        kind: 'tool',
        key: threadItemKey('tool', toolCallId || receiptId || toolName),
        sessionId: state.sessionId,
        content,
        status,
        toolCallId: toolCallId || undefined,
        receiptId: receiptId || undefined,
        attempt: Number(data?.receipt?.attemptCount) || undefined,
        source: 'remote',
        sequence: Number(data?.sequence) || undefined,
        durationMs: Number(data?.durationMs ?? data?.receipt?.durationMs) || undefined,
        category: toolName === 'tool' ? undefined : resolveTimelineToolCategory(toolName)
    });
}

function projectRemotePlanTimeline(
    state: AgentConsoleSessionState,
    data: any,
    eventType: string,
    status: 'running' | 'success' | 'error',
    content: string
): void {
    const planId = String(data?.planId || '').trim() || 'plan';
    const stepId = String(data?.stepId || '').trim();
    state.projectThreadItem({
        kind: 'plan',
        key: threadItemKey('plan', `${planId}${stepId ? `:${stepId}` : ''}`),
        sessionId: state.sessionId,
        content,
        status,
        source: 'remote',
        sequence: Number(data?.sequence) || undefined
    });
}

function truncateText(value: string): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}
