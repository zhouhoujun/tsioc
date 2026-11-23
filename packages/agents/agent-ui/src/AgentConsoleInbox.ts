import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';

export type AgentConsoleInboxKind = 'approval' | 'question' | 'task' | 'coding-task' | 'idle-report' | 'queued';

export interface AgentConsoleInboxItem {
    id: string;
    kind: AgentConsoleInboxKind;
    sessionId: string;
    title: string;
    detail?: string;
    severity: 'info' | 'warn' | 'error';
    /** Raw approval request so the picker can focus the decision surface. */
    approval?: Record<string, any>;
    /** Raw background task for row actions (cancel). */
    task?: Record<string, any>;
}

export interface AgentConsoleInboxInput {
    currentSessionId: string;
    approvals?: Array<Record<string, any>>;
    questions?: Array<Record<string, any>>;
    backgroundTasks?: Array<Record<string, any>>;
    codingTasks?: Array<Record<string, any>>;
    queuedPromptCount?: number;
    /** Clock for the recent idle-report window (tests inject it). */
    now?: number;
}

const KIND_ORDER: Record<AgentConsoleInboxKind, number> = {
    approval: 0,
    question: 1,
    task: 2,
    'coding-task': 3,
    'idle-report': 4,
    queued: 5
};
const SEVERITY_ORDER: Record<string, number> = { error: 0, warn: 1, info: 2 };

function shortId(id: string): string {
    return String(id || '').slice(0, 8);
}

/**
 * Derive the attention queue from existing facts: pending approvals/questions,
 * failed background tasks, failed/blocked coding tasks and queued prompts.
 * Pure projection — no polling and no second source of truth.
 */
export function buildInboxItems(input: AgentConsoleInboxInput): AgentConsoleInboxItem[] {
    const items: AgentConsoleInboxItem[] = [];
    for (const approval of input.approvals || []) {
        const id = String(approval?.id || '');
        if (!id) continue;
        items.push({
            id: `approval:${id}`,
            kind: 'approval',
            sessionId: String(approval?.sessionId || input.currentSessionId),
            title: `${approval?.toolName || 'tool'} · ${shortId(id)}`,
            detail: String(approval?.summary || approval?.reason || approval?.reasonDetail || ''),
            severity: 'warn',
            approval
        });
    }
    for (const question of input.questions || []) {
        const id = String(question?.questionId || '');
        if (!id) continue;
        items.push({
            id: `question:${id}`,
            kind: 'question',
            sessionId: String(question?.sessionId || input.currentSessionId),
            title: String(question?.question || ''),
            detail: String(question?.context || ''),
            severity: question?.severity === 'high' ? 'error' : 'warn'
        });
    }
    const now = Number(input.now) || Date.now();
    const idleWindowMs = 15 * 60 * 1000;
    for (const task of input.backgroundTasks || []) {
        const status = String(task?.status || '').toLowerCase();
        if (status === 'waiting-input' || status === 'blocked') {
            items.push({
                id: `task:${String(task?.id || '')}`,
                kind: 'task',
                sessionId: String(task?.sessionId || input.currentSessionId),
                title: String(task?.goal || ''),
                detail: String(task?.question || task?.error || task?.result?.summary || ''),
                severity: 'warn',
                task
            });
            continue;
        }
        if (status === 'failed') {
            items.push({
                id: `task:${String(task?.id || '')}`,
                kind: 'task',
                sessionId: String(task?.sessionId || input.currentSessionId),
                title: String(task?.goal || ''),
                detail: String(task?.error || ''),
                severity: 'error',
                task
            });
            continue;
        }
        if (status !== 'completed') continue;
        const finishedAt = Number(task?.finishedAt || task?.updatedAt || 0);
        if (!finishedAt || now - finishedAt > idleWindowMs) continue;
        items.push({
            id: `idle-report:${String(task?.id || '')}`,
            kind: 'idle-report',
            sessionId: String(task?.sessionId || input.currentSessionId),
            title: String(task?.goal || ''),
            detail: String(task?.result?.summary || task?.result?.report || task?.result?.output || ''),
            severity: 'info'
        });
    }
    for (const task of input.codingTasks || []) {
        const status = String(task?.status || '').toLowerCase();
        if (status !== 'failed' && status !== 'blocked') continue;
        items.push({
            id: `coding-task:${String(task?.id || '')}`,
            kind: 'coding-task',
            sessionId: String(task?.sessionId || input.currentSessionId),
            title: String(task?.title || task?.instruction || ''),
            detail: String(task?.error || task?.summary || ''),
            severity: status === 'failed' ? 'error' : 'warn'
        });
    }
    const queued = Number(input.queuedPromptCount || 0);
    if (queued > 0) {
        items.push({
            id: `queued:${input.currentSessionId}`,
            kind: 'queued',
            sessionId: input.currentSessionId,
            title: `${queued}`,
            severity: 'info'
        });
    }
    return items.sort((left, right) =>
        (SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity])
        || (KIND_ORDER[left.kind] - KIND_ORDER[right.kind]));
}

