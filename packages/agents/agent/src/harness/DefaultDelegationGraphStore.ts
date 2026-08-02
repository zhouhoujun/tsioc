import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { DelegationEdgeInput, DelegationEdgeRecord, DelegationEdgeStatus, DelegationGraphStore, DelegationTreeNode, DelegationTreeOptions } from './DelegationGraphStore';
import { InMemoryDelegationGraphStore } from './InMemoryDelegationGraphStore';
import { TypeOrmDelegationGraphStore } from './TypeOrmDelegationGraphStore';

@Injectable()
export class DefaultDelegationGraphStore extends DelegationGraphStore {
    private resolved?: DelegationGraphStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryDelegationGraphStore
    ) {
        super();
    }

    async append(edge: DelegationEdgeInput): Promise<DelegationEdgeRecord> {
        return this.resolveStore().append(edge);
    }

    async markClosed(parentSessionId: string, childSessionId: string, status?: DelegationEdgeStatus, completedAt?: number): Promise<void> {
        return this.resolveStore().markClosed(parentSessionId, childSessionId, status, completedAt);
    }

    async children(parentSessionId: string, options?: { status?: DelegationEdgeStatus | DelegationEdgeStatus[]; limit?: number }): Promise<DelegationEdgeRecord[]> {
        return this.resolveStore().children(parentSessionId, options);
    }

    async ancestors(childSessionId: string, options?: { limit?: number }): Promise<DelegationEdgeRecord[]> {
        return this.resolveStore().ancestors(childSessionId, options);
    }

    async tree(parentSessionId: string, options?: DelegationTreeOptions): Promise<DelegationTreeNode> {
        return this.resolveStore().tree(parentSessionId, options);
    }

    async list(options?: { sessionId?: string; limit?: number; offset?: number }): Promise<DelegationEdgeRecord[]> {
        return this.resolveStore().list(options);
    }

    private resolveStore(): DelegationGraphStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmDelegationGraphStore(adapter) : this.fallback;
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
