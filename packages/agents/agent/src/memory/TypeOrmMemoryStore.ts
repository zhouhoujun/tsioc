import { Inject, Injectable } from '@tsdi/ioc';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMemoryEntity } from './entities';

@Injectable()
export class TypeOrmMemoryStore extends MemoryStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async put(record: AgentMemoryRecord): Promise<void> {
        const repo = this.adapter.getRepository(AgentMemoryEntity);
        const entity = repo.create({
            id: record.id,
            sessionId: record.sessionId,
            key: record.key,
            value: record.value,
            scope: record.scope,
            namespace: record.namespace,
            category: record.category,
            metadata: record.metadata,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        });
        await repo.save(entity);
    }

    async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        const lower = query.toLowerCase();
        const records = await this.getAll(sessionId);
        return records.filter(record => record.key.toLowerCase().includes(lower) || record.value.toLowerCase().includes(lower));
    }

    async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        const repo = this.adapter.getRepository(AgentMemoryEntity);
        const records = await repo.find({ order: { createdAt: 'ASC', id: 'ASC' } as any });
        return records
            .filter(record => record.scope === 'global' || !sessionId || record.sessionId === sessionId)
            .map(record => ({
                id: record.id,
                sessionId: record.sessionId ?? undefined,
                key: record.key,
                value: record.value,
                scope: record.scope as AgentMemoryRecord['scope'],
                namespace: record.namespace ?? undefined,
                category: record.category ?? undefined,
                metadata: record.metadata ?? undefined,
                createdAt: Number(record.createdAt),
                updatedAt: record.updatedAt == null ? undefined : Number(record.updatedAt)
            }));
    }
}
