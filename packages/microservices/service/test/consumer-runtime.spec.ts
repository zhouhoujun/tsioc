import expect = require('expect');
import { ConsumerRuntime } from '../src/consumer/ConsumerRuntime';
import { MemoryIdempotencyStore } from '../src/consumer/idempotency';

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ConsumerRuntime', () => {
    it('acks a handled delivery exactly once', async () => {
        const runtime = new ConsumerRuntime();
        const events: string[] = [];

        const handled = await runtime.handle({
            payload: 'job',
            ack: () => { events.push('ack'); }
        }, async () => {
            events.push('handle');
        });

        expect(handled).toBe(true);
        expect(events).toEqual(['handle', 'ack']);
        expect(runtime.stats()).toEqual({
            completed: 1,
            failed: 0,
            retried: 0,
            duplicates: 0,
            inFlight: 0,
            peakInFlight: 1
        });
    });

    it('retries with backoff and does not fail a recovered delivery', async () => {
        const runtime = new ConsumerRuntime({ retry: { maxAttempts: 2, delayMs: 10 } });
        const acks: number[] = [];
        const failures: unknown[] = [];
        let calls = 0;

        const handled = await runtime.handle({
            payload: 'job',
            ack: () => { acks.push(1); },
            fail: err => { failures.push(err); }
        }, async () => {
            calls++;
            if (calls < 2) {
                throw new Error('transient');
            }
        });

        expect(handled).toBe(true);
        expect(calls).toBe(2);
        expect(acks).toHaveLength(1);
        expect(failures).toHaveLength(0);
        expect(runtime.stats().retried).toBe(1);
        expect(runtime.stats().completed).toBe(1);
    });

    it('fails once the retry budget is exhausted and reports attempts', async () => {
        const runtime = new ConsumerRuntime({ retry: { maxAttempts: 1 } });
        const failures: Array<{ error: unknown; attempts: number }> = [];
        let acked = false;

        const handled = await runtime.handle({
            payload: 'job',
            ack: () => { acked = true; },
            fail: (error, attempts) => { failures.push({ error, attempts }); }
        }, async () => {
            throw new Error('permanent');
        });

        expect(handled).toBe(false);
        expect(acked).toBe(false);
        expect(failures).toHaveLength(1);
        expect(failures[0].attempts).toBe(2);
        expect((failures[0].error as Error).message).toBe('permanent');
        expect(runtime.stats().failed).toBe(1);
    });

    it('propagates a throwing fail() so the transport can avoid committing', async () => {
        const runtime = new ConsumerRuntime();

        await expect(runtime.handle({
            payload: 'job',
            fail: () => { throw new Error('no commit'); }
        }, async () => {
            throw new Error('handler');
        })).rejects.toThrow('no commit');

        expect(runtime.stats().failed).toBe(1);
        expect(runtime.stats().inFlight).toBe(0);
    });

    it('limits concurrent handlers and drains queued deliveries', async () => {
        const runtime = new ConsumerRuntime({ concurrency: 1 });
        let concurrent = 0;
        let peak = 0;
        const order: number[] = [];

        const run = (id: number) => runtime.handle({ payload: id }, async () => {
            concurrent++;
            peak = Math.max(peak, concurrent);
            order.push(id);
            await delay(10);
            concurrent--;
        });

        await Promise.all([run(1), run(2), run(3)]);

        expect(peak).toBe(1);
        expect(order).toEqual([1, 2, 3]);
        expect(runtime.stats().peakInFlight).toBe(1);
        expect(runtime.stats().completed).toBe(3);
    });

    it('allows parallel handlers when concurrency is unlimited', async () => {
        const runtime = new ConsumerRuntime();
        let concurrent = 0;
        let peak = 0;

        const run = () => runtime.handle({ payload: 'job' }, async () => {
            concurrent++;
            peak = Math.max(peak, concurrent);
            await delay(10);
            concurrent--;
        });

        await Promise.all([run(), run(), run()]);

        expect(peak).toBe(3);
    });

    it('acknowledges duplicates without running the handler twice', async () => {
        const runtime = new ConsumerRuntime({ idempotency: { ttlMs: 60_000 } });
        let calls = 0;
        const acks: string[] = [];
        const message = { id: 'kafka:0:42', payload: 'job', ack: () => { acks.push('ack'); } };
        const handler = async () => { calls++; };

        expect(await runtime.handle(message, handler)).toBe(true);
        expect(await runtime.handle({ ...message }, handler)).toBe(true);

        expect(calls).toBe(1);
        expect(acks).toHaveLength(2);
        expect(runtime.stats().duplicates).toBe(1);
        expect(runtime.stats().completed).toBe(1);
    });

    it('releases the reservation when handling fails so redelivery can retry', async () => {
        const runtime = new ConsumerRuntime({ idempotency: {} });
        let calls = 0;
        const message = { id: 'kafka:0:7', payload: 'job', fail: () => undefined };

        expect(await runtime.handle(message, async () => {
            calls++;
            throw new Error('boom');
        })).toBe(false);
        expect(await runtime.handle(message, async () => { calls++; })).toBe(true);

        expect(calls).toBe(2);
        expect(runtime.stats().duplicates).toBe(0);
        expect(runtime.stats().failed).toBe(1);
        expect(runtime.stats().completed).toBe(1);
    });

    it('keeps at-least-once semantics without an id or store', async () => {
        let calls = 0;
        const withoutStore = new ConsumerRuntime();
        await withoutStore.handle({ id: 'same', payload: 'job' }, async () => { calls++; });
        await withoutStore.handle({ id: 'same', payload: 'job' }, async () => { calls++; });

        const withStore = new ConsumerRuntime({ idempotency: {} });
        await withStore.handle({ payload: 'job' }, async () => { calls++; });
        await withStore.handle({ payload: 'job' }, async () => { calls++; });

        expect(calls).toBe(4);
        expect(withStore.stats().duplicates).toBe(0);
    });

    it('reprocesses a delivery after the idempotency window expires', async () => {
        const runtime = new ConsumerRuntime({ idempotency: { ttlMs: 1 } });
        let calls = 0;
        await runtime.handle({ id: 'ttl', payload: 'job' }, async () => { calls++; });
        await delay(10);
        await runtime.handle({ id: 'ttl', payload: 'job' }, async () => { calls++; });
        expect(calls).toBe(2);
        expect(runtime.stats().duplicates).toBe(0);
    });

    it('uses a provided idempotency store', async () => {
        const reserved = new Set<string>();
        const events: string[] = [];
        const store = {
            reserve(key: string) {
                events.push(`reserve:${key}`);
                if (reserved.has(key)) {
                    return false;
                }
                reserved.add(key);
                return true;
            },
            release(key: string) {
                events.push(`release:${key}`);
                reserved.delete(key);
            }
        };
        const runtime = new ConsumerRuntime({ idempotency: { store } });
        const message = { id: 'custom-1', payload: 'job', fail: () => undefined };

        expect(await runtime.handle(message, async () => { throw new Error('x'); })).toBe(false);
        expect(await runtime.handle(message, async () => undefined)).toBe(true);
        expect(await runtime.handle(message, async () => undefined)).toBe(true);

        expect(events).toEqual(['reserve:custom-1', 'release:custom-1', 'reserve:custom-1', 'reserve:custom-1']);
        expect(runtime.stats().duplicates).toBe(1);
    });

    it('bounds and expires the in-memory idempotency store', async () => {
        const store = new MemoryIdempotencyStore(8);
        for (let i = 0; i < 8; i++) {
            expect(store.reserve(`k${i}`, 60_000)).toBe(true);
        }
        expect(store.reserve('k0', 60_000)).toBe(false);
        expect(store.reserve('k8', 60_000)).toBe(true);
        expect(store.size).toBeLessThanOrEqual(8);

        expect(store.reserve('short', 1)).toBe(true);
        await delay(5);
        expect(store.reserve('short', 60_000)).toBe(true);
    });

    it('uses skip() to settle duplicates when the transport provides it', async () => {
        const runtime = new ConsumerRuntime({ idempotency: {} });
        const events: string[] = [];
        const message = {
            id: 'skip-1',
            payload: 'job',
            ack: () => { events.push('ack'); },
            skip: () => { events.push('skip'); }
        };

        await runtime.handle(message, async () => undefined);
        await runtime.handle({ ...message }, async () => undefined);

        expect(events).toEqual(['ack', 'skip']);
        expect(runtime.stats().duplicates).toBe(1);
    });

    it('releases the concurrency slot when the idempotency store throws', async () => {
        const runtime = new ConsumerRuntime({
            concurrency: 1,
            idempotency: {
                store: {
                    reserve: () => { throw new Error('store down'); },
                    release: () => undefined
                }
            }
        });

        await expect(runtime.handle({ id: 'x', payload: 1 }, async () => undefined)).rejects.toThrow('store down');
        expect(runtime.stats().inFlight).toBe(0);
        expect(await runtime.drain(0)).toBe(true);
    });

    it('drains in-flight and queued deliveries and rejects new work after close', async () => {
        const runtime = new ConsumerRuntime({ concurrency: 1 });
        const done: number[] = [];
        const run = (id: number) => runtime.handle({ payload: id }, async () => {
            await delay(10);
            done.push(id);
        });

        const all = Promise.all([run(1), run(2)]);
        runtime.close();
        await expect(runtime.handle({ payload: 3 }, async () => undefined)).rejects.toThrow('closed');

        expect(await runtime.drain(1000)).toBe(true);
        await all;
        expect(done).toEqual([1, 2]);
        expect(runtime.stats().inFlight).toBe(0);
    });

    it('reports a drain timeout while a handler is still running', async () => {
        const runtime = new ConsumerRuntime();
        const pending = runtime.handle({ payload: 1 }, async () => { await delay(50); });
        expect(await runtime.drain(5)).toBe(false);
        await pending;
        expect(runtime.isClosed).toBe(false);
    });
});
