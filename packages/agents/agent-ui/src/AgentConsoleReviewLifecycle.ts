import type { AgentMessage } from '@tsdi/agent';
import type {
    AgentConsoleReviewAnnotation,
    AgentConsoleReviewTaskItem,
    AgentConsoleReviewWorker,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

/** Opening, closing and resetting the review surface. */
export function openReview(
    state: AgentConsoleSessionState,
    task?: Record<string, any> | null,
    payload?: {
        diff?: any;
        workers?: AgentConsoleReviewWorker[];
        executionMode?: 'sequential' | 'parallel' | null;
    }
): void {
    const preferredGroupKey = state.selectedReviewGroup?.key;
    const preferredFilePath = state.selectedReviewFileSection?.path;
    state.syncCurrentReviewAnnotationCache();
    if (task !== undefined) {
        state.reviewTask = task || null;
    }
    if (payload) {
        state.reviewDiff = payload.diff ?? null;
        state.reviewWorkers = Array.isArray(payload.workers) ? payload.workers.slice() : [];
    }
    state.fileChangeMessage = buildFileChangeMessage(state);
    const selectedTaskId = String(state.reviewTask?.id || state.selectedReviewTaskId || '').trim();
    if (selectedTaskId) {
        state.selectedReviewTaskId = selectedTaskId;
        const executionMode = payload?.executionMode ?? state.reviewExecutionMode;
        const existingIndex = state.reviewTaskChoices.findIndex(item => item.id === selectedTaskId);
        const nextItem: AgentConsoleReviewTaskItem = {
            id: selectedTaskId,
            title: String(state.reviewTask?.title || selectedTaskId),
            cacheKey: state.resolveReviewAnnotationCacheKey(state.reviewTask),
            sourceSessionId: state.reviewTask?.sourceSessionId || state.reviewTask?.sessionId,
            status: state.reviewTask?.status,
            executionMode,
            retryOfTaskId: state.reviewTask?.metadata?.retrySourceTaskId || state.reviewTask?.metadata?.retryOfTaskId,
            lineageRootTaskId: state.reviewTask?.metadata?.retryOfTaskId || state.reviewTask?.id,
            retryDepth: typeof state.reviewTask?.metadata?.retrySequence === 'number' ? state.reviewTask.metadata.retrySequence : undefined,
            updatedAt: state.reviewTask?.updatedAt,
            detail: typeof state.reviewDiff?.summary === 'string' ? state.reviewDiff.summary : undefined
        };
        if (existingIndex >= 0) {
            state.reviewTaskChoices = state.reviewTaskChoices.map(item => item.id === selectedTaskId ? {
                ...item,
                ...nextItem
            } : item);
        } else {
            state.reviewTaskChoices = [nextItem, ...state.reviewTaskChoices];
        }
        state.selectedReviewTaskCacheKey = state.resolveReviewAnnotationCacheKey(state.reviewTask)
            || state.resolveReviewAnnotationCacheKey(nextItem)
            || selectedTaskId;
        const cached = state.reviewAnnotationCache[state.selectedReviewTaskCacheKey] || state.reviewAnnotationCache[selectedTaskId];
        if (cached) {
            const fileAnnotations: Record<string, AgentConsoleReviewAnnotation> = {};
            const hunkAnnotations: Record<string, AgentConsoleReviewAnnotation> = {};
            for (const [key, value] of Object.entries(cached)) {
                const hashIndex = key.lastIndexOf('#');
                if (hashIndex > 0 && /^\d+$/.test(key.slice(hashIndex + 1))) {
                    hunkAnnotations[key] = value;
                } else {
                    fileAnnotations[key] = value;
                }
            }
            state.reviewFileAnnotations = fileAnnotations;
            state.reviewHunkAnnotations = hunkAnnotations;
        } else {
            state.reviewFileAnnotations = {};
            state.reviewHunkAnnotations = {};
        }
    }
    if (!state.reviewTask && !state.reviewDiff && !state.reviewWorkers.length) {
        return;
    }
    syncReviewGroupSelection(state, preferredGroupKey);
    syncReviewFileSelection(state, preferredFilePath);
    state.reviewOpen = true;
    state.selectedReviewHunkIndex = 0;
    state.resetReviewDetailViewport();
    state.syncDerivedInputFocus();
}

export function buildFileChangeMessage(state: AgentConsoleSessionState): AgentMessage | null {
    const files = state.aggregateReviewFileSections;
    if (!files.length) {
        return null;
    }
    const content = [
        state.translateLabel('agent.menu.panel.review.filesChanged', { count: files.length }, `files changed: ${files.length}`),
        ...files.map(file => `${file.path} [${state.translateLabel(
            `agent.menu.panel.review.fileStatus${(file.status || 'update').charAt(0).toUpperCase()}${(file.status || 'update').slice(1)}`,
            undefined,
            file.status || 'update'
        )}] (+${file.additions} -${file.deletions})`)
    ].join('\n');
    return {
        id: '__file_change_inline__',
        role: 'assistant',
        content,
        createdAt: Date.now(),
        metadata: {
            uiKind: 'file-change',
            reviewTaskId: state.reviewTask?.id,
            detailRef: state.reviewTask?.id,
            sourceMessageId: state.reviewTask?.metadata?.sourceMessageId,
            planId: state.reviewTask?.metadata?.planId,
            planStepId: state.reviewTask?.metadata?.stepId
        }
    };
}

export function closeReview(state: AgentConsoleSessionState): void {
    if (!state.reviewOpen && state.reviewDetailScroll === 0 && state.reviewDetailColumnScroll === 0) {
        return;
    }
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
    state.reviewOpen = false;
    state.resetReviewDetailViewport();
    state.syncDerivedInputFocus();
}

export function clearReview(state: AgentConsoleSessionState): void {
    state.syncCurrentReviewAnnotationCache();
    state.reviewTask = null;
    state.reviewDiff = null;
    state.reviewWorkers = [];
    state.reviewTaskChoices = [];
    state.taskRecords = [];
    state.selectedReviewTaskId = '';
    state.selectedReviewTaskCacheKey = '';
    state.selectedTaskFilter = 'all';
    state.selectedTaskLineageRootId = '';
    state.selectedReviewGroupIndex = 0;
    state.selectedReviewFileIndex = 0;
    state.selectedReviewHunkIndex = 0;
    state.foldedReviewHunks.clear();
    state.selectedReviewPatchFilter = 'all';
    state.reviewSideBySide = false;
    state.reviewFileAnnotations = {};
    state.reviewHunkAnnotations = {};
    state.reviewOpen = false;
    state.resetReviewDetailViewport();
    state.syncDerivedInputFocus();
}

export function syncReviewGroupSelection(state: AgentConsoleSessionState, preferredKey?: string): void {
    const groups = state.reviewGroups;
    if (!groups.length) {
        state.selectedReviewGroupIndex = 0;
        return;
    }
    const preferredIndex = preferredKey
        ? groups.findIndex(group => group.key === preferredKey)
        : -1;
    const currentIndex = Math.max(0, Math.min(groups.length - 1, state.selectedReviewGroupIndex));
    state.selectedReviewGroupIndex = preferredIndex >= 0 ? preferredIndex : currentIndex;
}

export function syncReviewFileSelection(state: AgentConsoleSessionState, preferredPath?: string): void {
    const sections = state.reviewFileSections;
    if (!sections.length) {
        state.selectedReviewFileIndex = 0;
        return;
    }
    const preferredIndex = preferredPath
        ? sections.findIndex(section => section.path === preferredPath)
        : -1;
    const currentIndex = Math.max(0, Math.min(sections.length - 1, state.selectedReviewFileIndex));
    state.selectedReviewFileIndex = preferredIndex >= 0 ? preferredIndex : currentIndex;
}
