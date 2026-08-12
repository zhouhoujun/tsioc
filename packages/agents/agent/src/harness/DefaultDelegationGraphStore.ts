import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext, UuidGenerator } from '@tsdi/core';
import { DelegationEdgeInput, DelegationEdgeRecord, DelegationEdgeStatus, DelegationGraphStore, DelegationTreeNode, DelegationTreeOptions } from './DelegationGraphStore';
import { InMemoryDelegationGraphStore } from './InMemoryDelegationGraphStore';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultDelegationGraphStore extends DelegationGraphStore {
    private resolved?: DelegationGraphStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryDelegationGraphStore,
        private uuid: UuidGenerator
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
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmDelegationGraphStore(adapter, this.uuid) : this.fallback;
        return this.resolved;
    }
}
