import type { AgentConsoleCommandOutputEntry, AgentConsoleSelectOption } from './AgentConsoleSessionState';
import {
    formatUsageSummary,
    formatCompactionHistoryRecord,
    formatCompactionHistoryTrend,
    formatTurnDiagnosticsAggregate,
    parseTrendArgs,
} from './AgentConsoleFormatters';
import { formatAgentDiagLabel as diagLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

// ── Diagnostics handler context ──────────────────────────────────────────────

export interface DiagnosticsHandlerContext {
    translator?: AgentUiTranslator | null;
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
        ctx.notify(formatAgentUiNotice(ctx.translator, 'compactionHistoryUnavailable'));
        return true;
    }
    const sessionId = args.trim() || ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionSelectedCompactions'));
        return true;
    }
    const records = await ctx.sessionService.listCompactionHistory(sessionId);
    if (!records.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'noCompactionHistoryForSession', { sessionId: sessionId }));
        return true;
    }
    ctx.pushCommandOutput(
        '/compactions',
        records
            .map(record => formatCompactionHistoryRecord(record, ctx.translator))
            .join(' | ')
    );
    return true;
}

export async function openCompactionHistoryTrend(
    ctx: DiagnosticsHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'compactionHistoryUnavailable'));
        return true;
    }
    const { sessionId, bucketSize, maxBuckets } = parseTrendArgs(args);
    const trend = await ctx.sessionService.getCompactionHistoryTrend(sessionId, { bucketSize, maxBuckets });
    if (!trend.length) {
        ctx.notify(
            sessionId
                ? formatAgentUiNotice(ctx.translator, 'noCompactionHistoryTrendForSession', { sessionId: sessionId })
                : formatAgentUiNotice(ctx.translator, 'noCompactionHistory')
        );
        return true;
    }
    const lines = formatCompactionHistoryTrend(trend, ctx.translator);
    ctx.pushCommandOutput('/compactions trend', lines.join('\n'));
    return true;
}

// ── Turn diagnostics ─────────────────────────────────────────────────────────

export async function openTurnDiagnostics(
    ctx: DiagnosticsHandlerContext,
    sessionId?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'turnDiagnosticsUnavailable'));
        return true;
    }
    const aggregate = await ctx.sessionService.getTurnDiagnosticsStats(sessionId);
    if (!aggregate || !Number(aggregate.totalTurns)) {
        ctx.notify(
            sessionId
                ? formatAgentUiNotice(ctx.translator, 'noTurnDiagnosticsForSession', { sessionId: sessionId })
                : formatAgentUiNotice(ctx.translator, 'noTurnDiagnostics')
        );
        return true;
    }
    ctx.pushCommandOutput('/diagnostics', formatTurnDiagnosticsAggregate(aggregate, sessionId, ctx.translator));
    return true;
}

export async function openUsage(
    ctx: DiagnosticsHandlerContext,
    input?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'unavailableSessionAccess'));
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
                ? formatAgentUiNotice(ctx.translator, 'noUsageForSession', { sessionId: sessionId })
                : formatAgentUiNotice(ctx.translator, 'noUsage')
        );
        return true;
    }
    ctx.pushCommandOutput('/usage', formatUsageSummary(usage, ctx.translator));
    return true;
}

// ── Harness audit / profile ──────────────────────────────────────────────────

export async function openHarnessAudit(
    ctx: DiagnosticsHandlerContext,
    sessionId?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessAuditUnavailable'));
        return true;
    }
    const report = await ctx.sessionService.runHarnessAudit(sessionId);
    if (!report || report.empty === true) {
        ctx.notify(
            sessionId
                ? formatAgentUiNotice(ctx.translator, 'noHarnessFailuresForSession', { sessionId: sessionId })
                : formatAgentUiNotice(ctx.translator, 'noHarnessFailures')
        );
        return true;
    }
    const lines: string[] = [];
    const t = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(ctx.translator, 'harness', key, fallback, params);
    const scope = report.scopedSessionIds
        ? report.scopedSessionIds.map((id: string) => (id.length > 16 ? `${id.slice(0, 14)}…` : id)).join(',')
        : t('allSessions', 'all sessions');
    lines.push(t('auditSummary', 'harness audit · {scope} · {turns} turns · {attempts} tool attempts · fail-turn {rate}%', {
        scope: scope, turns: Number(report.totalTurns ?? 0), attempts: Number(report.totalToolAttempts ?? 0), rate: Number(report.failureTurnRate ?? 0)
    }));
    for (const stat of report.topFailingTools ?? []) {
        lines.push(t('auditTool', 'tool {name} · {failures}/{attempts} ({rate}%) · falsified {falsified}', {
            name: stat.toolName, failures: stat.failures, attempts: stat.attempts, rate: Number(stat.failureRate ?? 0), falsified: Number(stat.falsifiedCount ?? 0)
        }));
    }
    for (const cluster of report.errorClusters ?? []) {
        lines.push(t('auditCluster', 'cluster {signature} · x{count} · tools {tools}{policy}', {
            signature: cluster.signature, count: cluster.count, tools: (cluster.toolNames ?? []).join(','),
            policy: cluster.suggestedPolicy ? ` · ${cluster.suggestedPolicy}` : ''
        }));
    }
    for (const falsified of report.falsifiedDistribution ?? []) {
        lines.push(t('auditFalsified', 'falsified {name} · {count} ({rate}%)', {
            name: falsified.toolName, count: falsified.falsifiedCount, rate: Number(falsified.falsifiedRate ?? 0)
        }));
    }
    for (const suggestion of report.suggestions ?? []) {
        lines.push(t('auditSuggestion', 'suggest[{kind}]{tool} · {message}', {
            kind: suggestion.kind, tool: suggestion.toolName ? ` ${suggestion.toolName}` : '', message: suggestion.message
        }));
    }
    ctx.pushCommandOutput('/harness audit', lines.join('\n'));
    return true;
}

