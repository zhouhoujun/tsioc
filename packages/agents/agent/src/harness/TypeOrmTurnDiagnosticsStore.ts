import { Inject, Injectable } from '@tsdi/ioc';
import { In } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { TurnDiagnosticsAggregate, TurnDiagnosticsRecord, TurnDiagnosticsStore, TurnDiagnosticsTrendPoint, aggregateTurnDiagnostics, buildTurnDiagnosticsTrend } from './TurnDiagnosticsStore';
import { AgentTurnDiagnosticsEntity } from '../memory/entities';
import { PromptCacheRuntimeMetadata } from '../model/ModelProviderOptions';
import { EvidenceLedgerSnapshot } from './EvidenceLedger';

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
            workspaceId: record.workspaceId ?? null,
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
            evidence: record.evidence ?? null,
            metadata: record.metadata ?? null
        }));
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number; workspaceId?: string; order?: 'ASC' | 'DESC' }): Promise<TurnDiagnosticsRecord[]> {
        const repo = this.adapter.getRepository(AgentTurnDiagnosticsEntity);
        const where: Record<string, any> = {};
        if (sessionId) {
            where.sessionId = sessionId;
        }
        if (options?.workspaceId) {
            where.workspaceId = options.workspaceId;
        }
        const sort: 'ASC' | 'DESC' = options?.order ?? 'ASC';
        const records = await repo.find({
            where: Object.keys(where).length > 0 ? where : undefined,
            order: { createdAt: sort, id: sort },
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

    async trend(sessionIds?: string[], options?: { bucketSize?: number; maxBuckets?: number }): Promise<TurnDiagnosticsTrendPoint[]> {
        const repo = this.adapter.getRepository(AgentTurnDiagnosticsEntity);
        const records = await repo.find({
            where: sessionIds && sessionIds.length > 0 ? ({ sessionId: In(sessionIds) } as any) : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        return buildTurnDiagnosticsTrend(records.map(record => this.toRecord(record)), { sessionIds, bucketSize: options?.bucketSize, maxBuckets: options?.maxBuckets });
    }

    private toRecord(record: AgentTurnDiagnosticsEntity): TurnDiagnosticsRecord {
        return {
            id: record.id,
            sessionId: record.sessionId,
            workspaceId: record.workspaceId ?? undefined,
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
            evidence: record.evidence as EvidenceLedgerSnapshot | undefined,
            metadata: record.metadata ?? undefined
        };
    }
}
