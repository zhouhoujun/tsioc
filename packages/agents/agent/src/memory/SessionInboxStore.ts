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

/** Atomically take the oldest queued item of a kind. */
export async function takeSessionInboxItem(
    adapter: TypeormAdapter,
    sessionId: string,
    kind: string
): Promise<import('./SessionStore').AgentSessionInboxItem | undefined> {
    const repository = adapter.getRepository(AgentSessionInboxEntity);
    return repository.manager.transaction(async manager => {
        const repo = manager.getRepository(AgentSessionInboxEntity);
        const row = await repo.findOne({
            where: { sessionId, kind, state: 'queued' } as any,
            order: { seq: 'ASC' } as any
        });
        if (!row) {
            return undefined;
        }
        await repo.delete({ id: row.id } as any);
        return {
            itemId: row.itemId,
            kind: row.kind,
            payload: row.payload || {},
            state: row.state,
            seq: Number(row.seq),
            createdAt: Number(row.createdAt),
            updatedAt: Number(row.updatedAt)
        };
    });
}

/** Append one item with the next sequence, without touching the rest. */
export async function appendSessionInboxItem(
    adapter: TypeormAdapter,
    sessionId: string,
    item: import('./SessionStore').AgentSessionInboxItem
): Promise<import('./SessionStore').AgentSessionInboxItem> {
    const repository = adapter.getRepository(AgentSessionInboxEntity);
    const now = Date.now();
    await repository.manager.transaction(async manager => {
        const repo = manager.getRepository(AgentSessionInboxEntity);
        const last = await repo.findOne({ where: { sessionId } as any, order: { seq: 'DESC' } as any });
        await repo.save(repo.create({
            sessionId,
            itemId: String(item.itemId || `inbox-${now}`),
            kind: String(item.kind || 'user'),
            payload: item.payload || {},
            state: String(item.state || 'queued'),
            seq: Number(last?.seq || 0) + 1,
            createdAt: Number(item.createdAt || now),
            updatedAt: now
        }));
    });
    const items = await listSessionInbox(adapter, sessionId);
    return items[items.length - 1];
}
