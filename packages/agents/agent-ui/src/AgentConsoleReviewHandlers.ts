import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * Review listings are multi-line. `notify` keeps a single notice slot, so
 * notifying per line leaves only the last one on screen; emit one block instead
 * (the console turns blocks longer than three lines into a scrollable overlay).
 */
export interface ReviewHandlerState {
    sessionId: string;
    workspace?: string;
    selectedReviewTaskId?: string | null;
    selectedReviewTaskCacheKey?: string | null;
    reviewTask?: { id?: string; sessionId?: string | null; sourceSessionId?: string | null } | null;
    setSessionsFocused(focused: boolean): void;
    setTasksFocused(focused: boolean): void;
    setJobsFocused(focused: boolean): void;
    setToolsFocused(focused: boolean): void;
    setApprovalsFocused(focused: boolean): void;
    closeMessageDetail(): void;
    openReview(task: Record<string, any>, payload: Record<string, any>): void;
    setNotice(message: string): void;
    setLastError(message: string): void;
    setAnnotationCache(cache: Record<string, Record<string, any>>): void;
    getAnnotationCache(): Record<string, Record<string, any>>;
    reviewFileAnnotations: Record<string, any>;
}

export interface ReviewHandlerContext {
    translator?: AgentUiTranslator | null;
    state: ReviewHandlerState;
    transcriptNavigationController: { setFocused(focused: boolean): void };
    appRpc: { request(method: string, payload?: Record<string, any>, context?: any): Promise<any> } | null | undefined;
    notify(message: string, duration?: number): void;
    activateToolForSession(toolName: string, sessionId: string): Promise<unknown>;
    getOpenReviewRequestId(): number;
}

// ── Review annotations volatile cache ────────────────────────────────────────

/** Per appRpc-owner in-memory annotation snapshots (moved from the component static). */
const REVIEW_ANNOTATIONS_VOLATILE_CACHE = new WeakMap<object, Map<string, Record<string, any>>>();

export function getReviewAnnotationsVolatileCache(
    ctx: ReviewHandlerContext,
    create = false
): Map<string, Record<string, any>> | undefined {
    const owner = ctx.appRpc as object | null | undefined;
    if (!owner) {
        return undefined;
    }
    const existing = REVIEW_ANNOTATIONS_VOLATILE_CACHE.get(owner);
    if (existing || !create) {
        return existing;
    }
    const cache = new Map<string, Record<string, any>>();
    REVIEW_ANNOTATIONS_VOLATILE_CACHE.set(owner, cache);
    return cache;
}

export function rememberVolatileReviewAnnotations(
    ctx: ReviewHandlerContext,
    cacheKey: string,
    annotations?: Record<string, any> | null
): Record<string, any> {
    const snapshot = { ...(annotations || {}) };
    getReviewAnnotationsVolatileCache(ctx, true)?.set(cacheKey, snapshot);
    return { ...snapshot };
}

export function getVolatileReviewAnnotations(ctx: ReviewHandlerContext, cacheKey: string): Record<string, any> | undefined {
    const cache = getReviewAnnotationsVolatileCache(ctx);
    if (!cache?.has(cacheKey)) {
        return undefined;
    }
    const cached = cache.get(cacheKey);
    return { ...(cached || {}) };
}

// ── Annotation cache keys & scopes ───────────────────────────────────────────

export function resolveReviewAnnotationsSessionId(ctx: ReviewHandlerContext): string {
    return String(
        ctx.state.reviewTask?.sourceSessionId
        || ctx.state.reviewTask?.sessionId
        || ctx.state.sessionId
        || ''
    ).trim();
}

export function getReviewAnnotationsCacheKey(ctx: ReviewHandlerContext): string | undefined {
    const stateCacheKey = String(ctx.state.selectedReviewTaskCacheKey || '').trim();
    if (stateCacheKey) {
        return stateCacheKey;
    }
    const sessionId = resolveReviewAnnotationsSessionId(ctx);
    const reviewTaskId = String(ctx.state.selectedReviewTaskId || ctx.state.reviewTask?.id || '').trim();
    if (!sessionId || !reviewTaskId) {
        return undefined;
    }
    return `${sessionId}:${reviewTaskId}`;
}

export function looksLikeReviewAnnotationMap(value: unknown): value is Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const entries = Object.values(value as Record<string, any>);
    return entries.every(entry => !!entry && typeof entry === 'object' && typeof entry.status === 'string');
}

