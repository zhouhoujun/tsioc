import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentSessionLeaseEntity } from './entities-lease';
import { queueTransaction } from './TransactionQueue';

/**
 * Atomically claim/renew/release a session's turn lease. SQLite serializes the
 * transaction, so two runtimes cannot both observe an expired/absent lease.
 */
export async function acquireSessionLease(
    adapter: TypeormAdapter,
    sessionId: string,
    ownerId: string,
    ttlMs: number
): Promise<boolean> {
    return queueTransaction(adapter, async manager => {
        const repo = manager.getRepository(AgentSessionLeaseEntity);
        const now = Date.now();
        const existing = await repo.findOne({ where: { sessionId } as any });
        if (existing && existing.ownerId !== ownerId && Number(existing.leaseUntil) > now) {
            return false;
        }
        const next = existing ?? repo.create({ sessionId });
        next.ownerId = ownerId;
        next.leaseUntil = now + ttlMs;
        next.updatedAt = now;
        await repo.save(next);
        return true;
    });
}

export async function renewSessionLease(
    adapter: TypeormAdapter,
    sessionId: string,
    ownerId: string,
    ttlMs: number
): Promise<boolean> {
    const repository = adapter.getRepository(AgentSessionLeaseEntity);
    const result = await repository.createQueryBuilder()
        .update(AgentSessionLeaseEntity)
        .set({ leaseUntil: Date.now() + ttlMs, updatedAt: Date.now() })
        .where('sessionId = :sessionId AND ownerId = :ownerId AND leaseUntil > :now', {
            sessionId,
            ownerId,
            now: Date.now()
        })
        .execute();
    return (result.affected ?? 0) > 0;
}

export async function releaseSessionLease(
    adapter: TypeormAdapter,
    sessionId: string,
    ownerId: string
): Promise<void> {
    await adapter.getRepository(AgentSessionLeaseEntity).delete({ sessionId, ownerId } as any);
}
