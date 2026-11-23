import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { Observable, of, throwError } from 'rxjs';
import { AmqpServer } from '../src/server/amqp-server';

const RETRY_HEADER = 'x-tsdi-retry-count';

interface Published {
    exchange: string;
    routingKey: string;
    headers: Record<string, any>;
}

class FakeChannel {
    published: Published[] = [];
    acked: any[] = [];
    nacked: Array<{ msg: any; allUpTo: boolean; requeue: boolean }> = [];
    asserted: Array<{ queue: string; options: any }> = [];

    publish(exchange: string, routingKey: string, _content: Buffer, options: any): boolean {
        this.published.push({ exchange, routingKey, headers: options?.headers ?? {} });
        return true;
    }

    ack(msg: any): void {
        this.acked.push(msg);
    }

    nack(msg: any, allUpTo: boolean, requeue: boolean): void {
        this.nacked.push({ msg, allUpTo, requeue });
    }

    async assertQueue(queue: string, options: any): Promise<{ queue: string }> {
        this.asserted.push({ queue, options });
        return { queue };
    }
}

class FakeHandler {
    injector = createInjector([]);
    calls = 0;
    completed = 0;

    constructor(private readonly mode: 'ok' | 'fail' | 'delayed') { }

    handle(): Observable<any> {
        this.calls++;
        if (this.mode === 'fail') {
            return throwError(() => new Error('handler failed'));
        }
        if (this.mode === 'delayed') {
            return new Observable(subscriber => {
                setTimeout(() => {
                    this.completed++;
                    subscriber.next({ ok: true });
                    subscriber.complete();
                }, 15);
            });
        }
        this.completed++;
        return of({ ok: true });
    }
}

function message(headers: Record<string, any> = {}): any {
    return {
        content: Buffer.from('{"ok":true}'),
        fields: { routingKey: 'orders.created' },
        properties: { headers, replyTo: 'reply.queue', correlationId: 'c1' }
    };
}

function createServer(options: any): { server: AmqpServer; channel: FakeChannel } {
    const server = new AmqpServer(new FakeHandler('ok') as any, options);
    const channel = new FakeChannel();
    (server as any).channel = channel;
    (server as any).queueName = 'orders';
    (server as any).logger = { info: () => undefined, error: () => undefined };
    return { server, channel };
}

describe('AmqpServer retry and dead-letter', () => {
    it('republishes a failed message with an incremented retry header', () => {
        const { server, channel } = createServer({ retry: { maxAttempts: 2, delayMs: 0 } });

        server.handleFailure(message());

        expect(channel.published).toHaveLength(1);
        expect(channel.published[0].routingKey).toBe('orders');
        expect(channel.published[0].headers[RETRY_HEADER]).toBe(1);
        expect(channel.acked).toHaveLength(1);
        expect(channel.nacked).toHaveLength(0);
    });

    it('publishes a retried message to the TTL retry queue when a delay is configured', async () => {
        const { server, channel } = createServer({ retry: { maxAttempts: 2, delayMs: 500 } });
        await (server as any).declareRetryAndDeadLetter('orders', true);
        (server as any).retryQueue = 'orders.retry';

        server.handleFailure(message());

        expect(channel.published[0].routingKey).toBe('orders.retry');
        expect(channel.asserted[0].queue).toBe('orders.retry');
        expect(channel.asserted[0].options.arguments['x-message-ttl']).toBe(500);
        expect(channel.asserted[0].options.arguments['x-dead-letter-routing-key']).toBe('orders');
    });

    it('moves a message to the dead-letter queue once the retry budget is exhausted', () => {
        const { server, channel } = createServer({ retry: { maxAttempts: 2 }, deadLetterQueue: 'orders.dlq' });

        server.handleFailure(message({ [RETRY_HEADER]: 2 }));

        expect(channel.published).toHaveLength(1);
        expect(channel.published[0].routingKey).toBe('orders.dlq');
        expect(channel.acked).toHaveLength(1);
        expect(channel.nacked).toHaveLength(0);
    });

    it('publishes exhausted messages to a configured dead-letter exchange', () => {
        const { server, channel } = createServer({
            retry: { maxAttempts: 1 },
            deadLetterExchange: 'orders.dlx',
            deadLetterRoutingKey: 'orders.dead'
        });

        server.handleFailure(message({ [RETRY_HEADER]: 1 }));

        expect(channel.published[0].exchange).toBe('orders.dlx');
        expect(channel.published[0].routingKey).toBe('orders.dead');
    });

    it('keeps broker DLX semantics when no application retry/dead-letter is configured', () => {
        const { server, channel } = createServer({});

        server.handleFailure(message());

        expect(channel.published).toHaveLength(0);
        expect(channel.nacked).toHaveLength(1);
        expect(channel.nacked[0].requeue).toBe(false);
    });
});

