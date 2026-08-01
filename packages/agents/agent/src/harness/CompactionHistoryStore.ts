import { Abstract } from '@tsdi/ioc';
import { CompactionLevel } from '../context/AgentContextManager';

/**
 * A persisted record of a single context-preparation pass that actually
 * modified history (pruned or compacted). Kept as a flat snapshot of the
 * {@link ContextPreparationReport} so later diagnostics can aggregate
 * compaction behavior across sessions without replaying them.
 */
export interface CompactionHistoryRecord {
    id: string;
    sessionId: string;
    strategy: 'unchanged' | 'pruned' | 'compacted';
    compactionTriggered: boolean;
    /** Progressive compaction level selected based on token pressure */
    level: CompactionLevel;
    summaryInserted: boolean;
    beforeMessageCount: number;
    afterMessageCount: number;
    beforeTokens: number;
    afterTokens: number;
    compactedMessageCount: number;
    preservedAnchorCount: number;
    recentMessageCount: number;
    prunedMessageCount: number;
    toolMessagesCompacted: number;
    /** Percentage of tokens saved: Math.round((1 - after/before) * 100) */
    compressionRatio: number;
    /** Cumulative tokens saved across all prepareHistory calls */
    cumulativeTokenSavings: number;
    createdAt: number;
    metadata?: Record<string, any>;
}

/**
 * Per-session aggregation of compaction history. Averages are rounded to one
 * decimal place; token totals sum across every recorded preparation pass.
 */
export interface CompactionHistoryAggregate {
    sessionId: string;
    recordCount: number;
    compactedCount: number;
    prunedCount: number;
    /** Average compression ratio across records, as a percentage. */
    avgCompressionRatio: number;
    totalTokensBefore: number;
    totalTokensAfter: number;
    totalTokensSaved: number;
    timeRange?: { from: number; to: number };
}

/**
 * Shared reduction used by every store implementation so in-memory and
 * TypeORM aggregation behave identically. Returns one aggregate per session,
 * optionally scoped to a single session.
 */
