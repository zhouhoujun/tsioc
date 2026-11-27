import expect = require('expect');
import { MemoryOutboxStore, OutboxDispatcher } from '../src/outbox';

describe('outbox', () => {
    it('adds and claims pending records once', async () => {
        const store = new MemoryOutboxStore();
        const first = await store.add({ topic: 'orders', payload: { id: 1 } });
        await store.add({ topic: 'orders', payload: { id: 2 }, nextAttemptAt: Date.now() + 60_000 });
        expect(await store.size()).toBe(2);

        const claimed = await store.claim(10);
        expect(claimed.map(record => record.id)).toEqual([first.id]);
        expect(await store.claim(10)).toEqual([]);
    });

    it('removes acked records and schedules failed ones', async () => {
        const store = new MemoryOutboxStore();
        const record = await store.add({ topic: 'orders', payload: { id: 1 } });
        const [claimed] = await store.claim(1);
        await store.fail(claimed.id, Date.now() + 1000);
        expect(await store.claim(1)).toEqual([]);
        expect(await store.size()).toBe(1);

        const [retried] = await store.claim(1, Date.now() + 2000);
        expect(retried.attempts).toBe(1);
        await store.ack(retried.id);
        expect(await store.size()).toBe(0);
        expect(record.topic).toBe('orders');
    });

    it('dispatches a batch and only removes delivered records', async () => {
        const store = new MemoryOutboxStore();
        await store.add({ id: 'ok', topic: 'orders', payload: { id: 1 } });
        await store.add({ id: 'bad', topic: 'orders', payload: { id: 2 } });
        const sent: string[] = [];
        const dispatcher = new OutboxDispatcher(store, async message => {
            if (message.id === 'bad') {
                throw new Error('send failed');
            }
            sent.push(message.id);
        }, { batchSize: 10, retryDelayMs: 60_000 });

        expect(await dispatcher.dispatchOnce()).toBe(1);
        expect(sent).toEqual(['ok']);
        expect(await store.size()).toBe(1);
        await dispatcher.stop();
    });

    it('serializes overlapping flushes', async () => {
        const store = new MemoryOutboxStore();
        await store.add({ id: 'one', topic: 'orders', payload: {} });
        let sends = 0;
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const dispatcher = new OutboxDispatcher(store, async () => {
            sends += 1;
            await gate;
        });

        const first = dispatcher.dispatchOnce();
        const second = dispatcher.dispatchOnce();
        expect(second).toBe(first);
        release();
        expect(await first).toBe(1);
        expect(sends).toBe(1);
        await dispatcher.stop();
    });

    it('enforces the configured capacity', async () => {
        const store = new MemoryOutboxStore(1);
        await store.add({ topic: 'a', payload: {} });
        await expect(store.add({ topic: 'b', payload: {} })).rejects.toThrow(/outbox is full/);
    });
});
