import { Injectable } from '@tsdi/ioc';
import { TurnDiagnosticsAggregate, TurnDiagnosticsRecord, TurnDiagnosticsStore, TurnDiagnosticsTrendPoint, aggregateTurnDiagnostics, buildTurnDiagnosticsTrend } from './TurnDiagnosticsStore';

@Injectable()
export class InMemoryTurnDiagnosticsStore extends TurnDiagnosticsStore {
    private records: TurnDiagnosticsRecord[] = [];

    async append(record: TurnDiagnosticsRecord): Promise<void> {
        this.records = [...this.records, this.cloneRecord(record)];
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<TurnDiagnosticsRecord[]> {
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? this.records.length;
        return this.records
            .filter(record => !sessionId || record.sessionId === sessionId)
            .slice(offset, offset + limit)
            .map(record => this.cloneRecord(record));
    }

    async aggregate(sessionIds?: string[]): Promise<TurnDiagnosticsAggregate> {
        return aggregateTurnDiagnostics(this.records, sessionIds);
    }

    async trend(sessionIds?: string[], options?: { bucketSize?: number; maxBuckets?: number }): Promise<TurnDiagnosticsTrendPoint[]> {
        return buildTurnDiagnosticsTrend(this.records, { sessionIds, bucketSize: options?.bucketSize, maxBuckets: options?.maxBuckets });
    }

    private cloneRecord(record: TurnDiagnosticsRecord): TurnDiagnosticsRecord {
        return {
            ...record,
            promptCache: record.promptCache ? JSON.parse(JSON.stringify(record.promptCache)) : undefined,
            metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : undefined
        };
    }
}
