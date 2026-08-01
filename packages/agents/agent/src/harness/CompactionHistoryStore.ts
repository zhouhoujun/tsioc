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
 * Persistent store for compaction history, mirroring the {@link AuditSink}
 * pattern: an abstract contract with in-memory, TypeORM, and environment-aware
 * default implementations.
 */
@Abstract()
export abstract class CompactionHistoryStore {
    abstract append(record: CompactionHistoryRecord): Promise<void>;
    abstract list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<CompactionHistoryRecord[]>;
}