export interface AgentConsoleInboxHost {
    translator?: AgentUiTranslator | null;
    state: {
        readonly sessionId: string;
        readonly pendingQuestionQueue: Array<Record<string, any>>;
        readonly queuedPromptCount: number;
        setPendingApprovals(pending: any[]): void;
        setApprovalsFocused(focused: boolean): void;
    };
    sessionService?: {
        listApprovals?(sessionId?: string, context?: any): Promise<Array<Record<string, any>>>;
        listAllBackgroundTasks?(options: { sessionId?: string; delegationRoot?: string }, context?: any): Promise<Array<Record<string, any>>>;
    } | null;
    loadCodingTasks?(): Promise<Array<Record<string, any>>>;
    notify(message: string): void;
    openSession(sessionId?: string): Promise<void> | void;
    select?(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    /** Approve/deny a pending approval without leaving the inbox (cross-session). */
    decideApproval?(requestId: string, decision: 'approve' | 'deny'): Promise<boolean>;
    /** Cancel a background task from its inbox row. */
    cancelTask?(taskId: string): Promise<boolean>;
}

/**
 * `/inbox` — one queue for everything that needs the operator: approvals,
 * questions, failed/blocked work and queued prompts. Enter jumps to the owning
 * session and focuses its decision surface.
 */
export async function runInboxCommandView(host: AgentConsoleInboxHost): Promise<void> {
    const [approvals, backgroundTasks, codingTasks] = await Promise.all([
        host.sessionService?.listApprovals?.().catch(() => []) ?? Promise.resolve([]),
        host.sessionService?.listAllBackgroundTasks?.({}).catch(() => []) ?? Promise.resolve([]),
        host.loadCodingTasks?.().catch(() => []) ?? Promise.resolve([])
    ]);
    const items = buildInboxItems({
        currentSessionId: host.state.sessionId,
        approvals: approvals || [],
        questions: host.state.pendingQuestionQueue || [],
        backgroundTasks: backgroundTasks || [],
        codingTasks: codingTasks || [],
        queuedPromptCount: host.state.queuedPromptCount
    });
    if (!items.length) {
        host.notify(formatAgentUiNotice(host.translator, 'inboxEmpty'));
        return;
    }
    const kindLabel = (kind: AgentConsoleInboxKind): string => {
        const map: Record<AgentConsoleInboxKind, [string, string]> = {
            approval: ['inboxKindApproval', 'approval'],
            question: ['inboxKindQuestion', 'question'],
            task: ['inboxKindTask', 'task'],
            'coding-task': ['inboxKindTask', 'task'],
            'idle-report': ['inboxKindReport', 'report'],
            queued: ['inboxKindQueued', 'queued']
        };
        const [key, fallback] = map[kind];
        return formatAgentUiNotice(host.translator, key);
    };
    const options: AgentConsoleSelectOption[] = items.map(item => ({
        label: `${item.severity === 'error' ? '✗' : item.severity === 'warn' ? '!' : '·'} ${kindLabel(item.kind)} · ${item.title}`,
        value: item.id,
        description: item.detail,
        detail: item.sessionId
    }));
    const title = formatAgentUiNotice(host.translator, 'inboxTitle');
    const hint = formatAgentUiNotice(host.translator, 'inboxHint');
    const picked = host.select
        ? await host.select(title, options, 0, hint)
        : undefined;
    if (!picked) return;
    const item = items.find(entry => entry.id === picked);
    if (!item) return;
    if (item.kind === 'approval') {
        const requestId = String(item.approval?.id || item.id.slice('approval:'.length));
        const action = host.select
            ? await host.select(
                formatAgentUiNotice(host.translator, 'inboxApprovalActionTitle'),
                [
                    { label: formatAgentUiNotice(host.translator, 'inboxApprovalOpen'), value: 'open' },
                    { label: formatAgentUiNotice(host.translator, 'inboxApprovalApprove'), value: 'approve' },
                    { label: formatAgentUiNotice(host.translator, 'inboxApprovalDeny'), value: 'deny' }
                ],
                0,
                formatAgentUiNotice(host.translator, 'inboxApprovalActionHint')
            )
            : 'open';
        if (action === 'approve' || action === 'deny') {
            const applied = await host.decideApproval?.(requestId, action).catch(() => false);
            host.notify(formatAgentUiNotice(host.translator, applied ? 'inboxApprovalApplied' : 'inboxApprovalFailed', {
                decision: formatAgentUiNotice(host.translator, action === 'approve' ? 'approvalDecisionApprove' : 'approvalDecisionDeny'),
                id: requestId.slice(0, 8)
            }));
            return;
        }
        if (!action) {
            return;
        }
    }
    if (item.kind === 'task' && host.select && host.cancelTask) {
        const taskId = String(item.task?.id || '');
        const action = await host.select(
            formatAgentUiNotice(host.translator, 'inboxTaskActionTitle'),
            [
                { label: formatAgentUiNotice(host.translator, 'inboxTaskOpen'), value: 'open' },
                { label: formatAgentUiNotice(host.translator, 'inboxTaskCancel'), value: 'cancel' }
            ],
            0,
            formatAgentUiNotice(host.translator, 'inboxTaskActionHint')
        );
        if (!action) {
            return;
        }
        if (action === 'cancel') {
            const cancelled = taskId ? await host.cancelTask(taskId).catch(() => false) : false;
            host.notify(formatAgentUiNotice(host.translator, cancelled ? 'inboxTaskCancelled' : 'inboxTaskCancelFailed', {
                id: taskId.slice(0, 8)
            }));
            return;
        }
    }
    if (item.sessionId && item.sessionId !== host.state.sessionId) {
        await host.openSession(item.sessionId);
    }
    if (item.kind === 'approval') {
        const sessionApprovals = (approvals || []).filter(approval =>
            String(approval?.sessionId || '') === item.sessionId);
        if (sessionApprovals.length) {
            host.state.setPendingApprovals(sessionApprovals);
        }
        host.state.setApprovalsFocused(true);
    }
}

/** Command-context adapter for `/inbox`. */
export function inboxCommandHost(ctx: CommandHandlerContext): AgentConsoleInboxHost {
    return {
        translator: ctx.translator,
        state: ctx.state as any,
        sessionService: ctx.sessionService as any,
        loadCodingTasks: () => ctx.loadThreadCodingTasks(),
        notify: (message: string) => ctx.notify(message),
        openSession: (sessionId?: string) => ctx.openSession(sessionId),
        select: (title, options, index, hint) => ctx.select(title, options, index, hint),
        decideApproval: (requestId: string, decision: 'approve' | 'deny') => ctx.applyApprovalDecision(decision, requestId),
        cancelTask: async (taskId: string) => {
            const result = await ctx.sessionService?.cancelBackgroundTasks?.([taskId]);
            return !!(result && Array.isArray(result.cancelled) && result.cancelled.includes(taskId));
        }
    };
}
