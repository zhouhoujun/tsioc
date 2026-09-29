/**
 * Review / git-diff command handlers for AgentConsoleComponent.
 *
 * Extracted verbatim from the component (P197 batch A): every function keeps
 * the original logic and only receives its component dependencies through a
 * minimal structural context (`ReviewHandlerContext`).
 */

// ── Review handler context ───────────────────────────────────────────────────

export interface ReviewHandlerState {
    sessionId: string;
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

export function parseWorktreeDiffArgs(args?: string): {
    scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked';
    paths: string[];
    error?: string;
} {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const flags = tokens.filter(token => token === '--staged' || token === '--unstaged' || token === '--untracked');
    if (flags.length > 1) {
        return { scope: 'working-tree', paths: [], error: 'Use only one of --staged, --unstaged, or --untracked.' };
    }
    const unknownFlag = tokens.find(token => token.startsWith('--') && !flags.some(flag => flag === token));
    if (unknownFlag) {
        return { scope: 'working-tree', paths: [], error: `Unknown /diff option: ${unknownFlag}` };
    }
    const scope = flags[0] ? flags[0].slice(2) as 'staged' | 'unstaged' | 'untracked' : 'working-tree';
    return { scope, paths: tokens.filter(token => !token.startsWith('--')) };
}

export function describeWorktreeDiffScope(scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked'): string {
    return scope === 'working-tree' ? 'Working tree' : scope[0].toUpperCase() + scope.slice(1);
}

// ── Git diff review analysis ─────────────────────────────────────────────────

export function buildGitDiffReviewPrompt(base: string, files: string[], diff: string): string {
    return [
        `Review the following git diff against ${base}.`,
        `Changed files (${files.length}): ${files.join(', ')}`,
        'Analyze the diff and produce a JSON array of findings. Each finding must be an object with:',
        '- category: "correctness" | "risk" | "suggestion"',
        '- severity: "error" | "warning" | "info"',
        '- summary: short one-line description',
        '- detail: optional longer explanation',
        '- anchor: optional { "file": string, "line"?: number, "endLine"?: number } pointing into the diff',
        '- suggestion: optional concrete fix recommendation',
        'Return only the JSON array, no markdown fences, no prose.',
        '',
        '```diff',
        diff,
        '```'
    ].join('\n');
}

export function parseReviewFindingsFromText(text: string): Record<string, any>[] {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
        return [];
    }
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;
    const start = candidate.indexOf('[');
    const end = candidate.lastIndexOf(']');
    if (start < 0 || end <= start) {
        return [];
    }
    try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        return Array.isArray(parsed)
            ? parsed.filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object')
            : [];
    } catch {
        return [];
    }
}

export async function fetchGitDiffReview(
    ctx: ReviewHandlerContext,
    sessionId: string,
    base: string
): Promise<Record<string, any> | null> {
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return null;
    }
    try {
        await ctx.activateToolForSession('review_diff', sessionId);
    } catch {
        // Activation may fail when the tool is not registered; the diff
        // RPC below then surfaces the precise error.
    }
    try {
        const result = await ctx.appRpc.request('review.diff', { sessionId, base });
        if (!result || typeof result !== 'object' || !result.review) {
            ctx.notify(`Failed to gather the git diff against ${base}.`);
            return null;
        }
        return result.review as Record<string, any>;
    } catch (error: any) {
        ctx.notify(error?.message || `Failed to gather the git diff against ${base}.`);
        return null;
    }
}

export function openGitDiffReviewPanel(ctx: ReviewHandlerContext, review: Record<string, any>, base: string): void {
    const sessionId = ctx.state.sessionId;
    const reviewTask = {
        id: `git-diff:${base}`,
        title: `git diff ${base}`,
        sourceSessionId: sessionId,
        status: 'done',
        metadata: { reviewMode: 'git-diff', base }
    };
    ctx.state.setSessionsFocused(false);
    ctx.state.setTasksFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.openReview(reviewTask, { diff: String(review.diff || '') || null });
    ctx.state.setNotice('');
    ctx.state.setLastError('');
}

export async function saveReviewFindings(
    ctx: ReviewHandlerContext,
    sessionId: string,
    run: Record<string, any>
): Promise<Record<string, any> | null> {
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return null;
    }
    try {
        const result = await ctx.appRpc.request('review.save', { sessionId, run });
        return result?.run ?? result ?? null;
    } catch (error: any) {
        ctx.notify(error?.message || 'Failed to save the review run.');
        return null;
    }
}

export async function openGitDiffReview(ctx: ReviewHandlerContext, base?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return true;
    }
    const sessionId = ctx.state.sessionId;
    const resolvedBase = String(base || '').trim() || 'HEAD';
    const review = await fetchGitDiffReview(ctx, sessionId, resolvedBase);
    if (!review) {
        return true;
    }
    const files = Array.isArray(review.files) ? review.files : [];
    if (!files.length) {
        ctx.notify(`No changes to review against ${resolvedBase}.`);
        return true;
    }
    openGitDiffReviewPanel(ctx, review, resolvedBase);
    ctx.notify(`git diff ${resolvedBase}: ${files.length} file${files.length === 1 ? '' : 's'} changed.`);
    return true;
}

