import type { AgentConsoleCommandOutputEntry, AgentConsoleSelectOption } from './AgentConsoleSessionState';
import {
    formatSummaryQualityAggregate,
    formatUsageSummary,
    formatCompactionHistoryRecord,
    formatCompactionHistoryTrend,
    formatTurnDiagnosticsAggregate,
    formatTurnDiagnosticsTrend,
    buildSummaryQualityRecordOption,
    buildTurnDiagnosticsRecordOption,
    parseTrendArgs,
} from './AgentConsoleFormatters';

// ── Diagnostics handler context ──────────────────────────────────────────────

export interface DiagnosticsHandlerContext {
    state: {
        sessionId: string;
    };
    sessionService: {
        listSummaryQuality(options: { provider?: string; limit?: number }): Promise<any[]>;
        getSummaryQualityStats(provider?: string): Promise<any[]>;
        listSummaryQualityRecords(sessionId: string): Promise<any[]>;
        getSummaryQualityAggregate(sessionId?: string): Promise<Record<string, any>>;
        listTurnDiagnosticsRecords(sessionId: string): Promise<any[]>;
        getTurnDiagnosticsStats(sessionId?: string): Promise<any>;
        listCompactionHistory(sessionId: string): Promise<any[]>;
        getCompactionHistoryAggregate(sessionId?: string): Promise<Record<string, any>>;
        listCompactionHistoryTrend(options: { sessionId?: string; bucketSize?: number; maxBuckets?: number }): Promise<any[]>;
        getCompactionHistoryTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }): Promise<any[]>;
        listTurnDiagnosticsTrend(options: { sessionId?: string; bucketSize?: number; maxBuckets?: number }): Promise<any[]>;
        getUsageStats(sessionId?: string, options?: { range?: string; since?: string }): Promise<Record<string, any>>;
        runHarnessAudit(sessionId?: string): Promise<any>;
        listHarnessProfiles(): Promise<{ current?: string; profiles: any[] }>;
        currentHarnessProfile(): Promise<any>;
        diffHarnessProfiles(from: string, to: string): Promise<any>;
        getSummaryQualityTrend(options: { provider?: string; bucketSize?: number; maxBuckets?: number }): Promise<any[]>;
    };
    notify: (msg: string, duration?: number) => void;
    pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => void;
    select: (title: string, options: AgentConsoleSelectOption[], footer?: string) => Promise<string | undefined>;
}

// ── Compaction history ───────────────────────────────────────────────────────

export async function openCompactionHistory(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Compaction history is unavailable without app RPC.');
        return true;
    }
    const sessionId = args.trim() || ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify('No session selected. Run /compactions <sessionId>.');
        return true;
    }
    const records = await ctx.sessionService.listCompactionHistory(sessionId);
    if (!records.length) {
        ctx.notify(`No compaction history recorded for session '${sessionId}'.`);
        return true;
    }
    ctx.pushCommandOutput(
        '/compactions',
        records
            .map(record => formatCompactionHistoryRecord(record))
            .join(' | ')
    );
    return true;
}

export async function openCompactionHistoryTrend(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Compaction history is unavailable without app RPC.');
        return true;
    }
    const { sessionId, bucketSize, maxBuckets } = parseTrendArgs(args);
    const trend = await ctx.sessionService.getCompactionHistoryTrend(sessionId, { bucketSize, maxBuckets });
    if (!trend.length) {
        ctx.notify(
            sessionId
                ? `No compaction history trend recorded for session '${sessionId}'.`
                : 'No compaction history trend recorded yet.'
        );
        return true;
    }
    const lines = formatCompactionHistoryTrend(trend);
    ctx.pushCommandOutput('/compactions trend', lines.join('\n'));
    return true;
}

// ── Turn diagnostics ─────────────────────────────────────────────────────────

