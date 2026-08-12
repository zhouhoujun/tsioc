import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { InMemoryMemoryStore } from './InMemoryMemoryStore';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultMemoryStore extends MemoryStore {
    private resolved?: MemoryStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryMemoryStore
    ) {
        super();
    }

    async put(record: AgentMemoryRecord): Promise<void> {
        await this.resolveStore().put(record);
    }

    async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        return this.resolveStore().search(query, sessionId);
    }

    async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        return this.resolveStore().getAll(sessionId);
    }

    async delete(id: string, sessionId?: string, scope?: AgentMemoryRecord['scope']): Promise<number> {
        return this.resolveStore().delete(id, sessionId, scope);
    }

    async deleteBySession(sessionId: string): Promise<number> {
        return this.resolveStore().deleteBySession(sessionId);
    }

    private resolveStore(): MemoryStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmMemoryStore(adapter) : this.fallback;
        return this.resolved;
    }
}