export async function runGitDiffReviewAnalysis(ctx: ReviewHandlerContext, base?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return true;
    }
    const sessionId = ctx.state.sessionId;
    const resolvedBase = String(base || '').trim() || 'HEAD';
    const review = await fetchGitDiffReview(ctx, sessionId, resolvedBase);
    if (!review) {
        return true;
    }
    const files = Array.isArray(review.files) ? review.files : [];
    const diff = String(review.diff || '');
    if (!files.length || !diff.trim()) {
        ctx.notify(`No changes to review against ${resolvedBase}.`);
        return true;
    }
    ctx.notify(`Running review analysis against ${resolvedBase}...`);
    let content = '';
    try {
        const turn = await ctx.appRpc.request('run.turn', {
            sessionId,
            input: buildGitDiffReviewPrompt(resolvedBase, files, diff)
        });
        content = String(turn?.message?.content || '');
    } catch (error: any) {
        ctx.notify(error?.message || 'The review analysis turn failed.');
        return true;
    }
    const findings = parseReviewFindingsFromText(content);
    if (!findings.length) {
        ctx.notify('Review produced no parseable findings.');
        openGitDiffReviewPanel(ctx, review, resolvedBase);
        return true;
    }
    const saved = await saveReviewFindings(ctx, sessionId, {
        base: resolvedBase,
        commitSha: typeof review.commitSha === 'string' && review.commitSha.trim() ? review.commitSha.trim() : undefined,
        files,
        diffSummary: String(review.stats || '').trim() || undefined,
        findings
    });
    if (saved) {
        ctx.notify(`${findings.length} finding${findings.length === 1 ? '' : 's'} saved${saved.id ? ` (${saved.id})` : ''}.`);
    }
    openGitDiffReviewPanel(ctx, review, resolvedBase);
    return true;
}

export async function listReviewFindings(ctx: ReviewHandlerContext, commit?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return true;
    }
    const sessionId = ctx.state.sessionId;
    try {
        const result = await ctx.appRpc.request('review.list', {
            sessionId,
            ...(commit ? { commit } : {})
        });
        const runs = Array.isArray(result?.runs) ? result.runs : [];
        if (!runs.length) {
            ctx.notify(commit ? `No review runs found for commit ${commit}.` : 'No review runs saved.');
            return true;
        }
        for (const run of runs) {
            const fileCount = Array.isArray(run.files) ? run.files.length : 0;
            const findingCount = Array.isArray(run.findings) ? run.findings.length : 0;
            const sha = String(run.commitSha || '').slice(0, 12);
            ctx.notify(`[${run.id}] ${run.base} · ${fileCount} file${fileCount === 1 ? '' : 's'} · ${findingCount} finding${findingCount === 1 ? '' : 's'}${sha ? ` · ${sha}` : ''}`);
        }
        return true;
    } catch (error: any) {
        ctx.notify(error?.message || 'Failed to list review runs.');
        return true;
    }
}

export async function showReviewRun(ctx: ReviewHandlerContext, id: string | undefined): Promise<boolean> {
    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
        ctx.notify('Review run id is required. Usage: /review show <id>');
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify('Review is unavailable without app RPC.');
        return true;
    }
    const sessionId = ctx.state.sessionId;
    try {
        const result = await ctx.appRpc.request('review.get', { sessionId, id: resolvedId });
        const run = result?.run;
        if (!run) {
            ctx.notify(`Review run "${resolvedId}" was not found.`);
            return true;
        }
        const findings = Array.isArray(run.findings) ? run.findings : [];
        if (!findings.length) {
            ctx.notify(`Review run "${resolvedId}" (${run.base}) has no findings.`);
            return true;
        }
        ctx.notify(`Review run "${resolvedId}" (${run.base}) · ${findings.length} finding${findings.length === 1 ? '' : 's'}:`);
        for (const finding of findings) {
            const category = String(finding?.category || 'suggestion');
            const severity = String(finding?.severity || 'info');
            const file = String(finding?.anchor?.file || '?');
            const line = typeof finding?.anchor?.line === 'number' ? `:${finding.anchor.line}` : '';
            ctx.notify(`[${category}/${severity}] ${file}${line} ${String(finding?.summary || '')}`);
            if (String(finding?.suggestion || '').trim()) {
                ctx.notify(`  fix: ${String(finding.suggestion).trim()}`);
            }
        }
        return true;
    } catch (error: any) {
        ctx.notify(error?.message || `Failed to load review run "${resolvedId}".`);
        return true;
    }
}

export async function openWorktreeDiff(ctx: ReviewHandlerContext, args?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify('Worktree diff is unavailable without app RPC.');
        return true;
    }
    const parsed = parseWorktreeDiffArgs(args);
    if (parsed.error) {
        ctx.notify(parsed.error);
        return true;
    }
    const sessionId = ctx.state.sessionId;
    let review: Record<string, any> | null = null;
    try {
        await ctx.activateToolForSession('review_diff', sessionId);
        const result = await ctx.appRpc.request('review.diff', {
            sessionId,
            scope: parsed.scope,
            ...(parsed.paths.length ? { paths: parsed.paths } : {})
        });
        review = result?.review && typeof result.review === 'object' ? result.review : null;
    } catch (error: any) {
        ctx.notify(error?.message || 'Failed to gather the worktree diff.');
        return true;
    }
    const files = Array.isArray(review?.files) ? review.files : [];
    if (!files.length) {
        ctx.notify(`No ${describeWorktreeDiffScope(parsed.scope)} changes.`);
        return true;
    }
    const label = describeWorktreeDiffScope(parsed.scope);
    const reviewTask = {
        id: `worktree-diff:${parsed.scope}`,
        title: `${label} diff`,
        sourceSessionId: sessionId,
        status: 'done',
        metadata: { reviewMode: 'worktree-diff', scope: parsed.scope, paths: parsed.paths }
    };
    ctx.state.setSessionsFocused(false);
    ctx.state.setTasksFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.openReview(reviewTask, { diff: String(review?.diff || '') || null });
    ctx.state.setNotice('');
    ctx.state.setLastError('');
    ctx.notify(`${label} diff: ${files.length} file${files.length === 1 ? '' : 's'} changed.`);
    return true;
}
