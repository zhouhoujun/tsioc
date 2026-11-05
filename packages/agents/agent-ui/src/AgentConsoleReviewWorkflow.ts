import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { ReviewHandlerContext } from './AgentConsoleReviewHandlers';

function emitReviewBlock(ctx: ReviewHandlerContext, lines: string[]): void {
    const text = lines.filter(line => String(line ?? '').trim().length > 0).join('\n');
    if (text) {
        ctx.notify(text);
    }
}

/**
 * Review / git-diff command handlers for AgentConsoleComponent.
 *
 * Extracted verbatim from the component (P197 batch A): every function keeps
 * the original logic and only receives its component dependencies through a
 * minimal structural context (`ReviewHandlerContext`).
 */

// ── Review handler context ───────────────────────────────────────────────────

export function parseWorktreeDiffArgs(args?: string, translator?: AgentUiTranslator | null): {
    scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked';
    paths: string[];
    error?: string;
} {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const flags = tokens.filter(token => token === '--staged' || token === '--unstaged' || token === '--untracked');
    if (flags.length > 1) {
        return { scope: 'working-tree', paths: [], error: formatAgentUiNotice(translator, 'diffScopeUsage') };
    }
    const unknownFlag = tokens.find(token => token.startsWith('--') && !flags.some(flag => flag === token));
    if (unknownFlag) {
        return { scope: 'working-tree', paths: [], error: formatAgentUiNotice(translator, 'diffUnknownOption', { flag: unknownFlag }) };
    }
    const scope = flags[0] ? flags[0].slice(2) as 'staged' | 'unstaged' | 'untracked' : 'working-tree';
    return { scope, paths: tokens.filter(token => !token.startsWith('--')) };
}

export function describeWorktreeDiffScope(
    scope: 'working-tree' | 'staged' | 'unstaged' | 'untracked',
    translator?: AgentUiTranslator | null
): string {
    const fallback = scope === 'working-tree' ? 'Working tree' : scope[0].toUpperCase() + scope.slice(1);
    const key = scope === 'working-tree' ? 'workingTree' : scope;
    return formatAgentUiLabel(translator, `agent.menu.diffScope.${key}`, fallback);
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
        return null;
    }
    try {
        await ctx.activateToolForSession('review_diff', sessionId);
    } catch {
        // Activation may fail when the tool is not registered; the diff
        // RPC below then surfaces the precise error.
    }
    try {
        const workdir = String(ctx.state.workspace || '').trim();
        const result = await ctx.appRpc.request('review.diff', { sessionId, base, ...(workdir ? { workdir } : {}) });
        if (!result || typeof result !== 'object' || !result.review) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'failedGatherGit', { base: base }));
            return null;
        }
        return result.review as Record<string, any>;
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'failedGatherGit', { base: base }));
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
        return null;
    }
    try {
        const result = await ctx.appRpc.request('review.save', { sessionId, run });
        return result?.run ?? result ?? null;
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'reviewRunSaveFailed'));
        return null;
    }
}

export async function openGitDiffReview(ctx: ReviewHandlerContext, base?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'changesReviewAgainst', { resolvedBase: resolvedBase }));
        return true;
    }
    openGitDiffReviewPanel(ctx, review, resolvedBase);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'gitDiffResolvedBase', { resolvedBase: resolvedBase, count: files.length, plural: files.length === 1 ? '' : 's' }));
    return true;
}

export async function runGitDiffReviewAnalysis(ctx: ReviewHandlerContext, base?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'changesReviewAgainst', { resolvedBase: resolvedBase }));
        return true;
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'runningReviewAnalysis', { resolvedBase: resolvedBase }));
    let content = '';
    try {
        const turn = await ctx.appRpc.request('run.turn', {
            sessionId,
            input: buildGitDiffReviewPrompt(resolvedBase, files, diff)
        });
        content = String(turn?.message?.content || '');
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'reviewAnalysisTurnFailed'));
        return true;
    }
    const findings = parseReviewFindingsFromText(content);
    if (!findings.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewProducedParseable'));
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewFindingsSaved', {
            findingCount: findings.length,
            plural: findings.length === 1 ? '' : 's',
            savedId: saved.id ? ` (${saved.id})` : ''
        }));
    }
    openGitDiffReviewPanel(ctx, review, resolvedBase);
    return true;
}

