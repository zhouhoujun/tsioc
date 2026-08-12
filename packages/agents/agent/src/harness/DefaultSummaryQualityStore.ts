import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { SummaryQualityAggregate, SummaryQualityRecord, SummaryQualityStore } from './SummaryQualityStore';
import { InMemorySummaryQualityStore } from './InMemorySummaryQualityStore';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultSummaryQualityStore extends SummaryQualityStore {
    private resolved?: SummaryQualityStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemorySummaryQualityStore
    ) {
        super();
    }

    async append(record: SummaryQualityRecord): Promise<void> {
        const store = this.resolveStore();
        await store.append(record);
    }

    async list(options?: { provider?: string; model?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]> {
        const store = this.resolveStore();
        return store.list(options);
    }

    async aggregate(provider?: string, model?: string): Promise<SummaryQualityAggregate[]> {
        const store = this.resolveStore();
        return store.aggregate(provider, model);
    }

    private resolveStore(): SummaryQualityStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmSummaryQualityStore(adapter) : this.fallback;
        return this.resolved;
    }
}
