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
