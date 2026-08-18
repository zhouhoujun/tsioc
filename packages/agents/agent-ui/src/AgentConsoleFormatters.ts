import { formatCompactNumber } from '@tsdi/core';
import { AgentConsoleSelectOption } from './AgentConsoleSessionState';

// ── Formatting helpers (extracted from AgentConsoleComponent) ────────────────

export function formatSummaryQualityAggregate(aggregate: Record<string, any>): string {
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
    return `${provider} · ${count} summary ${count === 1 ? '' : 'records'} · avg ${avgTotal} · fallback ${fallbackRate}% · evidence ${evidenceCoverage}%${range}`;
}

export function formatUsageWindow(label: string, usage: Record<string, any>): string {
    return `${label} ${Number(usage?.turns ?? 0)} turns · ${formatCompactNumber(Number(usage?.promptTokens ?? 0))} in · ${formatCompactNumber(Number(usage?.completionTokens ?? 0))} out · ${formatCompactNumber(Number(usage?.totalTokens ?? 0))} total`;
}

export function formatUsageSummary(usage: Record<string, any>): string {
    if (usage?.selectedRange && usage?.selected) {
        const labels: Record<string, string> = { daily: 'day', weekly: 'week', cumulative: 'all' };
        return formatUsageWindow(labels[usage.selectedRange] ?? usage.selectedRange, usage.selected);
    }
    return [
        formatUsageWindow('day', usage?.daily ?? {}),
        formatUsageWindow('week', usage?.weekly ?? {}),
        formatUsageWindow('all', usage?.cumulative ?? {})
    ].join(' | ');
}

export function formatCompactionHistoryAggregate(aggregate: Record<string, any>): string {
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
    return `${id} · ${count} ${count === 1 ? 'compaction' : 'compactions'} · ${compacted} triggered · saved ${formatCompactNumber(tokensSaved)} tokens · avg ${avgRatio}%${range}`;
}

