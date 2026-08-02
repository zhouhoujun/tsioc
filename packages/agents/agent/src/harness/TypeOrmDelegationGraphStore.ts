import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@tsdi/ioc';
import { In } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentDelegationEdgeEntity } from '../memory/entities';
import { DelegationEdgeInput, DelegationEdgeRecord, DelegationEdgeStatus, DelegationGraphStore, DelegationTreeNode, DelegationTreeOptions, buildDelegationLineage, buildDelegationTree } from './DelegationGraphStore';

@Injectable()
export class TypeOrmDelegationGraphStore extends DelegationGraphStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async append(edge: DelegationEdgeInput): Promise<DelegationEdgeRecord> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const record: DelegationEdgeRecord = {
            id: edge.id ?? `edge-${randomUUID()}`,
            parentSessionId: edge.parentSessionId,
            childSessionId: edge.childSessionId,
            kind: edge.kind,
            status: edge.status ?? 'active',
            createdAt: edge.createdAt ?? Date.now(),
            completedAt: edge.completedAt,
            metadata: edge.metadata
        };
        await repo.save(repo.create({
            id: record.id,
            parentSessionId: record.parentSessionId,
            childSessionId: record.childSessionId,
            kind: record.kind ?? null,
            status: record.status,
            createdAt: record.createdAt,
            completedAt: record.completedAt ?? null,
            metadata: record.metadata ?? null
        }));
        return record;
    }

    async markClosed(parentSessionId: string, childSessionId: string, status: DelegationEdgeStatus = 'completed', completedAt: number = Date.now()): Promise<void> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const target = await repo.findOne({
            where: { parentSessionId, childSessionId, status: 'active' } as any,
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        if (!target) {
            return;
        }
        await repo.update(target.id, { status, completedAt } as any);
    }

    async children(parentSessionId: string, options?: { status?: DelegationEdgeStatus | DelegationEdgeStatus[]; limit?: number }): Promise<DelegationEdgeRecord[]> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const records = await repo.find({
            where: {
                parentSessionId,
                ...(options?.status ? { status: In(normalizeStatuses(options.status)) } : {})
            } as any,
            order: { createdAt: 'ASC', id: 'ASC' } as any,
            take: options?.limit ?? 200
        });
        return records.map(record => this.toRecord(record));
    }

    async ancestors(childSessionId: string, options?: { limit?: number }): Promise<DelegationEdgeRecord[]> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const records = await repo.find({
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        const lineage = buildDelegationLineage(records.map(record => this.toRecord(record)), childSessionId);
        return options?.limit === undefined ? lineage : lineage.slice(0, options.limit);
    }

    async tree(parentSessionId: string, options?: DelegationTreeOptions): Promise<DelegationTreeNode> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const records = await repo.find({
            order: { createdAt: 'ASC', id: 'ASC' } as any
        });
        return buildDelegationTree(records.map(record => this.toRecord(record)), parentSessionId, options);
    }

    async list(options?: { sessionId?: string; limit?: number; offset?: number }): Promise<DelegationEdgeRecord[]> {
        const repo = this.adapter.getRepository(AgentDelegationEdgeEntity);
        const sessionId = options?.sessionId?.trim() || undefined;
        const records = await repo.find({
            where: sessionId
                ? [{ parentSessionId: sessionId }, { childSessionId: sessionId }] as any
                : undefined,
            order: { createdAt: 'ASC', id: 'ASC' } as any,
            skip: options?.offset ?? 0,
            take: options?.limit ?? 200
        });
        return records.map(record => this.toRecord(record));
    }

    private toRecord(record: AgentDelegationEdgeEntity): DelegationEdgeRecord {
        return {
            id: record.id,
            parentSessionId: record.parentSessionId,
            childSessionId: record.childSessionId,
            kind: record.kind ?? undefined,
            status: record.status as DelegationEdgeStatus,
            createdAt: Number(record.createdAt),
            completedAt: record.completedAt === null || record.completedAt === undefined
                ? undefined
                : Number(record.completedAt),
            metadata: record.metadata ?? undefined
        };
    }
}

function normalizeStatuses(status: DelegationEdgeStatus | DelegationEdgeStatus[]): DelegationEdgeStatus[] {
    return Array.from(new Set(Array.isArray(status) ? status : [status]));
}