export function aggregateCompactionHistory(
    records: CompactionHistoryRecord[],
    sessionId?: string
): CompactionHistoryAggregate[] {
    const scoped = sessionId ? records.filter(record => record.sessionId === sessionId) : records;
    const bySession = new Map<string, CompactionHistoryRecord[]>();
    for (const record of scoped) {
        const group = bySession.get(record.sessionId) ?? [];
        group.push(record);
        bySession.set(record.sessionId, group);
    }

    const aggregates: CompactionHistoryAggregate[] = [];
    for (const [session, recordsGroup] of bySession) {
        const beforeTokens = recordsGroup.reduce((sum, record) => sum + record.beforeTokens, 0);
        const afterTokens = recordsGroup.reduce((sum, record) => sum + record.afterTokens, 0);
        const ratios = recordsGroup.map(record => record.compressionRatio);
        aggregates.push({
            sessionId: session,
            recordCount: recordsGroup.length,
            compactedCount: recordsGroup.filter(record => record.compactionTriggered).length,
            prunedCount: recordsGroup.filter(record => record.strategy === 'pruned').length,
            avgCompressionRatio: ratios.length > 0
                ? Math.round((ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 10) / 10
                : 0,
            totalTokensBefore: beforeTokens,
            totalTokensAfter: afterTokens,
            totalTokensSaved: Math.max(beforeTokens - afterTokens, 0),
            timeRange: {
                from: Math.min(...recordsGroup.map(record => record.createdAt)),
                to: Math.max(...recordsGroup.map(record => record.createdAt))
            }
        });
    }
    return aggregates.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

/**
 * One time-bucketed trend point for a session. `bucketStart` is the start of
 * the bucket window (aligned to `bucketSize`), and the averages mirror the
 * aggregate shape so the console can render a per-session sparkline.
 */
export interface CompactionHistoryTrendPoint {
    sessionId: string;
    bucketStart: number;
    recordCount: number;
    compactedCount: number;
    prunedCount: number;
    /** Average compression ratio across records in the bucket, as a percentage. */
    avgCompressionRatio: number;
    totalTokensBefore: number;
    totalTokensAfter: number;
    totalTokensSaved: number;
}

const DEFAULT_TREND_BUCKET_SIZE = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_MAX_BUCKETS = 30;

/**
 * Buckets compaction records into chronological windows (one day by default)
 * per session, producing trend points that show how token savings and
 * compression evolve over time. Only non-empty buckets are returned, limited
 * to the most recent `maxBuckets` windows. Shared by the gateway RPC/HTTP and
 * console rendering so every surface sees the same shape.
 */
export function buildCompactionHistoryTrend(
    records: CompactionHistoryRecord[],
    options?: { sessionId?: string; bucketSize?: number; maxBuckets?: number }
): CompactionHistoryTrendPoint[] {
    const scoped = options?.sessionId
        ? records.filter(record => record.sessionId === options.sessionId)
        : records;
    const bucketSize = Number.isFinite(options?.bucketSize) && (options?.bucketSize as number) > 0
        ? options?.bucketSize as number
        : DEFAULT_TREND_BUCKET_SIZE;
    const maxBuckets = Number.isFinite(options?.maxBuckets) && (options?.maxBuckets as number) > 0
        ? Math.min(Math.floor(options?.maxBuckets as number), 90)
        : DEFAULT_TREND_MAX_BUCKETS;

    const avg = (values: number[]): number => values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
    const bySession = new Map<string, Map<number, CompactionHistoryRecord[]>>();
    for (const record of scoped) {
        const bucketStart = Math.floor(record.createdAt / bucketSize) * bucketSize;
        const sessionBuckets = bySession.get(record.sessionId) ?? new Map<number, CompactionHistoryRecord[]>();
        const group = sessionBuckets.get(bucketStart) ?? [];
        group.push(record);
        sessionBuckets.set(bucketStart, group);
        bySession.set(record.sessionId, sessionBuckets);
    }

    const points: CompactionHistoryTrendPoint[] = [];
    for (const [session, sessionBuckets] of bySession) {
        const bucketStarts = [...sessionBuckets.keys()].sort((a, b) => a - b).slice(-maxBuckets);
        for (const bucketStart of bucketStarts) {
            const group = sessionBuckets.get(bucketStart) as CompactionHistoryRecord[];
            const beforeTokens = group.reduce((sum, record) => sum + record.beforeTokens, 0);
            const afterTokens = group.reduce((sum, record) => sum + record.afterTokens, 0);
            points.push({
                sessionId: session,
                bucketStart,
                recordCount: group.length,
                compactedCount: group.filter(record => record.compactionTriggered).length,
                prunedCount: group.filter(record => record.strategy === 'pruned').length,
                avgCompressionRatio: avg(group.map(record => record.compressionRatio)),
                totalTokensBefore: beforeTokens,
                totalTokensAfter: afterTokens,
                totalTokensSaved: Math.max(beforeTokens - afterTokens, 0)
            });
        }
    }
    return points.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.bucketStart - b.bucketStart);
}

/**
 * Persistent store for compaction history, mirroring the {@link AuditSink}
 * pattern: an abstract contract with in-memory, TypeORM, and environment-aware
 * default implementations.
 */
@Abstract()
export abstract class CompactionHistoryStore {
    abstract append(record: CompactionHistoryRecord): Promise<void>;
    abstract list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<CompactionHistoryRecord[]>;
    /** Per-session aggregates, optionally scoped to a single session. */
    abstract aggregate(sessionId?: string): Promise<CompactionHistoryAggregate[]>;
    /** Time-bucketed trend points, optionally scoped to a single session. */
    abstract trend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }): Promise<CompactionHistoryTrendPoint[]>;
}
