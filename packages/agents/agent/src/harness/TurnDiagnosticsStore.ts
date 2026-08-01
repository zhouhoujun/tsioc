import { Abstract } from '@tsdi/ioc';
import { PromptCacheRuntimeMetadata } from '../model/ModelProviderOptions';

/**
 * A persisted record of one completed turn's diagnostics, captured from
 * {@link AgentTurnDiagnostics}. Flat snapshot so aggregation (empty-response
 * rate, repeated-question rate, compaction totals) can run without replaying
 * session transcripts.
 */
export interface TurnDiagnosticsRecord {
    id: string;
    sessionId: string;
    createdAt: number;
    emptyResponseRetryCount: number;
    followUpRecoveryCount: number;
    followUpContextRewritten: boolean;
    finalAssistantWasClarification: boolean;
    repeatedClarificationDetected: boolean;
    /** Number of context compactions performed during this turn. */
    compactionCount: number;
    /** Total tokens saved by compaction across this session. */
    totalTokenSavings: number;
    /** Latest compression ratio (percentage). */
    compressionRatio?: number;
    /** Latest compaction level applied. */
    compactionLevel?: string;
    /** Prompt cache provider support / applied policy from the final model response. */
    promptCache?: PromptCacheRuntimeMetadata;
    metadata?: Record<string, any>;
}

/**
 * Aggregated turn diagnostics for one or more sessions. Rates are percentages
 * rounded to one decimal place.
 */
export interface TurnDiagnosticsAggregate {
    /** Sessions included in the aggregation, undefined when aggregating all. */
    sessionIds?: string[];
    totalTurns: number;
    emptyResponseCount: number;
    emptyResponseRate: number;
    repeatedClarificationCount: number;
    repeatedQuestionRate: number;
    finalClarificationCount: number;
    clarificationRate: number;
    followUpRecoveryCount: number;
    followUpRecoveryRate: number;
    compactionCount: number;
    totalTokenSavings: number;
    timeRange?: { from: number; to: number };
}

/**
 * Shared reduction used by every store implementation so in-memory and
 * TypeORM aggregation behave identically. Scopes to `sessionIds` when provided
 * and non-empty; otherwise aggregates every record.
 */
export function aggregateTurnDiagnostics(records: TurnDiagnosticsRecord[], sessionIds?: string[]): TurnDiagnosticsAggregate {    const scoped = sessionIds && sessionIds.length > 0
        ? records.filter(record => sessionIds.includes(record.sessionId))
        : records;
    const totalTurns = scoped.length;
    const emptyResponseCount = scoped.filter(record => record.emptyResponseRetryCount > 0).length;
    const repeatedClarificationCount = scoped.filter(record => record.repeatedClarificationDetected).length;
    const finalClarificationCount = scoped.filter(record => record.finalAssistantWasClarification).length;
    const followUpRecoveryCount = scoped.reduce((sum, record) => sum + record.followUpRecoveryCount, 0);
    const compactionCount = scoped.reduce((sum, record) => sum + record.compactionCount, 0);
    const totalTokenSavings = scoped.reduce((sum, record) => sum + record.totalTokenSavings, 0);
    const rate = (count: number): number => totalTurns > 0 ? Math.round((count / totalTurns) * 1000) / 10 : 0;
    const timeRange = scoped.length > 0
        ? {
            from: Math.min(...scoped.map(record => record.createdAt)),
            to: Math.max(...scoped.map(record => record.createdAt))
        }
        : undefined;
    return {
        sessionIds,
        totalTurns,
        emptyResponseCount,
        emptyResponseRate: rate(emptyResponseCount),
        repeatedClarificationCount,
        repeatedQuestionRate: rate(repeatedClarificationCount),
        finalClarificationCount,
        clarificationRate: rate(finalClarificationCount),
        followUpRecoveryCount,
        followUpRecoveryRate: totalTurns > 0 ? Math.round((followUpRecoveryCount / totalTurns) * 1000) / 10 : 0,
        compactionCount,
        totalTokenSavings,
        timeRange
    };
}

/**
 * One time-bucketed trend point for a session. `bucketStart` is the start of
 * the bucket window (aligned to `bucketSize`), and the rates mirror the
 * aggregate shape so the console can render a per-session sparkline.
 */
