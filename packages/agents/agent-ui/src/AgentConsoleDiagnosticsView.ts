import { formatCompactNumber } from '@tsdi/core';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { formatCompactionHistoryAggregate, formatSummaryQualityAggregate, formatTurnDiagnosticsAggregate, formatTurnDiagnosticsTrend, formatUsageSummary, buildSummaryQualityRecordOption } from './AgentConsoleFormatters';

export interface AgentConsoleDigestState {
    setUsageDigest(value: string): void;
    setSummaryQualityDigest(value: string): void;
    setCompactionDigest(value: string): void;
    setTurnDiagnosticsDigest(value: string): void;
}

export async function refreshUsageDigest(sessionService: any, state: AgentConsoleDigestState): Promise<void> {
    if (!sessionService) {
        state.setUsageDigest('');
        return;
    }
    try {
        const usage = await sessionService.getUsageStats();
        const totalTurns = Number(usage?.cumulative?.turns ?? 0);
        const totalTokens = Number(usage?.cumulative?.totalTokens ?? 0);
        if (!totalTurns && !totalTokens) {
            state.setUsageDigest('');
            return;
        }
        state.setUsageDigest(formatUsageSummary(usage));
    } catch {
        state.setUsageDigest('');
    }
}

export async function refreshSummaryQualityDigest(sessionService: any, state: AgentConsoleDigestState): Promise<void> {
    if (!sessionService) {
        state.setSummaryQualityDigest('');
        return;
    }
    try {
        const aggregates = await sessionService.getSummaryQualityStats();
        if (!aggregates.length) {
            state.setSummaryQualityDigest('');
            return;
        }
        state.setSummaryQualityDigest(
            aggregates
                .map((item: Record<string, any>) => formatSummaryQualityAggregate(item))
                .join(' | ')
        );
    } catch {
        state.setSummaryQualityDigest('');
    }
}

export async function refreshCompactionDigest(sessionService: any, state: AgentConsoleDigestState): Promise<void> {
    if (!sessionService) {
        state.setCompactionDigest('');
        return;
    }
    try {
        const aggregates = await sessionService.getCompactionHistoryStats();
        if (!aggregates.length) {
            state.setCompactionDigest('');
            return;
        }
        state.setCompactionDigest(
            aggregates
                .map((item: Record<string, any>) => formatCompactionHistoryAggregate(item))
                .join(' | ')
        );
    } catch {
        state.setCompactionDigest('');
    }
}

