import expect = require('expect');
import { ConsumerRuntime } from '../src/consumer/ConsumerRuntime';

describe('ConsumerRuntime metrics', () => {
    function createSink() {
        const calls: Array<{ event: string; labels?: any; durationMs?: number }> = [];
        return {
            calls,
            started: (labels: any) => calls.push({ event: 'started', labels }),
            completed: (durationMs: number, labels: any) => calls.push({ event: 'completed', labels, durationMs }),
            failed: (labels: any) => calls.push({ event: 'failed', labels }),
            retried: (labels: any) => calls.push({ event: 'retried', labels })
        };
    }

    it('reports started/retried/completed with merged labels', async () => {
        const sink = createSink();
        const runtime = new ConsumerRuntime({
            retry: { maxAttempts: 2 },
            metrics: sink,
            labels: { transport: 'kafka', group: 'g1' }
        });
        let attempts = 0;
        const handled = await runtime.handle({ payload: 'x', labels: { topic: 'orders' } }, async () => {
            attempts += 1;
            if (attempts < 3) {
                throw new Error('transient');
            }
        });

        expect(handled).toBe(true);
        expect(attempts).toBe(3);
        expect(sink.calls.map(call => call.event)).toEqual(['started', 'retried', 'retried', 'completed']);
        expect(sink.calls[0].labels).toEqual({ transport: 'kafka', group: 'g1', topic: 'orders' });
        expect(sink.calls[3].durationMs).toBeGreaterThanOrEqual(0);
        expect(runtime.stats()).toMatchObject({ completed: 1, failed: 0, retried: 2 });
    });

    it('reports failed once when retries are exhausted', async () => {
        const sink = createSink();
        const runtime = new ConsumerRuntime({
            retry: { maxAttempts: 1 },
            metrics: sink,
            labels: { transport: 'nats' }
        });
        const handled = await runtime.handle({ payload: 'x', labels: { topic: 'events' } }, async () => {
            throw new Error('permanent');
        });

        expect(handled).toBe(false);
        expect(sink.calls.map(call => call.event)).toEqual(['started', 'retried', 'failed']);
        expect(sink.calls[2].labels).toEqual({ transport: 'nats', topic: 'events' });
        expect(runtime.stats()).toMatchObject({ completed: 0, failed: 1, retried: 1 });
    });

    it('works without a metrics sink', async () => {
        const runtime = new ConsumerRuntime();
        await expect(runtime.handle({ payload: 'x' }, async () => undefined)).resolves.toBe(true);
        expect(runtime.stats().completed).toBe(1);
    });
});