export async function openTurnDiagnostics(
    ctx: DiagnosticsHandlerContext,
    sessionId?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Turn diagnostics are unavailable without app RPC.');
        return true;
    }
    const aggregate = await ctx.sessionService.getTurnDiagnosticsStats(sessionId);
    if (!aggregate || !Number(aggregate.totalTurns)) {
        ctx.notify(
            sessionId
                ? `No turn diagnostics recorded for session '${sessionId}'.`
                : 'No turn diagnostics recorded yet.'
        );
        return true;
    }
    ctx.pushCommandOutput('/diagnostics', formatTurnDiagnosticsAggregate(aggregate, sessionId));
    return true;
}

export async function openTurnDiagnosticsList(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Turn diagnostics are unavailable without app RPC.');
        return true;
    }
    const sessionId = args.trim() || ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify('No session selected. Run /diagnostics list <sessionId>.');
        return true;
    }
    const records = await ctx.sessionService.listTurnDiagnosticsRecords(sessionId);
    if (!records.length) {
        ctx.notify(`No turn diagnostics recorded for session '${sessionId}'.`);
        return true;
    }
    const options = records.map(record => buildTurnDiagnosticsRecordOption(record));
    const selected = await ctx.select('Turn diagnostics records', options, 'Select a record to view details. Press Esc to close.');
    if (!selected) {
        return true;
    }
    const record = records.find(r => String(r.id ?? '') === selected || `${r.sessionId}:${r.totalTurns}` === selected);
    if (record) {
        ctx.pushCommandOutput(
            '/diagnostics list',
            [
                `Record: ${record.id ?? '-'}`,
                `Session: ${record.sessionId ?? 'unknown'}`,
                `Turns: ${record.totalTurns ?? 0}`,
                `Empty response rate: ${Number(record.emptyResponseRate ?? 0).toFixed(1)}%`,
                `Repeated question rate: ${Number(record.repeatedQuestionRate ?? 0).toFixed(1)}%`,
                `Token savings: ${record.totalTokenSavings ?? 0}`,
                record.createdAt ? `Created: ${new Date(record.createdAt).toLocaleString()}` : ''
            ].filter(Boolean).join('\n')
        );
    }
    return true;
}

export async function openTurnDiagnosticsTrend(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Turn diagnostics are unavailable without app RPC.');
        return true;
    }
    const { sessionId, bucketSize, maxBuckets } = parseTrendArgs(args);
    const trend = await ctx.sessionService.listTurnDiagnosticsTrend({ sessionId, bucketSize, maxBuckets });
    if (!trend.length) {
        ctx.notify('No turn diagnostics trend data recorded yet.');
        return true;
    }
    const lines = formatTurnDiagnosticsTrend(trend);
    ctx.pushCommandOutput('/diagnostics trend', lines.join('\n'));
    return true;
}

// ── Usage ────────────────────────────────────────────────────────────────────

export async function openUsage(
    ctx: DiagnosticsHandlerContext,
    input?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Usage is unavailable without session access.');
        return true;
    }
    const args = String(input || '').trim().split(/\s+/).filter(Boolean);
    const first = args[0];
    const range = first === 'daily' || first === 'weekly' || first === 'cumulative' ? first : undefined;
    const sessionId = range ? args[1] : first;
    const since = range ? args[2] : args[1];
    const usage = await ctx.sessionService.getUsageStats(sessionId, { ...(range ? { range } : {}), ...(since ? { since } : {}) });
    const totalTurns = Number(usage?.cumulative?.turns ?? 0);
    const totalTokens = Number(usage?.cumulative?.totalTokens ?? 0);
    if (!totalTurns && !totalTokens) {
        ctx.notify(
            sessionId
                ? `No usage recorded for session '${sessionId}'.`
                : 'No usage recorded yet.'
        );
        return true;
    }
    ctx.pushCommandOutput('/usage', formatUsageSummary(usage));
    return true;
}

// ── Harness audit / profile ──────────────────────────────────────────────────

