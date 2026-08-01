import { Inject, Injectable } from '@tsdi/ioc';
import { In } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { TurnDiagnosticsAggregate, TurnDiagnosticsRecord, TurnDiagnosticsStore, aggregateTurnDiagnostics } from './TurnDiagnosticsStore';
import { AgentTurnDiagnosticsEntity } from '../memory/entities';
import { PromptCacheRuntimeMetadata } from '../model/ModelProviderOptions';

@Injectable()
export class TypeOrmTurnDiagnosticsStore extends TurnDiagnosticsStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async append(record: TurnDiagnosticsRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentTurnDiagnosticsEntity);
        await repo.save(repo.create({
            id: record.id,
            sessionId: record.sessionId,
            createdAt: record.createdAt,
            emptyResponseRetryCount: record.emptyResponseRetryCount,
            followUpRecoveryCount: record.followUpRecoveryCount,
            followUpContextRewritten: record.followUpContextRewritten,
            finalAssistantWasClarification: record.finalAssistantWasClarification,
            repeatedClarificationDetected: record.repeatedClarificationDetected,
            compactionCount: record.compactionCount,
            totalTokenSavings: record.totalTokenSavings,
            compressionRatio: record.compressionRatio ?? null,
            compactionLevel: record.compactionLevel ?? null,
            promptCache: record.promptCache ?? null,
            metadata: record.metadata ?? null
        }));
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<TurnDiagnosticsRecord[]> {
        const repo = this.adapter.getRepository(AgentTurnDiagnosticsEntity);
        const records = await repo.find({
            where: sessionId ? ({ sessionId } as any) : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any,
            skip: options?.offset ?? 0,
            take: options?.limit ?? 200
        });
        return records.map(record => this.toRecord(record));
    }

    async aggregate(sessionIds?: string[]): Promise<TurnDiagnosticsAggregate> {
        const repo = this.adapter.getRepository(AgentTurnDiagnosticsEntity);
        const records = await repo.find({
            where: sessionIds && sessionIds.length > 0 ? ({ sessionId: In(sessionIds) } as any) : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        return aggregateTurnDiagnostics(records.map(record => this.toRecord(record)), sessionIds);
    }

    private toRecord(record: AgentTurnDiagnosticsEntity): TurnDiagnosticsRecord {
        return {
            id: record.id,
            sessionId: record.sessionId,
            createdAt: Number(record.createdAt),
            emptyResponseRetryCount: record.emptyResponseRetryCount,
            followUpRecoveryCount: record.followUpRecoveryCount,
            followUpContextRewritten: record.followUpContextRewritten,
            finalAssistantWasClarification: record.finalAssistantWasClarification,
            repeatedClarificationDetected: record.repeatedClarificationDetected,
            compactionCount: record.compactionCount,
            totalTokenSavings: record.totalTokenSavings,
            compressionRatio: record.compressionRatio ?? undefined,
            compactionLevel: record.compactionLevel ?? undefined,
            promptCache: record.promptCache as PromptCacheRuntimeMetadata | undefined,
            metadata: record.metadata ?? undefined
        };
    }
}
