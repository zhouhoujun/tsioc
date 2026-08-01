import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { SummaryQualityAggregate, SummaryQualityRecord, SummaryQualityStore, aggregateSummaryQuality } from './SummaryQualityStore';
import { AgentSummaryQualityEntity } from '../memory/entities';

@Injectable()
export class TypeOrmSummaryQualityStore extends SummaryQualityStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async append(record: SummaryQualityRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentSummaryQualityEntity);
        await repo.save(repo.create({
            id: record.id,
            provider: record.provider,
            model: record.model ?? null,
            total: record.total,
            fieldCompleteness: record.fieldCompleteness,
            annotationQuality: record.annotationQuality,
            lengthBalance: record.lengthBalance,
            truncationScore: record.truncationScore,
            fallbackUsed: record.fallbackUsed,
            summaryLength: record.summaryLength,
            createdAt: record.createdAt,
            metadata: record.metadata ?? null
        }));
    }

    async list(options?: { provider?: string; model?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]> {
        const repo = this.adapter.getRepository(AgentSummaryQualityEntity);
        const where: any = {};
        if (options?.provider) {
            where.provider = options.provider;
        }
        if (options?.model) {
            where.model = options.model;
        }
        const records = await repo.find({
            where: Object.keys(where).length > 0 ? where : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any,
            skip: options?.offset ?? 0,
            take: options?.limit ?? 200
        });
        return records.map(record => this.toRecord(record));
    }

    async aggregate(provider?: string, model?: string): Promise<SummaryQualityAggregate[]> {
        const repo = this.adapter.getRepository(AgentSummaryQualityEntity);
        const where: any = {};
        if (provider) {
            where.provider = provider;
        }
        if (model) {
            where.model = model;
        }
        const records = await repo.find({
            where: Object.keys(where).length > 0 ? where : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        return aggregateSummaryQuality(records.map(record => this.toRecord(record)), provider, model);
    }

    private toRecord(record: AgentSummaryQualityEntity): SummaryQualityRecord {
        return {
            id: record.id,
            provider: record.provider,
            model: record.model ?? undefined,
            total: record.total,
            fieldCompleteness: record.fieldCompleteness,
            annotationQuality: record.annotationQuality,
            lengthBalance: record.lengthBalance,
            truncationScore: record.truncationScore,
            fallbackUsed: record.fallbackUsed,
            summaryLength: record.summaryLength,
            createdAt: Number(record.createdAt),
            metadata: record.metadata ?? undefined
        };
    }
}
