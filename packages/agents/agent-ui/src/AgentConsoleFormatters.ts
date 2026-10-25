import { formatCompactNumber } from '@tsdi/core';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { formatAgentDiagLabel as diagLabel, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';

// ── Formatting helpers (extracted from AgentConsoleComponent) ────────────────

export function formatSummaryQualityAggregate(aggregate: Record<string, any>, translator?: AgentUiTranslator | null): string {
    const provider = String(aggregate.provider ?? 'unknown');
    const count = Number(aggregate.recordCount ?? 0);
    const avgTotal = Number(aggregate.avgTotal ?? 0).toFixed(1);
    const fallbackRate = Number(aggregate.fallbackRate ?? 0).toFixed(1);
    const evidenceCoverage = Number(aggregate.avgEvidenceCoverage ?? 0).toFixed(1);
    const from = Number(aggregate.timeRange?.from ?? 0);
    const to = Number(aggregate.timeRange?.to ?? 0);
    const range = from || to
        ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
        : '';
    return diagLabel(translator, 'quality', 'aggregate', '{provider} · {count} summary {recordWord} · avg {avg} · fallback {fallback}% · evidence {evidence}%{range}', {
        provider: provider, count: count, recordWord: count === 1 ? 'record' : 'records',
        avg: avgTotal, fallback: fallbackRate, evidence: evidenceCoverage, range: range
    });
}

export function formatUsageWindow(label: string, usage: Record<string, any>, translator?: AgentUiTranslator | null): string {
    return panelLabel(translator, 'usage', 'window', '{label} {turns} turns · {input} in · {output} out · {total} total', {
        label: panelLabel(translator, 'usage', label, label),
        turns: Number(usage?.turns ?? 0),
        input: formatCompactNumber(Number(usage?.promptTokens ?? 0)),
        output: formatCompactNumber(Number(usage?.completionTokens ?? 0)),
        total: formatCompactNumber(Number(usage?.totalTokens ?? 0))
    });
}

export function formatUsageSummary(usage: Record<string, any>, translator?: AgentUiTranslator | null): string {
    if (usage?.selectedRange && usage?.selected) {
        const labels: Record<string, string> = { daily: 'day', weekly: 'week', cumulative: 'all' };
        return formatUsageWindow(labels[usage.selectedRange] ?? usage.selectedRange, usage.selected, translator);
    }
    return [
        formatUsageWindow('day', usage?.daily ?? {}, translator),
        formatUsageWindow('week', usage?.weekly ?? {}, translator),
        formatUsageWindow('all', usage?.cumulative ?? {}, translator)
    ].join(' | ');
}

export function formatCompactionHistoryAggregate(aggregate: Record<string, any>, translator?: AgentUiTranslator | null): string {
    const sessionId = String(aggregate.sessionId ?? 'unknown');
    const count = Number(aggregate.recordCount ?? 0);
    const compacted = Number(aggregate.compactedCount ?? 0);
    const tokensSaved = Number(aggregate.totalTokensSaved ?? 0);
    const avgRatio = Number(aggregate.avgCompressionRatio ?? 0).toFixed(1);
    const from = Number(aggregate.timeRange?.from ?? 0);
    const to = Number(aggregate.timeRange?.to ?? 0);
    const range = from || to
        ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
        : '';
    const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
    return diagLabel(translator, 'compaction', 'aggregate', '{id} · {count} {recordWord} · {compacted} triggered · saved {saved} tokens · avg {avg}%{range}', {
        id: id, count: count, recordWord: count === 1 ? 'compaction' : 'compactions', compacted: compacted,
        saved: formatCompactNumber(tokensSaved), avg: avgRatio, range: range
    });
}

export function buildSummaryQualityRecordOption(record: Record<string, any>, translator?: AgentUiTranslator | null): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const model = record.model ? String(record.model) : 'unknown';
    const total = Number(record.total ?? 0);
    const createdAt = Number(record.createdAt ?? 0);
    const q = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(translator, 'quality', key, fallback, params);
    const yesNo = (value: boolean) => diagLabel(translator, 'common', value ? 'yes' : 'no', value ? 'yes' : 'no');
    return {
        label: q('recordTitle', '{provider} · {model} · {total}', { provider: record.provider ?? 'unknown', model: model, total: total }),
        value: id || `${record.provider ?? 'unknown'}:${total}`,
        description: [
            createdAt ? new Date(createdAt).toLocaleDateString() : '',
            q('recordFields', 'fields {value}', { value: Number(record.fieldCompleteness ?? 0) }),
            q('recordAnnotation', 'annotation {value}', { value: Number(record.annotationQuality ?? 0) }),
            q('recordLength', 'length {value}', { value: Number(record.lengthBalance ?? 0) }),
            q('recordTruncation', 'truncation {value}', { value: Number(record.truncationScore ?? 0) }),
            record.evidenceCoverage != null ? q('recordEvidence', 'evidence {value}%', { value: Number(record.evidenceCoverage).toFixed(1) }) : '',
            record.fallbackUsed ? q('recordFallbackBadge', 'fallback') : ''
        ].filter(Boolean).join(' · ') || q('recordDescriptionFallback', 'summary quality record'),
        detail: [
            q('recordDetail', 'Record: {id}', { id: id || '-' }),
            q('recordProvider', 'Provider: {provider}', { provider: record.provider ?? 'unknown' }),
            q('recordModel', 'Model: {model}', { model: model }),
            q('recordTotal', 'Total: {total}', { total: total }),
            q('detailFields', 'Fields: {value}', { value: Number(record.fieldCompleteness ?? 0) }),
            q('detailAnnotation', 'Annotation: {value}', { value: Number(record.annotationQuality ?? 0) }),
            q('detailLength', 'Length: {value}', { value: Number(record.lengthBalance ?? 0) }),
            q('detailTruncation', 'Truncation: {value}', { value: Number(record.truncationScore ?? 0) }),
            record.evidenceCoverage != null ? q('detailEvidence', 'Evidence coverage: {value}%', { value: Number(record.evidenceCoverage).toFixed(1) }) : '',
            q('detailFallback', 'Fallback: {value}', { value: yesNo(!!record.fallbackUsed) }),
            q('detailSummaryLength', 'Summary length: {value}', { value: Number(record.summaryLength ?? 0) }),
            createdAt ? q('detailCreated', 'Created: {value}', { value: new Date(createdAt).toLocaleString() }) : ''
        ].filter(Boolean).join('\n')
    };
}

