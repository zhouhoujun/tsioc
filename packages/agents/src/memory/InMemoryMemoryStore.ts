import { Injectable } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';

@Injectable()
export class InMemoryMemoryStore extends MemoryStore {
    private records: AgentMemoryRecord[] = [];

    async put(record: AgentMemoryRecord): Promise<void> {
        this.records.push(record);
    }

    async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        const lower = query.toLowerCase();
        return this.records.filter(record => {
            const scoped = record.scope === 'global' || !sessionId || record.sessionId === sessionId;
            return scoped && (
                record.key.toLowerCase().includes(lower) ||
                record.value.toLowerCase().includes(lower)
            );
        });
    }

    async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        return this.records.filter(record => record.scope === 'global' || !sessionId || record.sessionId === sessionId);
    }
}
