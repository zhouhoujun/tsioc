import { formatCompactNumber } from '@tsdi/core';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { formatAgentDiagLabel as diagLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import { formatCompactionHistoryAggregate, formatSummaryQualityAggregate, formatTurnDiagnosticsAggregate, formatTurnDiagnosticsTrend, formatUsageSummary, buildSummaryQualityRecordOption } from './AgentConsoleFormatters';

export interface AgentConsoleDigestState {
    setUsageDigest(value: string): void;
    setSummaryQualityDigest(value: string): void;
    setCompactionDigest(value: string): void;
    setTurnDiagnosticsDigest(value: string): void;
}

export async function refreshUsageDigest(sessionService: any, state: AgentConsoleDigestState, translator?: AgentUiTranslator | null): Promise<void> {
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
        state.setUsageDigest(formatUsageSummary(usage, translator));
    } catch {
        state.setUsageDigest('');
    }
}

export async function refreshSummaryQualityDigest(sessionService: any, state: AgentConsoleDigestState, translator?: AgentUiTranslator | null): Promise<void> {
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
                .map((item: Record<string, any>) => formatSummaryQualityAggregate(item, translator))
                .join(' | ')
        );
    } catch {
        state.setSummaryQualityDigest('');
    }
}

export async function refreshCompactionDigest(sessionService: any, state: AgentConsoleDigestState, translator?: AgentUiTranslator | null): Promise<void> {
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
                .map((item: Record<string, any>) => formatCompactionHistoryAggregate(item, translator))
                .join(' | ')
        );
    } catch {
        state.setCompactionDigest('');
    }
}

