import { Injectable } from '@tsdi/ioc';
import { AgentAuditRecord, AuditSink } from './AuditSink';

@Injectable()
export class InMemoryAuditSink extends AuditSink {
    private records: AgentAuditRecord[] = [];

    async append(record: AgentAuditRecord): Promise<void> {
        this.records = [...this.records, this.cloneRecord(record)];
    }

    async list(sessionId?: string): Promise<AgentAuditRecord[]> {
        return this.records
            .filter(record => !sessionId || record.sessionId === sessionId)
            .map(record => this.cloneRecord(record));
    }

    private cloneRecord(record: AgentAuditRecord): AgentAuditRecord {
        return {
            ...record,
            metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : undefined
        };
    }
}