export interface TurnDiagnosticsTrendPoint {
    sessionId: string;
    bucketStart: number;
    /** Number of turns recorded in the bucket. */
    recordCount: number;
    emptyResponseCount: number;
    repeatedClarificationCount: number;
    followUpRecoveryCount: number;
    compactionCount: number;
    totalTokenSavings: number;
    /** Average compression ratio across records that carry one, as a percentage. */
    avgCompressionRatio: number;
}

const DEFAULT_TREND_BUCKET_SIZE = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_MAX_BUCKETS = 30;

/**
 * Buckets turn diagnostics records into chronological windows (one day by
 * default) per session, producing trend points that show how token savings and
 * compaction evolve over time. Only non-empty buckets are returned, limited to
 * the most recent `maxBuckets` windows. Scopes to `sessionIds` when provided
 * and non-empty. Shared by the gateway RPC/HTTP and console rendering so every
 * surface sees the same shape.
 */
export function buildTurnDiagnosticsTrend(
    records: TurnDiagnosticsRecord[],
    options?: { sessionIds?: string[]; bucketSize?: number; maxBuckets?: number }
): TurnDiagnosticsTrendPoint[] {
    const scoped = options?.sessionIds && options.sessionIds.length > 0
        ? records.filter(record => options.sessionIds!.includes(record.sessionId))
        : records;
    const bucketSize = Number.isFinite(options?.bucketSize) && (options?.bucketSize as number) > 0
        ? options?.bucketSize as number
        : DEFAULT_TREND_BUCKET_SIZE;
    const maxBuckets = Number.isFinite(options?.maxBuckets) && (options?.maxBuckets as number) > 0
        ? Math.min(Math.floor(options?.maxBuckets as number), 90)
        : DEFAULT_TREND_MAX_BUCKETS;

    const avg = (values: number[]): number => values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
    const bySession = new Map<string, Map<number, TurnDiagnosticsRecord[]>>();
    for (const record of scoped) {
        const bucketStart = Math.floor(record.createdAt / bucketSize) * bucketSize;
        const sessionBuckets = bySession.get(record.sessionId) ?? new Map<number, TurnDiagnosticsRecord[]>();
        const group = sessionBuckets.get(bucketStart) ?? [];
        group.push(record);
        sessionBuckets.set(bucketStart, group);
        bySession.set(record.sessionId, sessionBuckets);
    }

    const points: TurnDiagnosticsTrendPoint[] = [];
    for (const [session, sessionBuckets] of bySession) {
        const bucketStarts = [...sessionBuckets.keys()].sort((a, b) => a - b).slice(-maxBuckets);
        for (const bucketStart of bucketStarts) {
            const group = sessionBuckets.get(bucketStart) as TurnDiagnosticsRecord[];
            const ratios = group
                .map(record => record.compressionRatio)
                .filter((ratio): ratio is number => typeof ratio === 'number' && Number.isFinite(ratio));
            points.push({
                sessionId: session,
                bucketStart,
                recordCount: group.length,
                emptyResponseCount: group.filter(record => record.emptyResponseRetryCount > 0).length,
                repeatedClarificationCount: group.filter(record => record.repeatedClarificationDetected).length,
                followUpRecoveryCount: group.reduce((sum, record) => sum + record.followUpRecoveryCount, 0),
                compactionCount: group.reduce((sum, record) => sum + record.compactionCount, 0),
                totalTokenSavings: group.reduce((sum, record) => sum + record.totalTokenSavings, 0),
                avgCompressionRatio: avg(ratios)
            });
        }
    }
    return points.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.bucketStart - b.bucketStart);
}

/**
 * Persistent store for turn diagnostics, mirroring the {@link AuditSink}
 * pattern: an abstract contract with in-memory, TypeORM, and environment-aware
 * default implementations.
 */
@Abstract()
export abstract class TurnDiagnosticsStore {
    abstract append(record: TurnDiagnosticsRecord): Promise<void>;
    abstract list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<TurnDiagnosticsRecord[]>;
    abstract aggregate(sessionIds?: string[]): Promise<TurnDiagnosticsAggregate>;
    /** Time-bucketed trend points, optionally scoped to a set of sessions. */
    abstract trend(sessionIds?: string[], options?: { bucketSize?: number; maxBuckets?: number }): Promise<TurnDiagnosticsTrendPoint[]>;
}