export function buildSummaryQualityRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const model = record.model ? String(record.model) : 'unknown';
    const total = Number(record.total ?? 0);
    const createdAt = Number(record.createdAt ?? 0);
    return {
        label: `${record.provider ?? 'unknown'} · ${model} · ${total}`,
        value: id || `${record.provider ?? 'unknown'}:${total}`,
        description: [
            createdAt ? new Date(createdAt).toLocaleDateString() : '',
            `fields ${Number(record.fieldCompleteness ?? 0)}`,
            `annotation ${Number(record.annotationQuality ?? 0)}`,
            `length ${Number(record.lengthBalance ?? 0)}`,
            `truncation ${Number(record.truncationScore ?? 0)}`,
            record.evidenceCoverage != null ? `evidence ${Number(record.evidenceCoverage).toFixed(1)}%` : '',
            record.fallbackUsed ? 'fallback' : ''
        ].filter(Boolean).join(' · ') || 'summary quality record',
        detail: [
            `Record: ${id || '-'}`,
            `Provider: ${record.provider ?? 'unknown'}`,
            `Model: ${model}`,
            `Total: ${total}`,
            `Fields: ${Number(record.fieldCompleteness ?? 0)}`,
            `Annotation: ${Number(record.annotationQuality ?? 0)}`,
            `Length: ${Number(record.lengthBalance ?? 0)}`,
            `Truncation: ${Number(record.truncationScore ?? 0)}`,
            record.evidenceCoverage != null ? `Evidence coverage: ${Number(record.evidenceCoverage).toFixed(1)}%` : '',
            `Fallback: ${record.fallbackUsed ? 'yes' : 'no'}`,
            `Summary length: ${Number(record.summaryLength ?? 0)}`,
            createdAt ? `Created: ${new Date(createdAt).toLocaleString()}` : ''
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
export function formatCompactionHistoryRecord(record: Record<string, any>): string {
    const parts = [
        record.compactionTriggered ? 'compacted' : record.strategy,
        record.level ? `L${record.level}` : ''
    ].filter(Boolean);
    if (typeof record.beforeMessageCount === 'number' && typeof record.afterMessageCount === 'number') {
        parts.push(`${record.beforeMessageCount}→${record.afterMessageCount} msgs (${record.compactedMessageCount ?? 0})`);
    }
    if (typeof record.beforeTokens === 'number' && typeof record.afterTokens === 'number') {
        parts.push(`${formatCompactNumber(record.beforeTokens)}→${formatCompactNumber(record.afterTokens)} tokens (${record.compressionRatio ?? 0}%)`);
    }
    if (typeof record.cumulativeTokenSavings === 'number' && record.cumulativeTokenSavings > 0) {
        parts.push(`saved ${formatCompactNumber(record.cumulativeTokenSavings)} total`);
    }
    return parts.join(' · ');
}

/**
 * Renders one compact line per session with an 8-level sparkline over time
 * buckets (`avgCompressionRatio` mapped to ▁▂▃▄▅▆▇█), the bucket date
 * range, the total tokens saved, and the averaged compression ratio.
 */
export function formatCompactionHistoryTrend(trend: Array<Record<string, any>>): string[] {
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
        lines.push(`${id} ${sorted.map(point => spark(Number(point.avgCompressionRatio ?? 0))).join('')} (${sorted.length}d${range} · saved ${formatCompactNumber(tokensSaved)} tokens · avg ${avgRatio}%)`);
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

// ── Turn diagnostics formatting ──────────────────────────────────────────────

export function formatTurnDiagnosticsAggregate(aggregate: Record<string, any>, sessionId?: string): string {
    const id = sessionId
        ? (sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId)
        : 'all sessions';
    const parts = [
        `${id} · ${Number(aggregate.totalTurns ?? 0)} turns`,
        `empty ${Number(aggregate.emptyResponseRate ?? 0)}%`,
        `repeated ${Number(aggregate.repeatedQuestionRate ?? 0)}%`,
        `clarif ${Number(aggregate.clarificationRate ?? 0)}%`,
        `${Number(aggregate.compactionCount ?? 0)} compact(s)`,
        `saved ${formatCompactNumber(Number(aggregate.totalTokenSavings ?? 0))} tokens`
    ];
    const range = aggregate.timeRange
        ? ` · ${new Date(aggregate.timeRange.from).toLocaleDateString()}–${new Date(aggregate.timeRange.to).toLocaleDateString()}`
        : '';
    return parts.join(' · ') + range;
}

/**
 * Renders one compact line per session with an 8-level sparkline over time
 * buckets (`totalTokenSavings` normalized to the session maximum mapped to
 * ▁▂▃▄▅▆▇█), the bucket date range, the total turns, and the total tokens
 * saved.
 */
export function formatTurnDiagnosticsTrend(trend: Array<Record<string, any>>): string[] {
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
        lines.push(`${id} ${sorted.map(point => spark(Number(point.totalTokenSavings ?? 0), maxSaving)).join('')} (${sorted.length}d${range} · ${turns} turns · saved ${formatCompactNumber(tokensSaved)} tokens)`);
    }
    return lines.sort((a, b) => a.localeCompare(b));
}

export function buildTurnDiagnosticsRecordOption(record: Record<string, any>): AgentConsoleSelectOption {
    const id = String(record.id ?? '');
    const sessionId = String(record.sessionId ?? 'unknown');
    const createdAt = Number(record.createdAt ?? 0);
    const totalTurns = Number(record.totalTurns ?? 0);
    const emptyRate = Number(record.emptyResponseRate ?? 0).toFixed(1);
    const repeatedRate = Number(record.repeatedQuestionRate ?? 0).toFixed(1);
    const saved = formatCompactNumber(Number(record.totalTokenSavings ?? 0));
    const shortSession = sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
    return {
        label: `${shortSession} · ${totalTurns} turns · saved ${saved}`,
        value: id || `${sessionId}:${totalTurns}`,
        description: [
            createdAt ? new Date(createdAt).toLocaleDateString() : '',
            `empty ${emptyRate}%`,
            `repeated ${repeatedRate}%`
        ].filter(Boolean).join(' · ') || 'turn diagnostics record',
        detail: [
            `Record: ${id || '-'}`,
            `Session: ${sessionId}`,
            `Turns: ${totalTurns}`,
            `Empty response rate: ${emptyRate}%`,
            `Repeated question rate: ${repeatedRate}%`,
            `Token savings: ${saved}`,
            createdAt ? `Created: ${new Date(createdAt).toLocaleString()}` : ''
        ].filter(Boolean).join('\n')
    };
}

// ── Delegation formatting ───────────────────────────────────────────────────

export function formatDelegationEdge(edge: Record<string, any>): string {
    const parent = String(edge.parentTaskId ?? edge.from ?? '?').slice(0, 12);
    const child = String(edge.childTaskId ?? edge.to ?? '?').slice(0, 12);
    const status = edge.status ?? 'unknown';
    const goal = edge.goal ? ` · ${edge.goal}` : '';
    const worker = edge.workerClass ? ` [${edge.workerClass}]` : '';
    return `${parent}→${child} ${status}${worker}${goal}`;
}

export function formatDelegationTree(node: Record<string, any>, indent = 0): string[] {
    const prefix = '  '.repeat(indent);
    const id = String(node.taskId ?? node.id ?? '?').slice(0, 12);
    const status = node.status ?? 'unknown';
    const goal = node.goal ? ` · ${node.goal}` : '';
    const worker = node.workerClass ? ` [${node.workerClass}]` : '';
    const lines = [`${prefix}${id} ${status}${worker}${goal}`];
    for (const child of node.children ?? []) {
        lines.push(...formatDelegationTree(child, indent + 1));
    }
    return lines;
}

export function pickDelegationGoal(edge: Record<string, any>): string {
    return String(edge.goal ?? edge.description ?? '').trim() || '(no goal)';
}

export function shortenSessionId(sessionId: string): string {
    return sessionId.length > 16 ? `${sessionId.slice(0, 14)}…` : sessionId;
}
