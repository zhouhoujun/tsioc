import type { EntityManager } from 'typeorm';
import type { TypeormAdapter } from '@tsdi/typeorm-adapter';

const queues = new WeakMap<object, Promise<unknown>>();

/**
 * sql.js has a single connection: overlapping transactions on it fail with
 * "cannot start a transaction within a transaction". Serialize transactions
 * per adapter; the database still provides cross-process atomicity.
 */
export function queueTransaction<T>(adapter: TypeormAdapter, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const previous = queues.get(adapter) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => adapter.getRepository('agent_session' as any).manager.transaction(work));
    queues.set(adapter, next);
    return next.finally(() => {
        if (queues.get(adapter) === next) {
            queues.delete(adapter);
        }
    });
}
