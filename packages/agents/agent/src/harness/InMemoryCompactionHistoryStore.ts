import { Injectable } from '@tsdi/ioc';
import { CompactionHistoryAggregate, CompactionHistoryRecord, CompactionHistoryStore, aggregateCompactionHistory } from './CompactionHistoryStore';

@Injectable()
export class InMemoryCompactionHistoryStore extends CompactionHistoryStore {
    private records: CompactionHistoryRecord[] = [];

    async append(record: CompactionHistoryRecord): Promise<void> {
        this.records = [...this.records, this.cloneRecord(record)];
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<CompactionHistoryRecord[]> {
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? this.records.length;
        return this.records
            .filter(record => !sessionId || record.sessionId === sessionId)
            .slice(offset, offset + limit)
            .map(record => this.cloneRecord(record));
    }

    async aggregate(sessionId?: string): Promise<CompactionHistoryAggregate[]> {
        return aggregateCompactionHistory(this.records, sessionId);
    }

    private cloneRecord(record: CompactionHistoryRecord): CompactionHistoryRecord {
        return {
            ...record,
            metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : undefined
        };
    }
}
