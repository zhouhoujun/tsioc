import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { CompactionHistoryRecord, CompactionHistoryStore } from './CompactionHistoryStore';
import { AgentCompactionHistoryEntity } from '../memory/entities';

@Injectable()
export class TypeOrmCompactionHistoryStore extends CompactionHistoryStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async append(record: CompactionHistoryRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentCompactionHistoryEntity);
        await repo.save(repo.create({
            id: record.id,
            sessionId: record.sessionId,
            strategy: record.strategy,
            compactionTriggered: record.compactionTriggered,
            level: record.level,
            summaryInserted: record.summaryInserted,
            beforeMessageCount: record.beforeMessageCount,
            afterMessageCount: record.afterMessageCount,
            beforeTokens: record.beforeTokens,
            afterTokens: record.afterTokens,
            compactedMessageCount: record.compactedMessageCount,
            preservedAnchorCount: record.preservedAnchorCount,
            recentMessageCount: record.recentMessageCount,
            prunedMessageCount: record.prunedMessageCount,
            toolMessagesCompacted: record.toolMessagesCompacted,
            compressionRatio: record.compressionRatio,
            cumulativeTokenSavings: record.cumulativeTokenSavings,
            createdAt: record.createdAt,
            metadata: record.metadata
        }));
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<CompactionHistoryRecord[]> {
        const repo = this.adapter.getRepository(AgentCompactionHistoryEntity);
        const records = await repo.find({
            where: sessionId ? ({ sessionId } as any) : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any,
            skip: options?.offset ?? 0,
            take: options?.limit ?? 200
        });
        return records.map(record => ({
            id: record.id,
            sessionId: record.sessionId,
            strategy: record.strategy as CompactionHistoryRecord['strategy'],
            compactionTriggered: record.compactionTriggered,
            level: record.level as CompactionHistoryRecord['level'],
            summaryInserted: record.summaryInserted,
            beforeMessageCount: record.beforeMessageCount,
            afterMessageCount: record.afterMessageCount,
            beforeTokens: record.beforeTokens,
            afterTokens: record.afterTokens,
            compactedMessageCount: record.compactedMessageCount,
            preservedAnchorCount: record.preservedAnchorCount,
            recentMessageCount: record.recentMessageCount,
            prunedMessageCount: record.prunedMessageCount,
            toolMessagesCompacted: record.toolMessagesCompacted,
            compressionRatio: record.compressionRatio,
            cumulativeTokenSavings: record.cumulativeTokenSavings,
            createdAt: Number(record.createdAt),
            metadata: record.metadata ?? undefined
        }));
    }
}