export async function listReviewFindings(ctx: ReviewHandlerContext, commit?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
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
            ctx.notify(commit ? formatAgentUiNotice(ctx.translator, 'noReviewRunsForCommit', { commit: commit }) : formatAgentUiNotice(ctx.translator, 'noReviewRunsSaved'));
            return true;
        }
        emitReviewBlock(ctx, runs.map((run: any) => {
            const fileCount = Array.isArray(run.files) ? run.files.length : 0;
            const findingCount = Array.isArray(run.findings) ? run.findings.length : 0;
            const sha = String(run.commitSha || '').slice(0, 12);
            return formatAgentUiNotice(ctx.translator, 'reviewRunSummary', {
                runId: run.id,
                base: run.base,
                fileCount,
                filePlural: fileCount === 1 ? '' : 's',
                findingCount,
                findingPlural: findingCount === 1 ? '' : 's',
                sha: sha ? ` · ${sha}` : ''
            });
        }));
        return true;
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'reviewRunsListFailed'));
        return true;
    }
}

export async function showReviewRun(ctx: ReviewHandlerContext, id: string | undefined): Promise<boolean> {
    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewIdRequired'));
        return true;
    }
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewUnavailableApp'));
        return true;
    }
    const sessionId = ctx.state.sessionId;
    try {
        const result = await ctx.appRpc.request('review.get', { sessionId, id: resolvedId });
        const run = result?.run;
        if (!run) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewRunNotFound', { resolvedId: resolvedId }));
            return true;
        }
        const findings = Array.isArray(run.findings) ? run.findings : [];
        if (!findings.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewRunNoFindings', { resolvedId: resolvedId, base: run.base }));
            return true;
        }
        const lines = [formatAgentUiNotice(ctx.translator, 'reviewRunFindingList', { resolvedId: resolvedId, base: run.base, findingCount: findings.length, plural: findings.length === 1 ? '' : 's' })];
        for (const finding of findings) {
            const category = String(finding?.category || 'suggestion');
            const severity = String(finding?.severity || 'info');
            const file = String(finding?.anchor?.file || '?');
            const line = typeof finding?.anchor?.line === 'number' ? `:${finding.anchor.line}` : '';
            lines.push(formatAgentUiNotice(ctx.translator, 'reviewFindingItem', { category: category, severity: severity, file: file, line: line, summary: String(finding?.summary || '') }));
            if (String(finding?.suggestion || '').trim()) {
                lines.push(formatAgentUiNotice(ctx.translator, 'reviewFixSuggestion', { suggestion: String(finding.suggestion).trim() }));
            }
        }
        emitReviewBlock(ctx, lines);
        return true;
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'reviewRunLoadFailed', { id: resolvedId }));
        return true;
    }
}

export async function openWorktreeDiff(ctx: ReviewHandlerContext, args?: string): Promise<boolean> {
    if (!ctx.appRpc) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeDiffUnavailable'));
        return true;
    }
    const parsed = parseWorktreeDiffArgs(args, ctx.translator);
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
            ...(String(ctx.state.workspace || '').trim() ? { workdir: String(ctx.state.workspace).trim() } : {}),
            scope: parsed.scope,
            ...(parsed.paths.length ? { paths: parsed.paths } : {})
        });
        review = result?.review && typeof result.review === 'object' ? result.review : null;
    } catch (error: any) {
        ctx.notify(error?.message || formatAgentUiNotice(ctx.translator, 'worktreeDiffFailed'));
        return true;
    }
    const files = Array.isArray(review?.files) ? review.files : [];
    if (!files.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'noChangesForScope', { scope: describeWorktreeDiffScope(parsed.scope, ctx.translator) }));
        return true;
    }
    const label = describeWorktreeDiffScope(parsed.scope, ctx.translator);
    const reviewTask = {
        id: `worktree-diff:${parsed.scope}`,
        title: formatAgentUiLabel(ctx.translator, 'agent.menu.diffScope.title', '{scope} diff', { scope: label }),
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
    ctx.notify(formatAgentUiNotice(ctx.translator, 'labelDiffCount', { label: label, count: files.length, plural: files.length === 1 ? '' : 's' }));
    return true;
}
