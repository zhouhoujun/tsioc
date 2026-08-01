import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { SummaryQualityAggregate, SummaryQualityRecord, SummaryQualityStore } from './SummaryQualityStore';
import { InMemorySummaryQualityStore } from './InMemorySummaryQualityStore';
import { TypeOrmSummaryQualityStore } from './TypeOrmSummaryQualityStore';

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

    async list(options?: { provider?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]> {
        const store = this.resolveStore();
        return store.list(options);
    }

    async aggregate(provider?: string): Promise<SummaryQualityAggregate[]> {
        const store = this.resolveStore();
        return store.aggregate(provider);
    }

    private resolveStore(): SummaryQualityStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmSummaryQualityStore(adapter) : this.fallback;
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
