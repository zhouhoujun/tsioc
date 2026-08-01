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
}
