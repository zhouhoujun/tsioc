import type { AgentMessage } from '@tsdi/agent';
import type {
    AgentConsoleGoalSummary,
    AgentConsolePlanTodoItem,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';
import { DEFAULT_TIMELINE_LABELS } from './AgentConsoleTimelineWindow';

/** Plan-todo projection, filtering, selection and inline plan message. */
export function setGoalSummary(state: AgentConsoleSessionState, goal: AgentConsoleGoalSummary | null | undefined): void {
    state.goalSummary = goal ? {
        id: String(goal.id || ''),
        title: String(goal.title || ''),
        successCriteria: Array.isArray(goal.successCriteria) ? goal.successCriteria.map(String) : [],
        status: goal.status
    } : null;
    state.planMessage = buildPlanMessage(state);
}

export function resolveGoalCriteriaProgress(state: AgentConsoleSessionState): { met: number; total: number } | null {
    const criteria = state.goalSummary?.successCriteria || [];
    if (!criteria.length) return null;
    const planText = state.planTodos.map(item => item.content).join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
    const met = criteria.filter(item => planText.includes(String(item).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())).length;
    return { met, total: criteria.length };
}

export function buildPlanMessage(state: AgentConsoleSessionState): AgentMessage | null {
    if (!state.planTodos.length) {
        return null;
    }
    const total = state.planTodos.length;
    const labels = { ...DEFAULT_TIMELINE_LABELS, ...(state.consoleOptions.timelineLabels || {}) };
    const goalProgress = state.goalCriteriaProgress;
    const goalLine = goalProgress
        ? state.translateLabel('agent.timeline.goalProgress', { met: goalProgress.met, total: goalProgress.total }, `goal: ${goalProgress.met}/${goalProgress.total} criteria met`)
        : '';
    const collapsible = total > 10;
    const filtered = state.filteredPlanTodos;
    const filterLabel = state.planTodoFilter !== 'all' ? ` [${state.planTodoFilter}]` : '';
    const title = labels.todosTitle || '# Todos';
    // opencode's TodoItem list: marker + content, no numbering or progress bar.
    const items = filtered.map((item, index) => {
        const selected = state.selectedPlanTodoIndex === index ? '› ' : '';
        const hierarchy = item.parentId ? '  ' : '';
        const glyph = item.blockedBy?.length ? '[!]' : planTodoGlyph(item.status);
        const blocked = item.blockedBy?.length ? ` ← blocked by ${item.blockedBy.join(',')}` : '';
        const depends = item.dependsOn?.length ? ` needs ${item.dependsOn.join(',')}` : '';
        const owner = item.owner ? ` (${item.owner})` : '';
        const estimate = item.estimate ? ` ~${item.estimate}` : '';
        const elapsed = item.elapsedMs ? ` ${formatElapsed(item.elapsedMs)}` : '';
        const error = item.status === 'failed' && item.error ? ` err: ${item.error}` : '';
        const evidence = item.evidenceIds?.length ? ` evidence[${item.evidenceIds.length}]` : '';
        return `${selected}${hierarchy}${glyph} ${item.content}${owner}${estimate}${elapsed}${depends}${blocked}${evidence}${error}`;
    });
    const visibleContent = collapsible && !state.planTodoExpanded && state.planTodoFilter === 'all'
        ? `${title} · ${total}`
        : `${title}${filterLabel}${items.length ? `\n${items.join('\n')}` : ''}`;
    const detailLine = state.selectedPlanTodoDetailLabel;
    return {
        id: '__plan_todo_inline__',
        role: 'assistant',
        content: [visibleContent, goalLine, detailLine].filter(Boolean).join('\n'),
        createdAt: Date.now(),
        metadata: {
            uiKind: 'plan-todo',
            planItems: state.planTodos,
            planTodoSourceSessionId: state.planTodoSourceSessionId,
            planScope: state.planScope,
            planCollapsed: collapsible && !state.planTodoExpanded,
            planTodoExpanded: state.planTodoExpanded,
            planTodoFilter: state.planTodoFilter,
            selectedPlanTodoIndex: state.selectedPlanTodoIndex,
            planId: state.planId,
            planRevision: state.planRevision,
            planThreadKey: state.planThreadKey,
            // Only an active turn may render the plan as running; a plan
            // restored after a restart is paused, not running.
            planLive: state.status === 'running' || state.status === 'reasoning'
        }
    };
}

export function formatElapsed(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m${seconds}s`;
}

export function togglePlanTodoExpanded(state: AgentConsoleSessionState): boolean {
    if (state.planTodos.length <= 10) {
        return false;
    }
    state.planTodoExpanded = !state.planTodoExpanded;
    state.planMessage = state.buildPlanMessage();
    return true;
}

export function planTodoGlyph(status: AgentConsolePlanTodoItem['status']): string {
    switch (status) {
        case 'completed':
            return '[✓]';
        case 'cancelled':
            return '[-]';
        case 'in_progress':
            return '[•]';
        case 'failed':
            return '[✗]';
        default:
            return '[ ]';
    }
}

export function hasActivePlanTodos(state: AgentConsoleSessionState): boolean {
    return state.planTodos.some(item => item.status === 'pending' || item.status === 'in_progress');
}

export function clearPlanTodos(state: AgentConsoleSessionState): void {
    if (!state.planTodos.length && !state.planScope) {
        return;
    }
    state.planTodos = [];
    state.planTodoExpanded = false;
    state.planTodoFilter = 'all';
    state.selectedPlanTodoIndex = -1;
    state.goalSummary = null;
    state.planTodoSourceSessionId = '';
    state.planScope = '';
    state.planMessage = null;
}

export function resolveFilteredPlanTodos(state: AgentConsoleSessionState): AgentConsolePlanTodoItem[] {
    if (state.planTodoFilter === 'all') {
        return state.planTodos;
    }
    switch (state.planTodoFilter) {
        case 'active':
            return state.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress');
        case 'blocked':
            return state.planTodos.filter(item => (item.blockedBy && item.blockedBy.length > 0) || item.status === 'pending');
        case 'failed':
            return state.planTodos.filter(item => item.status === 'failed' || item.status === 'cancelled');
        default:
            return state.planTodos;
    }
}

export function resolveSelectedPlanTodo(state: AgentConsoleSessionState): AgentConsolePlanTodoItem | null {
    const filtered = state.filteredPlanTodos;
    if (state.selectedPlanTodoIndex < 0 || state.selectedPlanTodoIndex >= filtered.length) {
        return null;
    }
    return filtered[state.selectedPlanTodoIndex];
}

export function resolvePlanTodoFilterLabel(state: AgentConsoleSessionState): string {
    switch (state.planTodoFilter) {
        case 'active': return 'active';
        case 'blocked': return 'blocked';
        case 'failed': return 'failed';
        default: return 'all';
    }
}

export function setPlanTodoFilter(state: AgentConsoleSessionState, filter: 'all' | 'active' | 'blocked' | 'failed'): void {
    state.planTodoFilter = filter;
    state.selectedPlanTodoIndex = -1;
    state.planMessage = state.buildPlanMessage();
}

export function movePlanTodoSelection(state: AgentConsoleSessionState, direction: -1 | 1): boolean {
    const filtered = state.filteredPlanTodos;
    if (!filtered.length) {
        state.selectedPlanTodoIndex = -1;
        return false;
    }
    if (state.selectedPlanTodoIndex < 0) {
        state.selectedPlanTodoIndex = direction > 0 ? 0 : filtered.length - 1;
    } else {
        state.selectedPlanTodoIndex = Math.max(0, Math.min(filtered.length - 1, state.selectedPlanTodoIndex + direction));
    }
    return true;
}

export function jumpToNextBlockedPlanTodo(state: AgentConsoleSessionState): boolean {
    const filtered = state.filteredPlanTodos;
    if (!filtered.length) return false;
    const start = state.selectedPlanTodoIndex < 0 ? 0 : state.selectedPlanTodoIndex + 1;
    for (let index = start; index < filtered.length; index++) {
        if (filtered[index].blockedBy && filtered[index].blockedBy!.length > 0) {
            state.selectedPlanTodoIndex = index;
            return true;
        }
    }
    for (let index = 0; index < start; index++) {
        if (filtered[index].blockedBy && filtered[index].blockedBy!.length > 0) {
            state.selectedPlanTodoIndex = index;
            return true;
        }
    }
    return false;
}

export function jumpToNextFailedPlanTodo(state: AgentConsoleSessionState): boolean {
    const filtered = state.filteredPlanTodos;
    if (!filtered.length) return false;
    const start = state.selectedPlanTodoIndex < 0 ? 0 : state.selectedPlanTodoIndex + 1;
    for (let index = start; index < filtered.length; index++) {
        if (filtered[index].status === 'failed' || filtered[index].status === 'cancelled') {
            state.selectedPlanTodoIndex = index;
            return true;
        }
    }
    for (let index = 0; index < start; index++) {
        if (filtered[index].status === 'failed' || filtered[index].status === 'cancelled') {
            state.selectedPlanTodoIndex = index;
            return true;
        }
    }
    return false;
}

export function resolveSelectedPlanTodoDetailLabel(state: AgentConsoleSessionState): string {
    const item = state.selectedPlanTodo;
    if (!item) return '';
    const parts = [
        `#${item.id} ${item.content}`,
        `status ${item.status}`,
        item.kind ? `kind ${item.kind}` : '',
        item.owner ? `owner ${item.owner}` : '',
        item.estimate ? `estimate ${item.estimate}` : '',
        item.dependsOn?.length ? `depends on ${item.dependsOn.join(', ')}` : '',
        item.blockedBy?.length ? `blocked by ${item.blockedBy.join(', ')}` : '',
        item.blockedReason ? `reason: ${item.blockedReason}` : '',
        item.acceptance ? `acceptance: ${item.acceptance}` : '',
        item.error ? `error: ${item.error}` : '',
        item.elapsedMs ? `elapsed ${item.elapsedMs}ms` : '',
        item.evidenceIds?.length ? `evidence ${item.evidenceIds.join(', ')}` : '',
        item.receiptId ? `receipt ${item.receiptId}` : '',
        item.testSummary ? `test: ${item.testSummary}` : '',
        item.diffSummary ? `diff: ${item.diffSummary}` : '',
        item.reviewSummary ? `review: ${item.reviewSummary}` : ''
    ];
    return parts.filter(Boolean).join('\n');
}