describe('AmqpServer delivery semantics', () => {
    it('keeps the handler promise pending until processing completes', async () => {
        const handler = new FakeHandler('delayed');
        const server = new AmqpServer(handler as any, {} as any);

        await (server as any).handleMessage(message(), 'tsdi', 'orders.created');

        expect(handler.calls).toBe(1);
        expect(handler.completed).toBe(1);
    });

    it('propagates handler failures so the transfer can nack/retry', async () => {
        const handler = new FakeHandler('fail');
        const server = new AmqpServer(handler as any, {} as any);

        await expect((server as any).handleMessage(message(), 'tsdi', 'orders.created')).rejects.toThrow('handler failed');
    });

    it('records deliveries through the shared consumer runtime', async () => {
        const handler = new FakeHandler('ok');
        const server = new AmqpServer(handler as any, {} as any);

        await (server as any).handleMessage(message(), 'tsdi', 'orders.created');

        expect((server as any).runtime.stats()).toMatchObject({
            completed: 1,
            failed: 0,
            inFlight: 0
        });
    });

    it('cancels the consumer and drains in-flight handlers before closing', async () => {
        const handler = new FakeHandler('delayed');
        const server = new AmqpServer(handler as any, {} as any);
        const events: string[] = [];
        const channel = {
            cancel: async (tag: string) => { events.push(`cancel:${tag}`); },
            close: async () => { events.push('channel-close'); },
            ack() { return undefined; },
            nack() { return undefined; },
            publish() { return true; },
            assertQueue: async () => ({ queue: 'orders' })
        };
        const connection = { close: async () => { events.push('connection-close'); } };
        (server as any).channel = channel;
        (server as any).connection = connection;
        (server as any).consumerTag = 'consumer-1';
        (server as any).logger = { info: () => undefined, error: () => undefined };

        const pending = (server as any).handleMessage(message(), 'tsdi', 'orders.created');
        await (server as any).onShutdown();

        expect(handler.completed).toBe(1);
        expect(events).toEqual(['cancel:consumer-1', 'channel-close', 'connection-close']);
        await pending;
    });

    it('acks a duplicate message without running the handler again', async () => {
        const handler = new FakeHandler('ok');
        const server = new AmqpServer(handler as any, { idempotency: {} } as any);
        const channel = new FakeChannel();
        (server as any).channel = channel;
        (server as any).queueName = 'orders';
        (server as any).logger = { info: () => undefined, error: () => undefined };

        const msg = message();
        msg.properties.messageId = 'm-1';

        await (server as any).handleMessage(msg, 'tsdi', 'orders.created');
        await (server as any).handleMessage(msg, 'tsdi', 'orders.created');

        expect(handler.calls).toBe(1);
        expect(channel.acked).toEqual([msg]);
        expect((server as any).runtime.stats().duplicates).toBe(1);
    });

    it('uses the x-tsdi-id header when messageId is absent', async () => {
        const handler = new FakeHandler('ok');
        const server = new AmqpServer(handler as any, { idempotency: {} } as any);
        const channel = new FakeChannel();
        (server as any).channel = channel;
        (server as any).queueName = 'orders';
        (server as any).logger = { info: () => undefined, error: () => undefined };

        const first = message({ 'x-tsdi-id': 'header-1' });
        const second = message({ 'x-tsdi-id': 'header-1' });

        await (server as any).handleMessage(first, 'tsdi', 'orders.created');
        await (server as any).handleMessage(second, 'tsdi', 'orders.created');

        expect(handler.calls).toBe(1);
        expect(channel.acked).toEqual([second]);
    });

    it('keeps at-least-once semantics when the publisher sets no id', async () => {
        const handler = new FakeHandler('ok');
        const server = new AmqpServer(handler as any, { idempotency: {} } as any);
        const channel = new FakeChannel();
        (server as any).channel = channel;
        (server as any).queueName = 'orders';
        (server as any).logger = { info: () => undefined, error: () => undefined };

        await (server as any).handleMessage(message(), 'tsdi', 'orders.created');
        await (server as any).handleMessage(message(), 'tsdi', 'orders.created');

        expect(handler.calls).toBe(2);
        expect(channel.acked).toEqual([]);
    });
});