export function formatSummaryQualityTrend(trend: Array<Record<string, any>>, translator?: AgentUiTranslator | null): string[] {
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
        lines.push(diagLabel(translator, 'quality', 'trend', '{provider} {spark} ({bucketWord}{range} · avg {avg} · fb {fallback}% · evidence {evidence}%)', {
            provider: provider, spark: sorted.map(point => spark(Number(point.avgTotal ?? 0))).join(''), range: range,
            bucketWord: diagLabel(translator, 'common', 'dayCount', '{count}d', { count: sorted.length }),
            avg: avgTotal, fallback: fallbackRate, evidence: evidenceCoverage
        }));
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

export function buildTurnDiagnosticsRecordOption(record: Record<string, any>, translator?: AgentUiTranslator | null): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const sessionId = String(record.sessionId ?? 'unknown');
    const createdAt = Number(record.createdAt ?? 0);
    const compacted = Number(record.compactionCount ?? 0);
    const saved = Number(record.totalTokenSavings ?? 0);
    const t = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(translator, 'turn', key, fallback, params);
    const yesNo = (value: boolean) => diagLabel(translator, 'common', value ? 'yes' : 'no', value ? 'yes' : 'no');
    const description = [
        createdAt ? new Date(createdAt).toLocaleDateString() : '',
        compacted === 1 ? t('recordCompactsOne', '{count} compact', { count: compacted }) : t('recordCompactsMany', '{count} compacts', { count: compacted }),
        saved > 0 ? t('recordSaved', 'saved {saved} tokens', { saved: formatCompactNumber(saved) }) : '',
        record.repeatedClarificationDetected ? t('recordRepeated', 'repeated') : '',
        record.finalAssistantWasClarification ? t('recordClarification', 'clarif') : ''
    ].filter(Boolean).join(' · ') || t('recordDescriptionFallback', 'turn diagnostics record');
    return {
        label: `${sessionId} · ${createdAt ? new Date(createdAt).toLocaleString() : t('unknownTime', 'unknown time')}`,
        value: id || `${sessionId}:${createdAt}`,
        description,
        detail: [
            t('recordDetail', 'Record: {id}', { id: id || '-' }),
            t('recordSession', 'Session: {session}', { session: sessionId }),
            t('recordCreated', 'Created: {value}', { value: createdAt ? new Date(createdAt).toLocaleString() : '-' }),
            t('recordEmptyRetries', 'Empty response retries: {value}', { value: Number(record.emptyResponseRetryCount ?? 0) }),
            t('recordRepeatedClarification', 'Repeated clarification: {value}', { value: yesNo(!!record.repeatedClarificationDetected) }),
            t('recordFinalClarification', 'Final clarification: {value}', { value: yesNo(!!record.finalAssistantWasClarification) }),
            t('recordContextRewritten', 'Context rewritten: {value}', { value: yesNo(!!record.followUpContextRewritten) }),
            t('recordFollowUpRecoveries', 'Follow-up recoveries: {value}', { value: Number(record.followUpRecoveryCount ?? 0) }),
            t('recordCompactions', 'Compactions: {value}', { value: compacted }),
            t('recordTokenSavings', 'Token savings: {value}', { value: formatCompactNumber(saved) }),
            record.compressionRatio != null ? t('recordCompressionRatio', 'Compression ratio: {value}%', { value: record.compressionRatio }) : '',
            record.compactionLevel ? t('recordCompactionLevel', 'Compaction level: {value}', { value: record.compactionLevel }) : '',
            record.promptCache ? t('recordPromptCache', 'Prompt cache: {provider} {strategy}', { provider: String(record.promptCache.provider ?? ''), strategy: String(record.promptCache.appliedStrategy ?? '') }) : ''
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

export async function runHarnessStopCommand(sessionService: any, notify: (message: string) => void, taskId: string, translator?: AgentUiTranslator | null): Promise<boolean> {
    if (!sessionService) {
        notify(formatAgentUiNotice(translator, 'harnessStopUnavailable'));
        return true;
    }
    const id = (taskId || '').trim();
    if (!id) {
        notify(formatAgentUiNotice(translator, 'harnessStopUsage'));
        return true;
    }
    const result = await sessionService.cancelBackgroundTasks([id]);
    const cancelled = result?.cancelled ?? [];
    if (cancelled.includes(id)) {
        notify(formatAgentUiNotice(translator, 'harnessTaskCancelled', { id }));
    } else {
        notify(formatAgentUiNotice(translator, 'harnessTaskNotFound', { id }));
    }
    return true;
}

export async function refreshTurnDiagnosticsDigest(sessionService: any, state: AgentConsoleDigestState, translator?: AgentUiTranslator | null): Promise<void> {
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
        state.setTurnDiagnosticsDigest(formatTurnDiagnosticsAggregate(aggregate, undefined, translator));
    } catch {
        state.setTurnDiagnosticsDigest('');
    }
}

export async function openSummaryQualityRecords(
    sessionService: any,
    notify: (message: string) => void,
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    provider?: string,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    if (!sessionService) {
        notify(formatAgentUiNotice(translator, 'summaryQualityUnavailable'));
        return true;
    }
    const records = await sessionService.listSummaryQuality({ provider, limit: 200 });
    if (!records.length) {
        notify(
            provider
                ? formatAgentUiNotice(translator, 'summaryQualityNoRecordsProvider', { provider })
                : formatAgentUiNotice(translator, 'summaryQualityNoRecords')
        );
        return true;
    }
    const options = records.map((record: Record<string, any>) => buildSummaryQualityRecordOption(record, translator));
    await select(
        provider
            ? diagLabel(translator, 'quality', 'listTitle', 'Summary quality records ({provider})', { provider: provider })
            : diagLabel(translator, 'quality', 'listTitleAll', 'Summary quality records'),
        options,
        0,
        records.length === 1
            ? diagLabel(translator, 'quality', 'listHintOne', '{count} record', { count: records.length })
            : diagLabel(translator, 'quality', 'listHintMany', '{count} records', { count: records.length })
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
    currentSessionId?: string,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    if (!sessionService) {
        notify(formatAgentUiNotice(translator, 'turnDiagnosticsUnavailable'));
        return true;
    }
    const resolvedSessionId = (sessionId || '').trim() || currentSessionId || '';
    if (!resolvedSessionId) {
        notify(formatAgentUiNotice(translator, 'diagnosticsNoSession'));
        return true;
    }
    const records = await sessionService.listTurnDiagnostics(resolvedSessionId);
    if (!records.length) {
        notify(formatAgentUiNotice(translator, 'turnDiagnosticsNoRecords', { sessionId: resolvedSessionId }));
        return true;
    }
    const options = records.map((record: Record<string, any>) => buildTurnDiagnosticsRecordOption(record, translator));
    await select(
        diagLabel(translator, 'turn', 'listTitle', 'Turn diagnostics records ({session})', { session: resolvedSessionId }),
        options,
        0,
        records.length === 1
            ? diagLabel(translator, 'turn', 'listHintOne', '{count} record', { count: records.length })
            : diagLabel(translator, 'turn', 'listHintMany', '{count} records', { count: records.length })
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
    maxBuckets?: number,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    if (!sessionService) {
        notify(formatAgentUiNotice(translator, 'turnDiagnosticsUnavailable'));
        return true;
    }
    const trend = await sessionService.getTurnDiagnosticsTrend(sessionId, { bucketSize, maxBuckets });
    if (!trend.length) {
        notify(
            sessionId
                ? formatAgentUiNotice(translator, 'turnDiagnosticsTrendNoRecords', { sessionId })
                : formatAgentUiNotice(translator, 'turnDiagnosticsTrendNoRecordsYet')
        );
        return true;
    }
    pushCommandOutput('/diagnostics trend', formatTurnDiagnosticsTrend(trend, translator).join(' | '));
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
    maxBuckets?: number,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    if (!sessionService) {
        notify(formatAgentUiNotice(translator, 'summaryQualityUnavailable'));
        return true;
    }
    const trend = await sessionService.getSummaryQualityTrend({ provider, bucketSize, maxBuckets });
    if (!trend.length) {
        notify(
            provider
                ? formatAgentUiNotice(translator, 'summaryQualityTrendNoRecordsProvider', { provider })
                : formatAgentUiNotice(translator, 'summaryQualityTrendNoRecords')
        );
        return true;
    }
    pushCommandOutput('/quality trend', formatSummaryQualityTrend(trend, translator).join(' | '));
    return true;
}
