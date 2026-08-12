import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { CompactionHistoryAggregate, CompactionHistoryRecord, CompactionHistoryStore, CompactionHistoryTrendPoint } from './CompactionHistoryStore';
import { InMemoryCompactionHistoryStore } from './InMemoryCompactionHistoryStore';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

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

    async aggregate(sessionId?: string): Promise<CompactionHistoryAggregate[]> {
        const store = this.resolveStore();
        return store.aggregate(sessionId);
    }

    async trend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }): Promise<CompactionHistoryTrendPoint[]> {
        const store = this.resolveStore();
        return store.trend(sessionId, options);
    }

    private resolveStore(): CompactionHistoryStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmCompactionHistoryStore(adapter) : this.fallback;
        return this.resolved;
    }
}
