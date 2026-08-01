import { Injectable } from '@tsdi/ioc';
import { SummaryQualityAggregate, SummaryQualityRecord, SummaryQualityStore, aggregateSummaryQuality } from './SummaryQualityStore';

@Injectable()
export class InMemorySummaryQualityStore extends SummaryQualityStore {
    private records: SummaryQualityRecord[] = [];

    async append(record: SummaryQualityRecord): Promise<void> {
        this.records = [...this.records, this.cloneRecord(record)];
    }

    async list(options?: { provider?: string; model?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]> {
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? this.records.length;
        return this.records
            .filter(record => (!options?.provider || record.provider === options.provider)
                && (!options?.model || record.model === options.model))
            .slice(offset, offset + limit)
            .map(record => this.cloneRecord(record));
    }

    async aggregate(provider?: string, model?: string): Promise<SummaryQualityAggregate[]> {
        return aggregateSummaryQuality(this.records, provider, model);
    }

    private cloneRecord(record: SummaryQualityRecord): SummaryQualityRecord {
        return {
            ...record,
            metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : undefined
        };
    }
}
