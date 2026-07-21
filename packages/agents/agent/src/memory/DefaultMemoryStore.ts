import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMemoryRecord, MemoryStore } from './MemoryStore';
import { InMemoryMemoryStore } from './InMemoryMemoryStore';
import { TypeOrmMemoryStore } from './TypeOrmMemoryStore';

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

    private resolveStore(): MemoryStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmMemoryStore(adapter) : this.fallback;
        return this.resolved;
    }

    private tryGetAdapter(): TypeormAdapter | null {
        if (!this.app) {
            return null;
        }
        try {
            return this.app.get(TypeormAdapter, null) as TypeormAdapter | null;
        } catch {
            return null;
        }
    }
}