// ── Compaction history formatting ────────────────────────────────────────────

/**
 * Parses `/compactions trend` or `/diagnostics trend` trailing tokens:
 * optional session id, optional bucket size (`Nd` for days or a
 * millisecond number), optional max bucket count.
 */
export function parseTrendArgs(
    args: string
): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    let sessionId: string | undefined;
    let bucketSize: number | undefined;
    let maxBuckets: number | undefined;
    for (const token of tokens) {
        if (/^\d+d$/i.test(token)) {
            bucketSize = parseInt(token, 10) * 86400000;
        } else if (/^\d+$/.test(token) && Number(token) > 1000) {
            bucketSize = Number(token);
        } else if (/^\d+$/.test(token) && Number(token) <= 100) {
            maxBuckets = Number(token);
        } else if (!sessionId) {
            sessionId = token;
        }
    }
    return { sessionId, bucketSize, maxBuckets };
}

/**
 * Renders one compact line per compaction record, for example:
 * `compacted L3 312→224 msgs (88) · 84k→41k tokens (-51%) · saved 43k total`
 */
export function formatCompactionHistoryRecord(record: Record<string, any>, translator?: AgentUiTranslator | null): string {
    const c = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(translator, 'compaction', key, fallback, params);
    const parts = [
        record.compactionTriggered ? c('recordCompacted', 'compacted') : record.strategy,
        record.level ? `L${record.level}` : ''
    ].filter(Boolean);
    if (typeof record.beforeMessageCount === 'number' && typeof record.afterMessageCount === 'number') {
        parts.push(c('recordMessages', '{before}→{after} msgs ({compacted})', { before: record.beforeMessageCount, after: record.afterMessageCount, compacted: record.compactedMessageCount ?? 0 }));
    }
    if (typeof record.beforeTokens === 'number' && typeof record.afterTokens === 'number') {
        parts.push(c('recordTokens', '{before}→{after} tokens ({ratio}%)', { before: formatCompactNumber(record.beforeTokens), after: formatCompactNumber(record.afterTokens), ratio: record.compressionRatio ?? 0 }));
    }
    if (typeof record.cumulativeTokenSavings === 'number' && record.cumulativeTokenSavings > 0) {
        parts.push(c('recordSavedTotal', 'saved {saved} total', { saved: formatCompactNumber(record.cumulativeTokenSavings) }));
    }
    return parts.join(' · ');
}

