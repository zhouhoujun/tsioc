import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { Observable, of, throwError } from 'rxjs';
import { NatsServer } from '../src/server/nats-server';

class FakeHandler {
    injector = createInjector([]);
    calls = 0;
    completed = 0;

    constructor(private readonly mode: 'ok' | 'fail' | 'delayed' | 'fail-once') { }

    handle(): Observable<any> {
        this.calls++;
        if (this.mode === 'fail') {
            return throwError(() => new Error('handler failed'));
        }
        if (this.mode === 'fail-once' && this.calls === 1) {
            return throwError(() => new Error('first attempt failed'));
        }
        if (this.mode === 'delayed') {
            return new Observable(subscriber => {
                setTimeout(() => {
                    this.completed++;
                    subscriber.next({ ok: true });
                    subscriber.complete();
                }, 20);
            });
        }
        this.completed++;
        return of({ ok: true });
    }
}

function fakeConnection() {
    const published: Array<{ subject: string; data: any }> = [];
    return {
        published,
        publish: (subject: string, data: any) => { published.push({ subject, data }); }
    };
}

describe('NatsServer delivery semantics', () => {
    it('keeps the handler promise pending until processing completes', async () => {
        const handler = new FakeHandler('delayed');
        const server = new NatsServer(handler as any, {} as any);

        await (server as any).handleMessage('orders', new Uint8Array(), null, {});

        expect(handler.calls).toBe(1);
        expect(handler.completed).toBe(1);
    });

    it('rejects when the handler fails so the subscription loop can log it', async () => {
        const handler = new FakeHandler('fail');
        const server = new NatsServer(handler as any, {} as any);

        await expect((server as any).handleMessage('orders', new Uint8Array(), null, {})).rejects.toThrow('handler failed');
    });

    it('resolves successful handlers', async () => {
        const handler = new FakeHandler('ok');
        const server = new NatsServer(handler as any, {} as any);

        await (server as any).handleMessage('orders', new Uint8Array(), null, {});

        expect(handler.completed).toBe(1);
    });

    it('retries transient failures before dropping the delivery', async () => {
        const handler = new FakeHandler('fail-once');
        const server = new NatsServer(handler as any, { retry: { maxAttempts: 1 } } as any);

        await (server as any).handleMessage('orders', new Uint8Array(), null, {});

        expect(handler.calls).toBe(2);
        expect(handler.completed).toBe(1);
    });

    it('drains in-flight handlers during shutdown before closing the connection', async () => {
        const handler = new FakeHandler('delayed');
        const server = new NatsServer(handler as any, {} as any);
        const events: string[] = [];
        const connection = {
            published: [],
            publish() { return undefined; },
            drain: async () => { events.push('drain'); },
            close: async () => { events.push('close'); }
        };
        (server as any).nc = connection;
        (server as any).logger = { info: () => undefined, error: () => undefined };

        const pending = (server as any).handleMessage('orders', new Uint8Array(), null, {});
        await (server as any).onShutdown();

        // Without the runtime drain, shutdown would resolve before the 20ms handler finished.
        expect(handler.completed).toBe(1);
        expect(events).toEqual(['drain', 'close']);
        await pending;
    });

    it('publishes exhausted deliveries to the dead-letter subject', async () => {
        const handler = new FakeHandler('fail');
        const server = new NatsServer(handler as any, { retry: { maxAttempts: 1 }, deadLetterSubject: 'orders.dlq' } as any);
        const connection = fakeConnection();
        (server as any).nc = connection;

        const data = new Uint8Array([1, 2, 3]);
        await (server as any).handleMessage('orders', data, null, {});

        expect(handler.calls).toBe(2);
        expect(connection.published).toEqual([{ subject: 'orders.dlq', data }]);
    });
});