export async function openHarnessAudit(
    ctx: DiagnosticsHandlerContext,
    sessionId?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Harness audit is unavailable without app RPC.');
        return true;
    }
    const report = await ctx.sessionService.runHarnessAudit(sessionId);
    if (!report || report.empty === true) {
        ctx.notify(
            sessionId
                ? `No harness failure data recorded for session '${sessionId}'.`
                : 'No harness failure data recorded yet.'
        );
        return true;
    }
    const lines: string[] = [];
    const scope = report.scopedSessionIds
        ? report.scopedSessionIds.map((id: string) => (id.length > 16 ? `${id.slice(0, 14)}…` : id)).join(',')
        : 'all sessions';
    lines.push(`harness audit · ${scope} · ${Number(report.totalTurns ?? 0)} turns · ${Number(report.totalToolAttempts ?? 0)} tool attempts · fail-turn ${Number(report.failureTurnRate ?? 0)}%`);
    for (const stat of report.topFailingTools ?? []) {
        lines.push(`tool ${stat.toolName} · ${stat.failures}/${stat.attempts} (${Number(stat.failureRate ?? 0)}%) · falsified ${Number(stat.falsifiedCount ?? 0)}`);
    }
    for (const cluster of report.errorClusters ?? []) {
        lines.push(`cluster ${cluster.signature} · x${cluster.count} · tools ${(cluster.toolNames ?? []).join(',')}${cluster.suggestedPolicy ? ` · ${cluster.suggestedPolicy}` : ''}`);
    }
    for (const falsified of report.falsifiedDistribution ?? []) {
        lines.push(`falsified ${falsified.toolName} · ${falsified.falsifiedCount} (${Number(falsified.falsifiedRate ?? 0)}%)`);
    }
    for (const suggestion of report.suggestions ?? []) {
        lines.push(`suggest[${suggestion.kind}]${suggestion.toolName ? ` ${suggestion.toolName}` : ''} · ${suggestion.message}`);
    }
    ctx.pushCommandOutput('/harness audit', lines.join('\n'));
    return true;
}

export async function openHarnessProfile(
    ctx: DiagnosticsHandlerContext,
    sub?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Harness profile is unavailable without app RPC.');
        return true;
    }
    const arg = (sub ?? '').trim();
    if (arg === 'list' || arg === '' || arg === 'default') {
        const result = await ctx.sessionService.listHarnessProfiles();
        const lines: string[] = [];
        const active = result.current;
        lines.push(`harness profiles${active ? ` · active '${active}'` : ' · default'}`);
        for (const profile of result.profiles ?? []) {
            const granular = (profile.granularCategories ?? []).length
                ? ` · granular ${(profile.granularCategories ?? []).join(',')}`
                : '';
            lines.push(`profile ${profile.name} · v${profile.version}${profile.maxRepairRounds !== undefined ? ` · repair ${profile.maxRepairRounds}` : ''}${profile.maxLoopRecoveries !== undefined ? ` · loop-recover ${profile.maxLoopRecoveries}` : ''}${profile.sandbox?.mode ? ` · sandbox ${profile.sandbox.mode}` : ''}${granular}`);
        }
        ctx.pushCommandOutput('/harness profile list', lines.join('\n'));
        return true;
    }
    if (arg === 'current') {
        const profile = await ctx.sessionService.currentHarnessProfile();
        if (!profile) {
            ctx.notify('No harness profile resolved.');
            return true;
        }
        const lines: string[] = [];
        lines.push(`harness profile ${profile.name} · v${profile.version}`);
        for (const rule of profile.requireApproval ?? []) {
            const category = typeof rule === 'string' ? rule : `${rule.category}${rule.names?.length ? `:${rule.names.join(',')}` : ''}${rule.mode ? `[${rule.mode}]` : ''}`;
            lines.push(`approval ${category}`);
        }
        if (profile.sandbox) {
            lines.push(`sandbox ${profile.sandbox.mode}${profile.sandbox.networkAllowlist?.length ? ` · allow ${profile.sandbox.networkAllowlist.join(',')}` : ''}`);
        }
        if (profile.maxRepairRounds !== undefined) {
            lines.push(`maxRepairRounds ${profile.maxRepairRounds}`);
        }
        if (profile.maxLoopRecoveries !== undefined) {
            lines.push(`maxLoopRecoveries ${profile.maxLoopRecoveries}`);
        }
        ctx.pushCommandOutput('/harness profile current', lines.join('\n'));
        return true;
    }
    if (arg.startsWith('diff')) {
        const parts = arg.slice(4).trim().split(/\s+/).filter(Boolean);
        const from = parts[0] || 'default';
        const to = parts[1] || 'current';
        const result = await ctx.sessionService.diffHarnessProfiles(from, to);
        if (!result) {
            ctx.notify('Harness profile diff is unavailable.');
            return true;
        }
        if (result.error) {
            ctx.notify(result.error);
            return true;
        }
        const diffLines = (result.diff ?? []).length
            ? (result.diff ?? []).map((line: string) => `  ${line}`)
            : ['  (no differences)'];
        ctx.pushCommandOutput('/harness profile diff', `harness profile diff ${result.from} → ${result.to}\n${diffLines.join('\n')}`);
        return true;
    }
    ctx.notify('Usage: /harness profile [list|current|diff <from> <to>]');
    return true;
}