/**
 * Renders one compact line per session with an 8-level sparkline over time
 * buckets (`avgCompressionRatio` mapped to ▁▂▃▄▅▆▇█), the bucket date
 * range, the total tokens saved, and the averaged compression ratio.
 */
export function formatCompactionHistoryTrend(trend: Array<Record<string, any>>, translator?: AgentUiTranslator | null): string[] {
    const bySession = new Map<string, Array<Record<string, any>>>();
    for (const point of trend) {
        const sessionId = String(point.sessionId ?? 'unknown');
        const group = bySession.get(sessionId) ?? [];
        group.push(point);
        bySession.set(sessionId, group);
    }
    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const spark = (value: number): string => {
        const index = Math.min(7, Math.max(0, Math.floor((Number(value) || 0) / 100 * 8)));
        return sparkChars[index];
    };
    const lines: string[] = [];
    for (const [sessionId, points] of bySession) {
        const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
        const ratios = sorted.map(point => Number(point.avgCompressionRatio ?? 0));
        const avgRatio = ratios.length
            ? (ratios.reduce((sum, value) => sum + value, 0) / ratios.length).toFixed(1)
            : '0.0';
        const tokensSaved = sorted.reduce((sum, point) => sum + Number(point.totalTokensSaved ?? 0), 0);
        const from = Number(sorted[0]?.bucketStart ?? 0);
        const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
        lines.push(diagLabel(translator, 'compaction', 'trend', '{id} {spark} ({bucketWord}{range} · saved {saved} tokens · avg {avg}%)', {
            id: id, spark: sorted.map(point => spark(Number(point.avgCompressionRatio ?? 0))).join(''), range: range,
            bucketWord: diagLabel(translator, 'common', 'dayCount', '{count}d', { count: sorted.length }),
            saved: formatCompactNumber(tokensSaved), avg: avgRatio
        }));
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

// ── Turn diagnostics formatting ──────────────────────────────────────────────

export function formatTurnDiagnosticsAggregate(aggregate: Record<string, any>, sessionId?: string, translator?: AgentUiTranslator | null): string {
    const id = sessionId
        ? (sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId)
        : diagLabel(translator, 'harness', 'allSessions', 'all sessions');
    const range = aggregate.timeRange
        ? ` · ${new Date(aggregate.timeRange.from).toLocaleDateString()}–${new Date(aggregate.timeRange.to).toLocaleDateString()}`
        : '';
    return diagLabel(translator, 'turn', 'aggregate', '{id} · {turns} turns · empty {empty}% · repeated {repeated}% · clarif {clarif}% · {compacted} compact(s) · saved {saved} tokens{range}', {
        id: id, turns: Number(aggregate.totalTurns ?? 0), empty: Number(aggregate.emptyResponseRate ?? 0),
        repeated: Number(aggregate.repeatedQuestionRate ?? 0), clarif: Number(aggregate.clarificationRate ?? 0),
        compacted: Number(aggregate.compactionCount ?? 0), saved: formatCompactNumber(Number(aggregate.totalTokenSavings ?? 0)), range: range
    });
}

/**
 * Renders one compact line per session with an 8-level sparkline over time
 * buckets (`totalTokenSavings` normalized to the session maximum mapped to
 * ▁▂▃▄▅▆▇█), the bucket date range, the total turns, and the total tokens
 * saved.
 */
export function formatTurnDiagnosticsTrend(trend: Array<Record<string, any>>, translator?: AgentUiTranslator | null): string[] {
    const bySession = new Map<string, Array<Record<string, any>>>();
    for (const point of trend) {
        const sessionId = String(point.sessionId ?? 'unknown');
        const group = bySession.get(sessionId) ?? [];
        group.push(point);
        bySession.set(sessionId, group);
    }
    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const spark = (value: number, max: number): string => {
        const ratio = max > 0 ? Math.min(1, Math.max(0, Number(value) || 0) / max) : 0;
        const index = Math.min(7, Math.max(0, Math.floor(ratio * 8)));
        return sparkChars[index];
    };
    const lines: string[] = [];
    for (const [sessionId, points] of bySession) {
        const sorted = points.slice().sort((a, b) => Number(a.bucketStart ?? 0) - Number(b.bucketStart ?? 0));
        const savings = sorted.map(point => Number(point.totalTokenSavings ?? 0));
        const maxSaving = Math.max(...savings, 1);
        const turns = sorted.reduce((sum, point) => sum + Number(point.recordCount ?? 0), 0);
        const tokensSaved = savings.reduce((sum, value) => sum + value, 0);
        const from = Number(sorted[0]?.bucketStart ?? 0);
        const to = Number(sorted[sorted.length - 1]?.bucketStart ?? 0);
        const range = from || to
            ? ` · ${new Date(from || to).toLocaleDateString()}–${new Date(to || from).toLocaleDateString()}`
            : '';
        const id = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
        lines.push(diagLabel(translator, 'turn', 'trend', '{id} {spark} ({bucketWord}{range} · {turns} turns · saved {saved} tokens)', {
            id: id, spark: sorted.map(point => spark(Number(point.totalTokenSavings ?? 0), maxSaving)).join(''), range: range,
            bucketWord: diagLabel(translator, 'common', 'dayCount', '{count}d', { count: sorted.length }),
            turns: turns, saved: formatCompactNumber(tokensSaved)
        }));
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

export function buildTurnDiagnosticsRecordOption(record: Record<string, any>, translator?: AgentUiTranslator | null): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const sessionId = String(record.sessionId ?? 'unknown');
    const createdAt = Number(record.createdAt ?? 0);
    const totalTurns = Number(record.totalTurns ?? 0);
    const emptyRate = Number(record.emptyResponseRate ?? 0).toFixed(1);
    const repeatedRate = Number(record.repeatedQuestionRate ?? 0).toFixed(1);
    const saved = formatCompactNumber(Number(record.totalTokenSavings ?? 0));
    const shortSession = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
    const t = (key: string, fallback: string, params?: Record<string, any>) => diagLabel(translator, 'turn', key, fallback, params);
    return {
        label: t('recordLabel', '{session} · {turns} turns · saved {saved}', { session: shortSession, turns: totalTurns, saved: saved }),
        value: id || `${sessionId}:${totalTurns}`,
        description: [
            createdAt ? new Date(createdAt).toLocaleDateString() : '',
            t('recordEmptyRate', 'empty {value}%', { value: emptyRate }),
            t('recordRepeatedRate', 'repeated {value}%', { value: repeatedRate })
        ].filter(Boolean).join(' · ') || t('recordDescriptionFallback', 'turn diagnostics record'),
        detail: [
            t('recordDetail', 'Record: {id}', { id: id || '-' }),
            t('recordSession', 'Session: {session}', { session: sessionId }),
            t('recordTurns', 'Turns: {value}', { value: totalTurns }),
            t('recordEmptyResponseRate', 'Empty response rate: {value}%', { value: emptyRate }),
            t('recordRepeatedQuestionRate', 'Repeated question rate: {value}%', { value: repeatedRate }),
            t('recordTokenSavings', 'Token savings: {value}', { value: saved }),
            createdAt ? t('recordCreated', 'Created: {value}', { value: new Date(createdAt).toLocaleString() }) : ''
        ].filter(Boolean).join('\n')
    };
}
