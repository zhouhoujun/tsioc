import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { TurnDiagnosticsAggregate, TurnDiagnosticsRecord, TurnDiagnosticsStore, TurnDiagnosticsTrendPoint } from './TurnDiagnosticsStore';
import { InMemoryTurnDiagnosticsStore } from './InMemoryTurnDiagnosticsStore';
import { TypeOrmTurnDiagnosticsStore } from './TypeOrmTurnDiagnosticsStore';

@Injectable()
export class DefaultTurnDiagnosticsStore extends TurnDiagnosticsStore {
    private resolved?: TurnDiagnosticsStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryTurnDiagnosticsStore
    ) {
        super();
    }

    async append(record: TurnDiagnosticsRecord): Promise<void> {
        const store = this.resolveStore();
        await store.append(record);
    }

    async list(sessionId?: string, options?: { limit?: number; offset?: number }): Promise<TurnDiagnosticsRecord[]> {
        const store = this.resolveStore();
        return store.list(sessionId, options);
    }

    async aggregate(sessionIds?: string[]): Promise<TurnDiagnosticsAggregate> {
        const store = this.resolveStore();
        return store.aggregate(sessionIds);
    }

    async trend(sessionIds?: string[], options?: { bucketSize?: number; maxBuckets?: number }): Promise<TurnDiagnosticsTrendPoint[]> {
        const store = this.resolveStore();
        return store.trend(sessionIds, options);
    }

    private resolveStore(): TurnDiagnosticsStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmTurnDiagnosticsStore(adapter) : this.fallback;
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
