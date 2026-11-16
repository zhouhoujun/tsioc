import expect = require('expect');
import { ConsumerRuntime } from '../src/consumer/ConsumerRuntime';

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
});