export function formatSummaryQualityTrend(trend: Array<Record<string, any>>): string[] {
    const byProvider = new Map<string, Array<Record<string, any>>>();
    for (const point of trend) {
        const provider = String(point.provider ?? 'unknown');
        const group = byProvider.get(provider) ?? [];
        group.push(point);
        byProvider.set(provider, group);
    }
    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const spark = (value: number): string => {
        const index = Math.min(7, Math.max(0, Math.floor((Number(value) || 0) / 100 * 8)));
        return sparkChars[index];
    };
    const lines: string[] = [];
    for (const [provider, points] of byProvider) {
        const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
        const totals = sorted.map(point => Number(point.avgTotal ?? 0));
        const avgTotal = totals.length
            ? (totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(1)
            : '0.0';
        const fallbackRate = totals.length
            ? (sorted.reduce((sum, point) => sum + Number(point.fallbackRate ?? 0), 0) / sorted.length).toFixed(1)
            : '0.0';
        const evidenceCoverage = totals.length
            ? (sorted.reduce((sum, point) => sum + Number(point.avgEvidenceCoverage ?? 0), 0) / sorted.length).toFixed(1)
            : '0.0';
        const from = Number(sorted[0]?.bucketStart ?? 0);
        const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        lines.push(`${provider} ${sorted.map(point => spark(Number(point.avgTotal ?? 0))).join('')} (${sorted.length}d${range} · avg ${avgTotal} · fb ${fallbackRate}% · evidence ${evidenceCoverage}%)`);
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

export function buildTurnDiagnosticsRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const sessionId = String(record.sessionId ?? 'unknown');
    const createdAt = Number(record.createdAt ?? 0);
    const compacted = Number(record.compactionCount ?? 0);
    const saved = Number(record.totalTokenSavings ?? 0);
    const description = [
        createdAt ? new Date(createdAt).toLocaleDateString() : '',
        `${compacted} compact${compacted === 1 ? '' : 's'}`,
        saved > 0 ? `saved ${formatCompactNumber(saved)} tokens` : '',
        record.repeatedClarificationDetected ? 'repeated' : '',
        record.finalAssistantWasClarification ? 'clarif' : ''
    ].filter(Boolean).join(' · ') || 'turn diagnostics record';
    return {
        label: `${sessionId} · ${createdAt ? new Date(createdAt).toLocaleString() : 'unknown time'}`,
        value: id || `${sessionId}:${createdAt}`,
        description,
        detail: [
            `Record: ${id || '-'}`,
            `Session: ${sessionId}`,
            `Created: ${createdAt ? new Date(createdAt).toLocaleString() : '-'}`,
            `Empty response retries: ${Number(record.emptyResponseRetryCount ?? 0)}`,
            `Repeated clarification: ${record.repeatedClarificationDetected ? 'yes' : 'no'}`,
            `Final clarification: ${record.finalAssistantWasClarification ? 'yes' : 'no'}`,
            `Context rewritten: ${record.followUpContextRewritten ? 'yes' : 'no'}`,
            `Follow-up recoveries: ${Number(record.followUpRecoveryCount ?? 0)}`,
            `Compactions: ${compacted}`,
            `Token savings: ${formatCompactNumber(saved)}`,
            record.compressionRatio != null ? `Compression ratio: ${record.compressionRatio}%` : '',
            record.compactionLevel ? `Compaction level: ${record.compactionLevel}` : '',
            record.promptCache ? `Prompt cache: ${String(record.promptCache.provider ?? '')} ${String(record.promptCache.appliedStrategy ?? '')}` : ''
        ].filter(Boolean).join('\n')
    };
}

export function parseSummaryQualityTrendArgs(
    args: string
): { provider?: string; bucketSize?: number; maxBuckets?: number } {
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
    return { provider, bucketSize, maxBuckets };
}

export function parseCompactionHistoryTrendArgs(
    args: string
): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const sessionId = tokens[0] || undefined;
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
    return { sessionId, bucketSize, maxBuckets };
}

export async function runHarnessStopCommand(sessionService: any, notify: (message: string) => void, taskId: string): Promise<boolean> {
    if (!sessionService) {
        notify('Background task cancellation is unavailable without app RPC.');
        return true;
    }
    const id = (taskId || '').trim();
    if (!id) {
        notify('Usage: /harness stop <taskId>');
        return true;
    }
    const result = await sessionService.cancelBackgroundTasks([id]);
    const cancelled = result?.cancelled ?? [];
    if (cancelled.includes(id)) {
        notify(`Cancelled background task '${id}'.`);
    } else {
        notify(`Background task '${id}' was not found or is already finished.`);
    }
    return true;
}

export async function refreshTurnDiagnosticsDigest(sessionService: any, state: AgentConsoleDigestState): Promise<void> {
    if (!sessionService) {
        state.setTurnDiagnosticsDigest('');
        return;
    }
    try {
        const aggregate = await sessionService.getTurnDiagnosticsStats();
        if (!aggregate || !Number(aggregate.totalTurns)) {
            state.setTurnDiagnosticsDigest('');
            return;
        }
        state.setTurnDiagnosticsDigest(formatTurnDiagnosticsAggregate(aggregate));
    } catch {
        state.setTurnDiagnosticsDigest('');
    }
}

export async function openSummaryQualityRecords(
    sessionService: any,
    notify: (message: string) => void,
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    provider?: string
): Promise<boolean> {
    if (!sessionService) {
        notify('Summary quality is unavailable without app RPC.');
        return true;
    }
    const records = await sessionService.listSummaryQuality({ provider, limit: 200 });
    if (!records.length) {
        notify(
            provider
                ? `No summary quality records for provider '${provider}'.`
                : 'No summary quality records yet.'
        );
        return true;
    }
    const options = records.map((record: Record<string, any>) => buildSummaryQualityRecordOption(record));
    await select(
        provider
            ? `Summary quality records (${provider})`
            : 'Summary quality records',
        options,
        0,
        `${records.length} record${records.length === 1 ? '' : 's'}`
    );
    return true;
}

/**
 * Opens `/diagnostics list [sessionId]`: browses recorded turn diagnostics
 * records for the given session (falling back to the current session) as a
 * selectable list.
 */
export async function openTurnDiagnosticsListView(
    sessionService: any,
    notify: (message: string) => void,
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    sessionId?: string,
    currentSessionId?: string
): Promise<boolean> {
    if (!sessionService) {
        notify('Turn diagnostics are unavailable without app RPC.');
        return true;
    }
    const resolvedSessionId = (sessionId || '').trim() || currentSessionId || '';
    if (!resolvedSessionId) {
        notify('No session selected. Run /diagnostics list <sessionId>.');
        return true;
    }
    const records = await sessionService.listTurnDiagnostics(resolvedSessionId);
    if (!records.length) {
        notify(`No turn diagnostics recorded for session '${resolvedSessionId}'.`);
        return true;
    }
    const options = records.map((record: Record<string, any>) => buildTurnDiagnosticsRecordOption(record));
    await select(
        `Turn diagnostics records (${resolvedSessionId})`,
        options,
        0,
        `${records.length} record${records.length === 1 ? '' : 's'}`
    );
    return true;
}

/**
 * Opens `/diagnostics trend [sessionId] [bucketSize] [maxBuckets]`: renders
 * one sparkline line per session showing how token savings and compaction
 * activity evolve over time buckets.
 */
export async function openTurnDiagnosticsTrendView(
    sessionService: any,
    notify: (message: string) => void,
    pushCommandOutput: (command: string, text: string) => void,
    sessionId?: string,
    bucketSize?: number,
    maxBuckets?: number
): Promise<boolean> {
    if (!sessionService) {
        notify('Turn diagnostics are unavailable without app RPC.');
        return true;
    }
    const trend = await sessionService.getTurnDiagnosticsTrend(sessionId, { bucketSize, maxBuckets });
    if (!trend.length) {
        notify(
            sessionId
                ? `No turn diagnostics trend recorded for session '${sessionId}'.`
                : 'No turn diagnostics trend recorded yet.'
        );
        return true;
    }
    pushCommandOutput('/diagnostics trend', formatTurnDiagnosticsTrend(trend).join(' | '));
    return true;
}

/**
 * Opens `/quality trend [provider] [bucketSize] [maxBuckets]`: renders one
 * sparkline line per provider showing how summary quality aggregates evolve
 * over time buckets.
 */
export async function openSummaryQualityTrendView(
    sessionService: any,
    notify: (message: string) => void,
    pushCommandOutput: (command: string, text: string) => void,
    provider?: string,
    bucketSize?: number,
    maxBuckets?: number
): Promise<boolean> {
    if (!sessionService) {
        notify('Summary quality is unavailable without app RPC.');
        return true;
    }
    const trend = await sessionService.getSummaryQualityTrend({ provider, bucketSize, maxBuckets });
    if (!trend.length) {
        notify(
            provider
                ? `No summary quality trend recorded for provider '${provider}'.`
                : 'No summary quality trend recorded yet.'
        );
        return true;
    }
    pushCommandOutput('/quality trend', formatSummaryQualityTrend(trend).join(' | '));
    return true;
}