export function extractReviewAnnotations(
    cache: Record<string, Record<string, any>> | Record<string, any> | null | undefined,
    scope: { cacheKey?: string; selectedTaskId?: string }
): Record<string, any> | undefined {
    const cacheKey = String(scope.cacheKey || '').trim();
    const selectedTaskId = String(scope.selectedTaskId || '').trim();
    const direct = cache && typeof cache === 'object' && cacheKey
        ? (cache as Record<string, any>)[cacheKey]
        : undefined;
    if (looksLikeReviewAnnotationMap(direct)) {
        return direct;
    }
    const legacy = cache && typeof cache === 'object' && selectedTaskId
        ? (cache as Record<string, any>)[selectedTaskId]
        : undefined;
    if (looksLikeReviewAnnotationMap(legacy)) {
        return legacy;
    }
    if (looksLikeReviewAnnotationMap(cache)) {
        return cache as Record<string, any>;
    }
    return undefined;
}

export function applyReviewAnnotationsForScope(
    ctx: ReviewHandlerContext,
    cacheKey: string,
    selectedTaskId: string,
    annotations: Record<string, any>
): void {
    const cacheEntryKey = cacheKey || selectedTaskId;
    ctx.state.setAnnotationCache({
        ...ctx.state.getAnnotationCache(),
        ...(cacheEntryKey ? { [cacheEntryKey]: { ...annotations } } : {})
    });
    ctx.state.reviewFileAnnotations = { ...annotations };
}

// ── Annotation persistence ───────────────────────────────────────────────────

export async function saveReviewAnnotationsCacheToDisk(
    ctx: ReviewHandlerContext,
    cache: Record<string, Record<string, any>>
): Promise<void> {
    const cacheKey = getReviewAnnotationsCacheKey(ctx);
    const selectedTaskId = String(ctx.state.selectedReviewTaskId || ctx.state.reviewTask?.id || '').trim();
    if (!cacheKey) {
        return;
    }
    const annotations = selectedTaskId || cacheKey
        ? extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {}
        : {};
    const snapshot = rememberVolatileReviewAnnotations(ctx, cacheKey, annotations);
    if (!ctx.appRpc) {
        return;
    }
    try {
        await ctx.appRpc.request('review_annotations.save', {
            sessionId: resolveReviewAnnotationsSessionId(ctx),
            cacheKey,
            cache: snapshot
        });
    } catch {
        // annotation persistence is best-effort
    }
}

export async function restoreReviewAnnotationsCacheFromDiskForScope(
    ctx: ReviewHandlerContext,
    scope?: {
        cacheKey?: string;
        selectedTaskId?: string;
        sessionId?: string;
        requestId?: number;
    }
): Promise<void> {
    const cacheKey = String(scope?.cacheKey || getReviewAnnotationsCacheKey(ctx) || '').trim();
    if (!cacheKey) {
        return;
    }
    const sessionId = String(scope?.sessionId || resolveReviewAnnotationsSessionId(ctx) || '').trim();
    const selectedTaskId = String(scope?.selectedTaskId || ctx.state.selectedReviewTaskId || '').trim();
    if (scope?.requestId != null && scope.requestId !== ctx.getOpenReviewRequestId()) {
        return;
    }
    const volatileAnnotations = getVolatileReviewAnnotations(ctx, cacheKey);
    if (volatileAnnotations !== undefined) {
        applyReviewAnnotationsForScope(ctx, cacheKey, selectedTaskId, volatileAnnotations);
        return;
    }
    if (!ctx.appRpc) {
        return;
    }
    try {
        const cache = await ctx.appRpc.request('review_annotations.load', {
            sessionId,
            cacheKey
        });
        if (scope?.requestId != null && scope.requestId !== ctx.getOpenReviewRequestId()) {
            return;
        }
        if (cache && (selectedTaskId || cacheKey)) {
            const annotations = extractReviewAnnotations(cache, { cacheKey, selectedTaskId }) || {};
            const snapshot = rememberVolatileReviewAnnotations(ctx, cacheKey, annotations);
            applyReviewAnnotationsForScope(ctx, cacheKey, selectedTaskId, snapshot);
        }
    } catch {
        // annotation restore is best-effort
    }
}

export async function restoreReviewAnnotationsCacheFromDisk(ctx: ReviewHandlerContext): Promise<void> {
    return restoreReviewAnnotationsCacheFromDiskForScope(ctx);
}

// ── Worktree diff parsing ────────────────────────────────────────────────────

export * from './AgentConsoleReviewWorkflow';