/** Replace the plan with a full projection (sequence/revision guarded). */
export function setPlanTodos(
    state: AgentConsoleSessionState,
    todos: AgentConsolePlanTodoItem[],
    sourceSessionId?: string,
    scope?: 'project' | 'thread',
    sequence?: number,
    revision?: number,
    planId?: string
): void {
    if (sequence !== undefined && sequence <= state.planEventSequence) {
        return;
    }
    if (sequence !== undefined) {
        state.planEventSequence = sequence;
    }
    if (revision !== undefined && revision >= 0) {
        state.planRevision = revision;
    }
    if (planId) {
        state.planId = String(planId);
    }
    state.planTodos = todos.map(todo => {
        const pid = state.planId || (planId ? String(planId) : undefined);
        if (!pid) {
            return { ...todo };
        }
        return { ...todo, planId: pid, revision: state.planRevision };
    });
    if (state.planTodos.length <= 7) {
        state.planTodoExpanded = false;
    }
    state.planTodoSourceSessionId = String(sourceSessionId || '').trim();
    state.planScope = scope || '';
    state.planMessage = buildPlanMessage(state);
}

/** Merge a plan-created event into the todo projection. */
export function mergePlanCreated(
    state: AgentConsoleSessionState,
    steps: Array<Partial<AgentConsolePlanTodoItem> & { id: string; content: string }>,
    planId?: string,
    revision?: number,
    sequence?: number,
    sourceSessionId?: string,
    scope?: 'project' | 'thread'
): void {
    if (sequence !== undefined && sequence <= state.planEventSequence) {
        return;
    }
    if (sequence !== undefined) {
        state.planEventSequence = sequence;
    }
    state.planTodos = steps.map((step, index) => ({
        id: String(step.id || '').trim() || `step-${index}`,
        content: String(step.content || '').trim(),
        status: (step.status === 'cancelled' || step.status === 'failed' || step.status === 'in_progress' || step.status === 'completed' ? step.status : 'pending'),
        parentId: step.parentId,
        kind: step.kind,
        acceptance: step.acceptance,
        dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn.slice() : undefined,
        blockedBy: Array.isArray(step.blockedBy) ? step.blockedBy.slice() : undefined,
        estimate: step.estimate,
        owner: step.owner,
        evidenceIds: Array.isArray(step.evidenceIds) ? step.evidenceIds.slice() : undefined,
        receiptId: step.receiptId,
        testSummary: step.testSummary,
        diffSummary: step.diffSummary,
        reviewSummary: step.reviewSummary,
        error: step.error,
        elapsedMs: step.elapsedMs,
        planId: planId ? String(planId) : state.planId,
        revision: revision !== undefined && revision >= 0 ? revision : state.planRevision,
        updatedAt: Date.now()
    }));
    if (state.planTodos.length <= 7) {
        state.planTodoExpanded = false;
    }
    if (sourceSessionId !== undefined) {
        state.planTodoSourceSessionId = String(sourceSessionId || '').trim();
    }
    if (scope !== undefined) {
        state.planScope = scope || '';
    }
    if (planId) {
        state.planId = String(planId);
    }
    if (revision !== undefined && revision >= 0) {
        state.planRevision = revision;
    }
    state.planMessage = buildPlanMessage(state);
}

