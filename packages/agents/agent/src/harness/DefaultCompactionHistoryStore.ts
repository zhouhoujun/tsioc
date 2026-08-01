import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { CompactionHistoryRecord, CompactionHistoryStore } from './CompactionHistoryStore';
import { InMemoryCompactionHistoryStore } from './InMemoryCompactionHistoryStore';
import { TypeOrmCompactionHistoryStore } from './TypeOrmCompactionHistoryStore';

@Injectable()
export class DefaultCompactionHistoryStore extends CompactionHistoryStore {
    private resolved?: CompactionHistoryStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryCompactionHistoryStore
    ) {
        super();
    }

    async append(record: CompactionHistoryRecord): Promise<void> {
        const store = this.resolveStore();
        await store.append(record);
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<CompactionHistoryRecord[]> {
        const store = this.resolveStore();
        return store.list(sessionId, options);
    }

    private resolveStore(): CompactionHistoryStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmCompactionHistoryStore(adapter) : this.fallback;
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
