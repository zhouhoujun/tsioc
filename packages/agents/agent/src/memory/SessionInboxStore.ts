import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentSessionInboxEntity } from './entities-inbox';
import type { AgentSessionInboxItem } from './SessionStore';

/** Durable ordered input queue, kept out of the already-large session store. */
export async function listSessionInbox(adapter: TypeormAdapter, sessionId: string): Promise<AgentSessionInboxItem[]> {
    const rows = await adapter.getRepository(AgentSessionInboxEntity).find({
        where: { sessionId } as any,
        order: { seq: 'ASC' } as any
    });
    return rows.map(row => ({
        itemId: row.itemId,
        kind: row.kind,
        payload: row.payload || {},
        state: row.state,
        seq: Number(row.seq),
        createdAt: Number(row.createdAt),
        updatedAt: Number(row.updatedAt)
    }));
}

/** Replace the whole queue atomically; `seq` is rebuilt from array order. */
export async function replaceSessionInbox(
    adapter: TypeormAdapter,
    sessionId: string,
    items: AgentSessionInboxItem[]
): Promise<AgentSessionInboxItem[]> {
    const repository = adapter.getRepository(AgentSessionInboxEntity);
    const now = Date.now();
    await repository.manager.transaction(async manager => {
        const repo = manager.getRepository(AgentSessionInboxEntity);
        await repo.delete({ sessionId } as any);
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            await repo.save(repo.create({
                sessionId,
                itemId: String(item?.itemId || `inbox-${now}-${index}`),
                kind: String(item?.kind || 'user'),
                payload: item?.payload || {},
                state: String(item?.state || 'queued'),
                seq: index + 1,
                createdAt: Number(item?.createdAt || now),
                updatedAt: now
            }));
        }
    });
    return listSessionInbox(adapter, sessionId);
}
