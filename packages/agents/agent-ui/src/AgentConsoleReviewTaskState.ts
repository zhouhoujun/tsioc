import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleReviewTaskItem, AgentConsoleTaskFilter } from './AgentConsoleSessionState';

/**
 * Review-task selection and lineage filtering.
 *
 * These functions are deliberately state-argument based: the reactive state
 * class keeps the data, while this module owns the navigation rules so the
 * god-object does not grow another selector/navigation domain.
 */
export function setTasksFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.tasksFocused = focused;
    if (focused && !state.selectedReviewTaskId && resolveFilteredReviewTaskChoices(state).length) {
        const first = resolveFilteredReviewTaskChoices(state)[0];
        state.selectedReviewTaskId = first.id;
        state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(first);
    }
    state.syncDerivedInputFocus();
}

export function setSelectedReviewTaskId(state: AgentConsoleSessionState, taskId: string): void {
    const matched = state.reviewTaskChoices.find(item => item.id === taskId);
    if (!taskId || !matched) {
        return;
    }
    state.selectedReviewTaskId = taskId;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(matched);
}

export function moveTaskSelection(state: AgentConsoleSessionState, delta: number): void {
    const tasks = resolveFilteredReviewTaskChoices(state);
    if (!tasks.length) {
        return;
    }
    const currentIndex = Math.max(0, tasks.findIndex(item => item.id === state.selectedReviewTaskId));
    const nextIndex = (currentIndex + delta + tasks.length) % tasks.length;
    state.selectedReviewTaskId = tasks[nextIndex].id;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(tasks[nextIndex]);
}

export function moveTaskSelectionPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    const tasks = resolveFilteredReviewTaskChoices(state);
    if (!tasks.length) {
        return;
    }
    const currentIndex = Math.max(0, tasks.findIndex(item => item.id === state.selectedReviewTaskId));
    const resolvedPageSize = pageSize ?? state.consoleOptions.sessionSelectionPageSize;
    const nextIndex = Math.max(0, Math.min(tasks.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
    state.selectedReviewTaskId = tasks[nextIndex].id;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(tasks[nextIndex]);
}

export function selectFirstTask(state: AgentConsoleSessionState): void {
    const tasks = resolveFilteredReviewTaskChoices(state);
    if (!tasks.length) {
        return;
    }
    state.selectedReviewTaskId = tasks[0].id;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(tasks[0]);
}

export function selectLastTask(state: AgentConsoleSessionState): void {
    const tasks = resolveFilteredReviewTaskChoices(state);
    if (!tasks.length) {
        return;
    }
    const last = tasks[tasks.length - 1];
    state.selectedReviewTaskId = last.id;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(last);
}

export function resolveSelectedTask(state: AgentConsoleSessionState): Record<string, any> | undefined {
    return state.taskRecords.find(item => item?.id === state.selectedReviewTaskId);
}

export function resolveFilteredReviewTaskChoices(state: AgentConsoleSessionState): AgentConsoleReviewTaskItem[] {
    switch (state.selectedTaskFilter) {
        case 'failed':
            return state.reviewTaskChoices.filter(item => isFailedTaskChoice(item));
        case 'rollback':
            return state.reviewTaskChoices.filter(item => !!item.rollbackAvailable);
        case 'lineage':
            return state.selectedTaskLineageRootId
                ? state.reviewTaskChoices.filter(item => resolveTaskLineageRootId(item) === state.selectedTaskLineageRootId)
                : state.reviewTaskChoices;
        default:
            return state.reviewTaskChoices;
    }
}

export function setTaskFilter(state: AgentConsoleSessionState, filter: AgentConsoleTaskFilter): void {
    if (state.selectedTaskFilter === filter) {
        return;
    }
    state.selectedTaskFilter = filter;
    if (filter !== 'lineage') {
        state.selectedTaskLineageRootId = '';
    }
    syncFilteredTaskSelection(state);
}

export function focusSelectedTaskLineageFilter(state: AgentConsoleSessionState): boolean {
    const rootId = resolveTaskLineageRootId(state.selectedTask);
    if (!rootId) {
        return false;
    }
    state.selectedTaskFilter = 'lineage';
    state.selectedTaskLineageRootId = rootId;
    syncFilteredTaskSelection(state);
    return true;
}

export function syncFilteredTaskSelection(state: AgentConsoleSessionState): void {
    const tasks = resolveFilteredReviewTaskChoices(state);
    if (!tasks.length) {
        state.selectedReviewTaskId = '';
        state.selectedReviewTaskCacheKey = '';
        return;
    }
    if (state.selectedReviewTaskId && tasks.some(item => item.id === state.selectedReviewTaskId)) {
        return;
    }
    state.selectedReviewTaskId = tasks[0].id;
    state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(tasks[0]);
}

export function resolveTaskLineageRootId(task: Record<string, any> | undefined | null): string {
    if (!task) {
        return '';
    }
    if (typeof task.lineageRootTaskId === 'string' && task.lineageRootTaskId.trim()) {
        return task.lineageRootTaskId.trim();
    }
    if (typeof task?.metadata?.retryOfTaskId === 'string' && task.metadata.retryOfTaskId.trim()) {
        return task.metadata.retryOfTaskId.trim();
    }
    return typeof task.id === 'string' && task.id.trim() ? task.id.trim() : '';
}

function isFailedTaskChoice(task: AgentConsoleReviewTaskItem | undefined): boolean {
    const status = String(task?.status || '').trim().toLowerCase();
    return status === 'failed' || status === 'error';
}