export async function openHarnessProfile(
    ctx: DiagnosticsHandlerContext,
    sub?: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessProfileUnavailable'));
        return true;
    }
    const arg = (sub ?? '').trim();
    const t = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(ctx.translator, 'harness', key, fallback, params);
    if (arg === 'list' || arg === '' || arg === 'default') {
        const result = await ctx.sessionService.listHarnessProfiles();
        const lines: string[] = [];
        const active = result.current;
        lines.push(active
            ? t('profilesActive', "harness profiles · active '{name}'", { name: active })
            : t('profilesDefault', 'harness profiles · default'));
        for (const profile of result.profiles ?? []) {
            const granular = (profile.granularCategories ?? []).length
                ? t('profileGranular', ' · granular {categories}', { categories: (profile.granularCategories ?? []).join(',') })
                : '';
            lines.push(t('profileRow', 'profile {name} · v{version}{repair}{loopRecover}{sandbox}{granular}', {
                name: profile.name, version: profile.version,
                repair: profile.maxRepairRounds !== undefined ? t('profileRepair', ' · repair {rounds}', { rounds: profile.maxRepairRounds }) : '',
                loopRecover: profile.maxLoopRecoveries !== undefined ? t('profileLoopRecover', ' · loop-recover {count}', { count: profile.maxLoopRecoveries }) : '',
                sandbox: profile.sandbox?.mode ? t('profileSandbox', ' · sandbox {mode}', { mode: profile.sandbox.mode }) : '',
                granular: granular
            }));
        }
        ctx.pushCommandOutput('/harness profile list', lines.join('\n'));
        return true;
    }
    if (arg === 'current') {
        const profile = await ctx.sessionService.currentHarnessProfile();
        if (!profile) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessProfileResolved'));
            return true;
        }
        const lines: string[] = [];
        lines.push(t('currentHeader', 'harness profile {name} · v{version}', { name: profile.name, version: profile.version }));
        for (const rule of profile.requireApproval ?? []) {
            const category = typeof rule === 'string' ? rule : `${rule.category}${rule.names?.length ? `:${rule.names.join(',')}` : ''}${rule.mode ? `[${rule.mode}]` : ''}`;
            lines.push(t('approval', 'approval {category}', { category: category }));
        }
        if (profile.sandbox?.mode) {
            lines.push(t('sandboxLine', 'sandbox {mode}{allow}', {
                mode: profile.sandbox.mode,
                allow: profile.sandbox.networkAllowlist?.length
                    ? t('sandboxAllow', ' · allow {list}', { list: profile.sandbox.networkAllowlist.join(',') })
                    : ''
            }));
        }
        if (profile.maxRepairRounds !== undefined) {
            lines.push(t('maxRepairRounds', 'maxRepairRounds {value}', { value: profile.maxRepairRounds }));
        }
        if (profile.maxLoopRecoveries !== undefined) {
            lines.push(t('maxLoopRecoveries', 'maxLoopRecoveries {value}', { value: profile.maxLoopRecoveries }));
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
            ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessProfileDiff'));
            return true;
        }
        if (result.error) {
            ctx.notify(result.error);
            return true;
        }
        const diffLines = (result.diff ?? []).length
            ? (result.diff ?? []).map((line: string) => `  ${line}`)
            : [t('noDifferences', '  (no differences)')];
        ctx.pushCommandOutput('/harness profile diff', `${t('diffTitle', 'harness profile diff {from} → {to}', { from: result.from, to: result.to })}\n${diffLines.join('\n')}`);
        return true;
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessProfileUsage'));
    return true;
}