/** Apply one plan-step status transition, preserving inline metadata. */
export function mergePlanStepStatus(
    state: AgentConsoleSessionState,
    planId: string,
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed',
    opts: { sequence?: number; owner?: string; reason?: string; error?: string; elapsedMs?: number } = {}
): boolean {
    const currentPlanId = String(planId || '').trim();
    if (currentPlanId && state.planId && currentPlanId !== state.planId) {
        return false;
    }
    if (opts.sequence !== undefined && opts.sequence <= state.planEventSequence) {
        return false;
    }
    const index = state.planTodos.findIndex(todo => todo.id === stepId);
    if (index < 0) {
        return false;
    }
    if (opts.sequence !== undefined) {
        state.planEventSequence = opts.sequence;
    }
    const current = state.planTodos[index];
    const next: AgentConsolePlanTodoItem = {
        ...current,
        status,
        planId: state.planId || currentPlanId,
        updatedAt: Date.now()
    };
    if (opts.owner !== undefined) {
        next.owner = opts.owner;
    }
    if (opts.reason !== undefined) {
        next.blockedReason = opts.reason;
        if (!next.blockedBy) next.blockedBy = [];
        if (!next.blockedBy.includes(stepId)) next.blockedBy = [...next.blockedBy, stepId];
    }
    if (opts.error !== undefined) next.error = opts.error;
    if (opts.elapsedMs !== undefined) next.elapsedMs = opts.elapsedMs;
    state.planTodos = [...state.planTodos.slice(0, index), next, ...state.planTodos.slice(index + 1)];
    state.planMessage = buildPlanMessage(state);
    return true;
}

/** Cancel all remaining pending/in-progress steps once per event sequence. */
export function cancelRemainingPlanSteps(state: AgentConsoleSessionState, planId?: string, sequence?: number): void {
    if (sequence !== undefined && sequence <= state.planEventSequence) {
        return;
    }
    if (sequence !== undefined) {
        state.planEventSequence = sequence;
    }
    let changed = false;
    state.planTodos = state.planTodos.map(todo => {
        if (todo.status === 'pending' || todo.status === 'in_progress') {
            changed = true;
            return {
                ...todo,
                status: 'cancelled' as const,
                planId: state.planId || (planId ? String(planId) : todo.planId),
                updatedAt: Date.now()
            };
        }
        return todo;
    });
    if (changed) {
        state.planMessage = buildPlanMessage(state);
    }
}


/** Normalize persisted/external todo statuses to the console plan model. */
export function normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    switch (String(status || '').trim()) {
        case 'in_progress':
        case 'completed':
        case 'cancelled':
            return status as 'in_progress' | 'completed' | 'cancelled';
        default:
            return 'pending';
    }
}
