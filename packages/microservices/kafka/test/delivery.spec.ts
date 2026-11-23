import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { Observable, of, throwError } from 'rxjs';
import { KafkaServer } from '../src/server/kafka-server';

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

function payload(offset = '10'): any {
    return {
        topic: 'orders',
        partition: 0,
        message: { offset, value: Buffer.from('{}'), key: Buffer.from('k1'), headers: { trace: 'abc' } }
    };
}

function createConsumerServer(handler: FakeHandler, options: any) {
    const server = new KafkaServer(handler as any, options);
    const commits: any[] = [];
    const sent: any[] = [];
    (server as any).logger = { info: () => undefined, error: () => undefined };
    (server as any).consumer = {
        commitOffsets: async (offsets: any[]) => { commits.push(offsets); }
    };
    (server as any).producer = {
        send: async (record: any) => { sent.push(record); }
    };
    return { server, commits, sent };
}

describe('KafkaServer delivery semantics', () => {
    it('waits for an async handler before resolving eachMessage work', async () => {
        const handler = new FakeHandler('delayed');
        const server = new KafkaServer(handler as any, {} as any);

        await (server as any).handleMessage(payload());

        // The pre-fix implementation returned as soon as it subscribed, so this
        // assertion failed: the handler had not completed when eachMessage resolved.
        expect(handler.calls).toBe(1);
        expect(handler.completed).toBe(1);
    });

    it('propagates handler failures so kafkajs does not commit the offset', async () => {
        const handler = new FakeHandler('fail');
        const server = new KafkaServer(handler as any, {} as any);

        await expect((server as any).handleMessage(payload())).rejects.toThrow('handler failed');
    });

    it('resolves successful handlers', async () => {
        const handler = new FakeHandler('ok');
        const server = new KafkaServer(handler as any, {} as any);

        await (server as any).handleMessage(payload());

        expect(handler.calls).toBe(1);
        expect(handler.completed).toBe(1);
    });
});

describe('KafkaServer at-least-once delivery', () => {
    it('commits the next offset only after a successful handler run', async () => {
        const handler = new FakeHandler('ok');
        const { server, commits } = createConsumerServer(handler, { delivery: 'at-least-once' });

        await (server as any).consumeMessage(payload('10'));

        expect(handler.completed).toBe(1);
        expect(commits).toEqual([[{ topic: 'orders', partition: 0, offset: '11' }]]);
    });

    it('leaves the offset uncommitted by default (at-most-once compatibility)', async () => {
        const handler = new FakeHandler('ok');
        const { server, commits } = createConsumerServer(handler, {});

        await (server as any).consumeMessage(payload('10'));

        expect(commits).toEqual([]);
    });

    it('commits a redelivered offset without running the handler again', async () => {
        const handler = new FakeHandler('ok');
        const { server, commits } = createConsumerServer(handler, {
            delivery: 'at-least-once',
            idempotency: {}
        });

        await (server as any).consumeMessage(payload('10'));
        await (server as any).consumeMessage(payload('10'));

        expect(handler.calls).toBe(1);
        expect(commits).toHaveLength(2);
        expect((server as any).runtime.stats().duplicates).toBe(1);
    });

    it('releases the idempotency reservation when handling fails', async () => {
        const handler = new FakeHandler('fail-once');
        const { server } = createConsumerServer(handler, {
            delivery: 'at-least-once',
            idempotency: {}
        });

        await expect((server as any).consumeMessage(payload('20'))).rejects.toThrow('first attempt failed');
        await (server as any).consumeMessage(payload('20'));

        expect(handler.calls).toBe(2);
        expect(handler.completed).toBe(1);
        expect((server as any).runtime.stats().duplicates).toBe(0);
    });

    it('retries the handler before committing', async () => {
        const handler = new FakeHandler('fail-once');
        const { server, commits } = createConsumerServer(handler, {
            delivery: 'at-least-once',
            retry: { maxAttempts: 1, delayMs: 1 }
        });

        await (server as any).consumeMessage(payload('10'));

        expect(handler.calls).toBe(2);
        expect(handler.completed).toBe(1);
        expect(commits).toHaveLength(1);
    });

    it('dead-letters exhausted messages and then commits the offset', async () => {
        const handler = new FakeHandler('fail');
        const { server, commits, sent } = createConsumerServer(handler, {
            delivery: 'at-least-once',
            retry: { maxAttempts: 1 },
            deadLetterTopic: 'orders.dlq'
        });

        await (server as any).consumeMessage(payload('10'));

        expect(handler.calls).toBe(2);
        expect(sent).toHaveLength(1);
        expect(sent[0].topic).toBe('orders.dlq');
        expect(sent[0].messages[0].headers['x-original-topic']).toBe('orders');
        expect(sent[0].messages[0].headers['x-original-offset']).toBe('10');
        expect(sent[0].messages[0].headers['x-error']).toBe('handler failed');
        expect(commits).toHaveLength(1);
    });

    it('rethrows without committing when there is no dead-letter topic', async () => {
        const handler = new FakeHandler('fail');
        const { server, commits } = createConsumerServer(handler, {
            delivery: 'at-least-once',
            retry: { maxAttempts: 1 }
        });

        await expect((server as any).consumeMessage(payload())).rejects.toThrow('handler failed');

        expect(handler.calls).toBe(2);
        expect(commits).toEqual([]);
    });
});
