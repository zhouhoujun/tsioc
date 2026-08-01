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
export function aggregateTurnDiagnostics(records: TurnDiagnosticsRecord[], sessionIds?: string[]): TurnDiagnosticsAggregate {
    const scoped = sessionIds && sessionIds.length > 0
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
 * Persistent store for turn diagnostics, mirroring the {@link AuditSink}
 * pattern: an abstract contract with in-memory, TypeORM, and environment-aware
 * default implementations.
 */
@Abstract()
export abstract class TurnDiagnosticsStore {
    abstract append(record: TurnDiagnosticsRecord): Promise<void>;
    abstract list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<TurnDiagnosticsRecord[]>;
    abstract aggregate(sessionIds?: string[]): Promise<TurnDiagnosticsAggregate>;
}
