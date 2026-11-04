import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice } from './agent-ui.i18n';

export async function handleQuality(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const arg = args?.trim() || '';
    if (arg === 'list' || arg.startsWith('list ')) {
        const provider = arg.slice(4).trim() || undefined;
        return ctx.openSummaryQualityRecords(provider);
    }
    if (arg === 'trend' || arg.startsWith('trend ')) {
        const { provider, bucketSize, maxBuckets } = ctx.parseSummaryQualityTrendArgs(arg.slice(5));
        return ctx.openSummaryQualityTrend(provider, bucketSize, maxBuckets);
    }
    const provider = arg || undefined;
    const aggregates = ctx.sessionService
        ? await ctx.sessionService.getSummaryQualityStats(provider)
        : [];
    if (!aggregates.length) {
        ctx.notify(
            provider
                ? formatAgentUiNotice(ctx.translator, 'noSummaryQualityStatsForProvider', { provider: provider })
                : formatAgentUiNotice(ctx.translator, 'noSummaryQualityStats')
        );
        return true;
    }
    ctx.notify(
        aggregates
            .map(item => ctx.formatSummaryQualityAggregate(item))
            .join(' | ')
    );
    return true;
}

// ── /compactions ─────────────────────────────────────────────────────────────

export async function handleCompactions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseCompactionHistoryTrendArgs(arg.slice(5));
            return ctx.openCompactionHistoryTrend(sessionId, bucketSize, maxBuckets);
        }
    }
    return ctx.openCompactionHistory(args);
}

// ── /compact ─────────────────────────────────────────────────────────────────

export async function handleCompact(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const reason = args?.trim() || undefined;
    const result = await ctx.sessionService?.compactSession(ctx.state.sessionId, reason) ?? { compacted: false };
    if (result.error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'compactionFailed', { error: result.error }));
        return true;
    }
    if (!result.compacted) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'nothingCompactHistory'));
        return true;
    }
    const summary = typeof result.summary === 'string' && result.summary.trim()
        ? ` · ${result.summary.trim()}`
        : '';
    const before = typeof result.beforeMessageCount === 'number' ? result.beforeMessageCount : 0;
    const after = typeof result.afterMessageCount === 'number' ? result.afterMessageCount : 0;
    const ratio = typeof result.compressionRatio === 'number' ? `${result.compressionRatio}%` : 'n/a';
    ctx.notify(formatAgentUiNotice(ctx.translator, 'compactedMessagesTokens', { before: before, after: after, ratio: ratio, summary: summary }));
    return true;
}

// ── /diagnostics ─────────────────────────────────────────────────────────────

export async function handleDiagnostics(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseTurnDiagnosticsTrendArgs(arg.slice(5));
            return ctx.openTurnDiagnosticsTrend(sessionId, bucketSize, maxBuckets);
        }
        if (arg === 'list' || arg.startsWith('list ')) {
            const sessionId = arg.slice(4).trim() || undefined;
            return ctx.openTurnDiagnosticsList(sessionId);
        }
        const sessionId = arg || undefined;
        return ctx.openTurnDiagnostics(sessionId);
    }
}

// ── /delegation ──────────────────────────────────────────────────────────────

export async function handleDelegation(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'tree' || arg.startsWith('tree ')) {
            const rest = arg.slice(4).trim();
            const tokens = rest.split(/\s+/).filter(Boolean);
            const sessionId = tokens[0];
            const status = tokens[1];
            const depthRaw = tokens[2] !== undefined && /^\d+$/.test(tokens[2]) ? parseInt(tokens[2], 10) : undefined;
            return ctx.openDelegationTree(sessionId, status, depthRaw);
        }
        if (arg === 'lineage' || arg.startsWith('lineage ')) {
            return ctx.openDelegationLineage(arg.slice(7).trim() || undefined);
        }
        if (arg === 'mode' || arg.startsWith('mode ')) {
            await ctx.runDelegationModeCommand(arg.slice(4).trim());
            return true;
        }
        return ctx.openDelegationList(arg || undefined);
    }
}

// ── /harness ─────────────────────────────────────────────────────────────────

export async function handleHarness(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'audit' || arg.startsWith('audit ')) {
            const sessionId = arg.slice(5).trim() || undefined;
            return ctx.openHarnessAudit(sessionId);
        }
        if (arg === 'profile' || arg.startsWith('profile ')) {
            return ctx.openHarnessProfile(arg.slice(7).trim() || undefined);
        }
        if (arg === 'tree' || arg.startsWith('tree ')) {
            return ctx.openHarnessTree(arg.slice(4).trim() || undefined);
        }
        if (arg === 'list' || arg.startsWith('list ')) {
            return ctx.openHarnessList(arg.slice(4).trim() || undefined);
        }
        if (arg === 'stop' || arg.startsWith('stop ')) {
            const taskId = arg.slice(4).trim();
            if (!taskId) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessStopUsage'));
                return true;
            }
            return ctx.runHarnessStopCommand(taskId);
        }
        ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessUsage'));
        return true;
    }
}

// ── /git-snapshots (alias for /snapshots with guard) ─────────────────────────

