import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { Observable, of, throwError } from 'rxjs';
import { MqttServer } from '../src/server/mqtt-server';

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

function fakeClient() {
    const published: Array<{ topic: string; payload: any }> = [];
    return {
        published,
        publish: (topic: string, payload: any) => { published.push({ topic, payload }); }
    };
}

describe('MqttServer delivery semantics', () => {
    it('keeps the handler promise pending until processing completes', async () => {
        const handler = new FakeHandler('delayed');
        const server = new MqttServer(handler as any, {} as any);

        await (server as any).handleMessage('orders', Buffer.from('{}'));

        expect(handler.calls).toBe(1);
        expect(handler.completed).toBe(1);
    });

    it('rejects when the handler fails so the caller can log/count it', async () => {
        const handler = new FakeHandler('fail');
        const server = new MqttServer(handler as any, {} as any);

        await expect((server as any).handleMessage('orders', Buffer.from('{}'))).rejects.toThrow('handler failed');
    });

    it('resolves successful handlers', async () => {
        const handler = new FakeHandler('ok');
        const server = new MqttServer(handler as any, {} as any);

        await (server as any).handleMessage('orders', Buffer.from('{}'));

        expect(handler.completed).toBe(1);
    });

    it('retries transient failures before the QoS ack is emitted', async () => {
        const handler = new FakeHandler('fail-once');
        const server = new MqttServer(handler as any, { retry: { maxAttempts: 1 } } as any);

        await (server as any).handleMessage('orders', Buffer.from('{}'));

        expect(handler.calls).toBe(2);
        expect(handler.completed).toBe(1);
    });

    it('publishes exhausted deliveries to the dead-letter topic', async () => {
        const handler = new FakeHandler('fail');
        const server = new MqttServer(handler as any, { retry: { maxAttempts: 1 }, deadLetterTopic: 'orders.dlq' } as any);
        const client = fakeClient();
        (server as any).client = client;

        await (server as any).handleMessage('orders', Buffer.from('{"id":1}'));

        expect(handler.calls).toBe(2);
        expect(client.published).toHaveLength(1);
        expect(client.published[0].topic).toBe('orders.dlq');
    });

    it('passes the MQTT 5 packet through for trace carrier extraction', async () => {
        let received: any;
        const handler = {
            injector: createInjector([]),
            handle: (request: any) => {
                received = request;
                return of({ ok: true });
            }
        };
        const server = new MqttServer(handler as any, {} as any);
        const packet = { properties: { userProperties: { traceparent: '00-abc-def-01' } } };

        await (server as any).handleMessage('orders', Buffer.from('{}'), packet);

        expect(received.packet).toBe(packet);
    });
});