// ── Summary quality ──────────────────────────────────────────────────────────

export async function openSummaryQualityRecords(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Summary quality is unavailable without app RPC.');
        return true;
    }
    const sessionId = args.trim() || ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify('No session selected. Run /quality list <sessionId>.');
        return true;
    }
    const records = await ctx.sessionService.listSummaryQualityRecords(sessionId);
    if (!records.length) {
        ctx.notify(`No summary quality records for session '${sessionId}'.`);
        return true;
    }
    const options = records.map(record => buildSummaryQualityRecordOption(record));
    const selected = await ctx.select('Summary quality records', options, 'Select a record to view details. Press Esc to close.');
    if (!selected) {
        return true;
    }
    const record = records.find(r => String(r.id ?? '') === selected);
    if (record) {
        ctx.pushCommandOutput(
            '/quality list',
            [
                `Record: ${record.id ?? '-'}`,
                `Provider: ${record.provider ?? 'unknown'}`,
                `Model: ${record.model ?? 'unknown'}`,
                `Total: ${record.total ?? 0}`,
                `Fields: ${Number(record.fieldCompleteness ?? 0)}`,
                `Annotation: ${Number(record.annotationQuality ?? 0)}`,
                `Length: ${Number(record.lengthBalance ?? 0)}`,
                `Truncation: ${Number(record.truncationScore ?? 0)}`,
                record.evidenceCoverage != null ? `Evidence coverage: ${Number(record.evidenceCoverage).toFixed(1)}%` : '',
                `Fallback: ${record.fallbackUsed ? 'yes' : 'no'}`,
                `Summary length: ${record.summaryLength ?? 0}`,
                record.createdAt ? `Created: ${new Date(record.createdAt).toLocaleString()}` : ''
            ].filter(Boolean).join('\n')
        );
    }
    return true;
}

export async function openSummaryQualityTrend(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Summary quality is unavailable without app RPC.');
        return true;
    }
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const provider = tokens[0] || undefined;
    let bucketSize: number | undefined;
    let maxBuckets: number | undefined;
    const dayToken = tokens[1]?.match(/^(\d+)d$/i);
    if (dayToken) {
        const days = Number(dayToken[1]);
        if (Number.isFinite(days) && days > 0) {
            bucketSize = days * 24 * 60 * 60 * 1000;
        }
    } else if (tokens[1] && /^\d+$/.test(tokens[1])) {
        const value = Number(tokens[1]);
        if (Number.isFinite(value) && value > 0) {
            bucketSize = value;
        }
    }
    if (tokens[2] && /^\d+$/.test(tokens[2])) {
        const value = Number(tokens[2]);
        if (Number.isFinite(value) && value > 0) {
            maxBuckets = value;
        }
    }
    const aggregate = await ctx.sessionService.getSummaryQualityAggregate(provider);
    if (!aggregate || !Number(aggregate.recordCount)) {
        ctx.notify('No summary quality records found.');
        return true;
    }
    ctx.pushCommandOutput('/quality trend', formatSummaryQualityAggregate(aggregate));
    return true;
}
