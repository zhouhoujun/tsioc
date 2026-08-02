import { randomUUID } from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { DelegationEdgeInput, DelegationEdgeRecord, DelegationEdgeStatus, DelegationGraphStore, DelegationTreeNode, DelegationTreeOptions, buildDelegationLineage, buildDelegationTree } from './DelegationGraphStore';

@Injectable()
export class InMemoryDelegationGraphStore extends DelegationGraphStore {
    private edges: DelegationEdgeRecord[] = [];

    async append(edge: DelegationEdgeInput): Promise<DelegationEdgeRecord> {
        const record: DelegationEdgeRecord = {
            id: edge.id ?? `edge-${randomUUID()}`,
            parentSessionId: edge.parentSessionId,
            childSessionId: edge.childSessionId,
            kind: edge.kind,
            status: edge.status ?? 'active',
            createdAt: edge.createdAt ?? Date.now(),
            completedAt: edge.completedAt,
            metadata: edge.metadata ? JSON.parse(JSON.stringify(edge.metadata)) : undefined
        };
        this.edges = [...this.edges, record];
        return this.cloneRecord(record);
    }

    async markClosed(parentSessionId: string, childSessionId: string, status: DelegationEdgeStatus = 'completed', completedAt: number = Date.now()): Promise<void> {
        const target = this.edges.find(edge =>
            edge.parentSessionId === parentSessionId && edge.childSessionId === childSessionId
        );
        if (!target || target.status !== 'active') {
            return;
        }
        this.edges = this.edges.map(edge =>
            edge.id === target.id
                ? { ...edge, status, completedAt }
                : edge
        );
    }

    async children(parentSessionId: string, options?: { status?: DelegationEdgeStatus | DelegationEdgeStatus[]; limit?: number }): Promise<DelegationEdgeRecord[]> {
        const statuses = normalizeStatuses(options?.status);
        const limit = Number.isFinite(options?.limit) && (options?.limit as number) >= 0
            ? Math.floor(options?.limit as number)
            : undefined;
        return this.edges
            .filter(edge => edge.parentSessionId === parentSessionId && (!statuses || statuses.includes(edge.status)))
            .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
            .slice(0, limit)
            .map(edge => this.cloneRecord(edge));
    }

    async ancestors(childSessionId: string, options?: { limit?: number }): Promise<DelegationEdgeRecord[]> {
        const limit = Number.isFinite(options?.limit) && (options?.limit as number) >= 0
            ? Math.floor(options?.limit as number)
            : undefined;
        const lineage = buildDelegationLineage(this.edges, childSessionId);
        return (limit === undefined ? lineage : lineage.slice(0, limit)).map(edge => this.cloneRecord(edge));
    }

    async tree(parentSessionId: string, options?: DelegationTreeOptions): Promise<DelegationTreeNode> {
        return buildDelegationTree(this.edges, parentSessionId, options);
    }

    async list(options?: { sessionId?: string; limit?: number; offset?: number }): Promise<DelegationEdgeRecord[]> {
        const sessionId = options?.sessionId?.trim() || undefined;
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? this.edges.length;
        return this.edges
            .filter(edge => !sessionId || edge.parentSessionId === sessionId || edge.childSessionId === sessionId)
            .slice(offset, offset + limit)
            .map(edge => this.cloneRecord(edge));
    }

    private cloneRecord(record: DelegationEdgeRecord): DelegationEdgeRecord {
        return {
            ...record,
            metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : undefined
        };
    }
}

function normalizeStatuses(status?: DelegationEdgeStatus | DelegationEdgeStatus[]): DelegationEdgeStatus[] | undefined {
    if (!status) {
        return undefined;
    }
    const list = Array.isArray(status) ? status : [status];
    return list.length > 0 ? Array.from(new Set(list)) : undefined;
}
