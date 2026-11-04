import type {
    AgentConsoleReviewAnnotation,
    AgentConsoleReviewDiffSection,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

/** File/hunk annotations, summary and risk scoring for the review panel. */
export function setReviewFileAnnotation(
    state: AgentConsoleSessionState,
    status: 'approved' | 'rejected',
    comment?: string,
    filePath?: string
): void {
    if (!state.reviewOpen) return;
    const path = filePath ?? state.selectedReviewFileSection?.path;
    if (!path) return;
    state.reviewFileAnnotations[path] = { status, comment, createdAt: new Date().toISOString() };
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function clearReviewFileAnnotation(state: AgentConsoleSessionState, filePath?: string): void {
    if (!state.reviewOpen) return;
    const path = filePath ?? state.selectedReviewFileSection?.path;
    if (!path) return;
    delete state.reviewFileAnnotations[path];
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function approveAllReviewFiles(state: AgentConsoleSessionState, comment?: string): void {
    if (!state.reviewOpen) return;
    for (const section of state.reviewFileSections) {
        state.reviewFileAnnotations[section.path] = { status: 'approved', comment, createdAt: new Date().toISOString() };
    }
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function rejectAllReviewFiles(state: AgentConsoleSessionState, comment?: string): void {
    if (!state.reviewOpen) return;
    for (const section of state.reviewFileSections) {
        state.reviewFileAnnotations[section.path] = { status: 'rejected', comment, createdAt: new Date().toISOString() };
    }
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function setReviewHunkAnnotation(
    state: AgentConsoleSessionState,
    status: 'approved' | 'rejected',
    comment?: string,
    filePath?: string,
    hunkIndex?: number
): void {
    if (!state.reviewOpen) return;
    const path = filePath ?? state.selectedReviewFileSection?.path;
    const index = hunkIndex ?? state.selectedReviewHunkIndex;
    if (!path) return;
    state.reviewHunkAnnotations[hunkAnnotationKey(path, index)] = { status, comment, createdAt: new Date().toISOString() };
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function clearReviewHunkAnnotation(state: AgentConsoleSessionState, filePath?: string, hunkIndex?: number): void {
    if (!state.reviewOpen) return;
    const path = filePath ?? state.selectedReviewFileSection?.path;
    const index = hunkIndex ?? state.selectedReviewHunkIndex;
    if (!path) return;
    delete state.reviewHunkAnnotations[hunkAnnotationKey(path, index)];
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function getReviewHunkAnnotation(
    state: AgentConsoleSessionState,
    filePath: string,
    hunkIndex: number
): AgentConsoleReviewAnnotation | undefined {
    return state.reviewHunkAnnotations[hunkAnnotationKey(filePath, hunkIndex)];
}

export function approveAllReviewHunksForFile(state: AgentConsoleSessionState, comment?: string, filePath?: string): void {
    annotateAllHunks(state, 'approved', comment, filePath);
}

export function rejectAllReviewHunksForFile(state: AgentConsoleSessionState, comment?: string, filePath?: string): void {
    annotateAllHunks(state, 'rejected', comment, filePath);
}

function annotateAllHunks(
    state: AgentConsoleSessionState,
    status: 'approved' | 'rejected',
    comment?: string,
    filePath?: string
): void {
    if (!state.reviewOpen) return;
    const path = filePath ?? state.selectedReviewFileSection?.path;
    if (!path) return;
    const section = state.reviewFileSections.find(item => item.path === path);
    if (!section) return;
    const hunks = state.parseReviewHunks(section);
    for (let index = 0; index < hunks.length; index++) {
        state.reviewHunkAnnotations[hunkAnnotationKey(path, index)] = { status, comment, createdAt: new Date().toISOString() };
    }
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function collectReviewConclusions(state: AgentConsoleSessionState): {
    files: Record<string, AgentConsoleReviewAnnotation>;
    hunks: Record<string, AgentConsoleReviewAnnotation>;
    summary: {
        totalFiles: number;
        approvedFiles: number;
        rejectedFiles: number;
        totalHunks: number;
        approvedHunks: number;
        rejectedHunks: number;
    };
} {
    const fileEntries = Object.entries(state.reviewFileAnnotations);
    const hunkEntries = Object.entries(state.reviewHunkAnnotations);
    return {
        files: { ...state.reviewFileAnnotations },
        hunks: { ...state.reviewHunkAnnotations },
        summary: {
            totalFiles: fileEntries.length,
            approvedFiles: fileEntries.filter(([, annotation]) => annotation.status === 'approved').length,
            rejectedFiles: fileEntries.filter(([, annotation]) => annotation.status === 'rejected').length,
            totalHunks: hunkEntries.length,
            approvedHunks: hunkEntries.filter(([, annotation]) => annotation.status === 'approved').length,
            rejectedHunks: hunkEntries.filter(([, annotation]) => annotation.status === 'rejected').length
        }
    };
}

export function writeReviewConclusions(state: AgentConsoleSessionState): ReturnType<typeof collectReviewConclusions> {
    const conclusions = collectReviewConclusions(state);
    state.onReviewConclusionsWriteBack?.(conclusions);
    return conclusions;
}

export function clearAllReviewAnnotations(state: AgentConsoleSessionState): void {
    if (!state.reviewOpen) return;
    state.reviewFileAnnotations = {};
    state.reviewHunkAnnotations = {};
    state.syncCurrentReviewAnnotationCache();
    state.onReviewAnnotationsPersist?.(state.getAnnotationCache());
}

export function getReviewAnnotationSummary(state: AgentConsoleSessionState): string[] {
    const lines: string[] = [];
    const fileEntries = Object.entries(state.reviewFileAnnotations);
    const hunkEntries = Object.entries(state.reviewHunkAnnotations);
    if (!fileEntries.length && !hunkEntries.length) {
        lines.push(state.translateLabel('agent.menu.panel.review.annotationsNone', undefined, 'No annotations.'));
        return lines;
    }
    if (fileEntries.length) {
        const approved = fileEntries.filter(([, annotation]) => annotation.status === 'approved').length;
        const rejected = fileEntries.filter(([, annotation]) => annotation.status === 'rejected').length;
        lines.push(state.translateLabel(
            'agent.menu.panel.review.annotationsFiles',
            { approved, rejected },
            `File Annotations: ${approved} approved, ${rejected} rejected`
        ));
        for (const [path, annotation] of fileEntries) {
            lines.push(`  ${annotation.status === 'approved' ? '✓' : '✗'} ${path}${annotation.comment ? ` — ${annotation.comment}` : ''}`);
        }
    }
    if (hunkEntries.length) {
        const approved = hunkEntries.filter(([, annotation]) => annotation.status === 'approved').length;
        const rejected = hunkEntries.filter(([, annotation]) => annotation.status === 'rejected').length;
        lines.push(`Hunk Annotations: ${approved} approved, ${rejected} rejected`);
        for (const [key, annotation] of hunkEntries) {
            lines.push(`  ${annotation.status === 'approved' ? '✓' : '✗'} ${key}${annotation.comment ? ` — ${annotation.comment}` : ''}`);
        }
    }
    return lines;
}

export function computeFileRiskScore(section: AgentConsoleReviewDiffSection): {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
} {
    const rawScore = section.additions * 1 + section.deletions * 0.5;
    if (rawScore < 10) return { score: 1, level: 'low' };
    if (rawScore < 30) return { score: 3, level: 'low' };
    if (rawScore < 60) return { score: 5, level: 'medium' };
    if (rawScore < 120) return { score: 7, level: 'high' };
    return { score: 10, level: 'critical' };
}

function hunkAnnotationKey(filePath: string, hunkIndex: number): string {
    return `${filePath}#${hunkIndex}`;
}


/** Read the latest session-scoped annotation cache. */
export function getAnnotationCache(state: AgentConsoleSessionState): Record<string, Record<string, AgentConsoleReviewAnnotation>> {
    syncCurrentReviewAnnotationCache(state);
    return { ...state.reviewAnnotationCache };
}

export function setAnnotationCache(
    state: AgentConsoleSessionState,
    cache: Record<string, Record<string, AgentConsoleReviewAnnotation>>
): void {
    state.reviewAnnotationCache = { ...(cache || {}) };
}

export function syncCurrentReviewAnnotationCache(state: AgentConsoleSessionState): void {
    const cacheKey = getCurrentReviewAnnotationCacheKey(state);
    if (!cacheKey) return;
    const hasFileAnnots = Object.keys(state.reviewFileAnnotations).length > 0;
    const hasHunkAnnots = Object.keys(state.reviewHunkAnnotations).length > 0;
    if (hasFileAnnots || hasHunkAnnots) {
        state.reviewAnnotationCache[cacheKey] = { ...state.reviewFileAnnotations, ...state.reviewHunkAnnotations };
        return;
    }
    delete state.reviewAnnotationCache[cacheKey];
}

export function getCurrentReviewAnnotationCacheKey(state: AgentConsoleSessionState): string {
    const explicit = String(state.selectedReviewTaskCacheKey || '').trim();
    if (explicit) return explicit;
    const taskChoice = state.reviewTaskChoices.find(item => item.id === state.selectedReviewTaskId);
    return state.resolveReviewAnnotationCacheKey(state.reviewTask)
        || state.resolveReviewAnnotationCacheKey(taskChoice)
        || String(state.selectedReviewTaskId || '').trim();
}
