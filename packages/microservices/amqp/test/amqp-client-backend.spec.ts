import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withAmqpTransport } from '../src/client';
import { AmqpRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';
import { SOCKET } from '@tsdi/transport';

class FakeChannel {
    public published: Array<{ exchange: string; routingKey: string; content: Buffer; options?: any }> = [];
    public cancelled: string[] = [];
    public queueName = 'reply.queue';
    public consumeHandler?: (msg: any) => void;

    publish(exchange: string, routingKey: string, content: Buffer, options?: any) {
        this.published.push({ exchange, routingKey, content, options });
        return true;
    }

    assertQueue() {
        return Promise.resolve({ queue: this.queueName });
    }

    consume(_queue: string, handler: (msg: any) => void) {
        this.consumeHandler = handler;
        return Promise.resolve({ consumerTag: 'consumer-1' });
    }

    cancel(tag: string) {
        this.cancelled.push(tag);
        return Promise.resolve();
    }

    emitMessage(payload: any, correlationId?: string) {
        this.consumeHandler?.({
            content: Buffer.from(JSON.stringify(payload)),
            properties: { correlationId }
        });
    }
}

describe('AMQP client backend', () => {
    const feature = withAmqpTransport({ asDefault: true })[0];
    const backendToken = getClientBackendToken(feature.config as any);

    function createBackend() {
        const injector = createInjector(feature.providers as any);
        return injector.get(backendToken) as (input: any, context: any) => any;
    }

    function createContext(request: AmqpRequest<any>, socket: FakeChannel) {
        const injector = createInjector();
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
    }

    it('returns ResponseEventPacket for emit', async () => {
        const backend = createBackend();
        const socket = new FakeChannel();
        const request = new AmqpRequest('topic.emit', null, { observe: 'events' } as any, 'PUBLISH');
        const result: any = await lastValueFrom(backend('payload', createContext(request, socket)));

        expect(result).toEqual({ type: 0 });
        expect(socket.published).toHaveLength(1);
    });

    it('returns body for body observe', async () => {
        const backend = createBackend();
        const socket = new FakeChannel();
        const request = new AmqpRequest('topic.body', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const correlationId = socket.published[0].options.correlationId;
            socket.emitMessage({ status: 200, payload: 'done' }, correlationId);
        }, 0);

        const result = await resultPromise;
        expect(result).toBe('done');
        expect(socket.cancelled).toContain('consumer-1');
    });

    it('returns response envelope for response observe', async () => {
        const backend = createBackend();
        const socket = new FakeChannel();
        const request = new AmqpRequest('topic.response', null, { observe: 'response' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const correlationId = socket.published[0].options.correlationId;
            socket.emitMessage({ status: 202, statusMessage: 'Accepted', payload: { ok: true } }, correlationId);
        }, 0);

        const result: any = await resultPromise;
        expect(result.status).toBe(202);
        expect(result.statusText).toBe('Accepted');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const socket = new FakeChannel();
        const request = new AmqpRequest('topic.error', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        setTimeout(() => {
            const correlationId = socket.published[0].options.correlationId;
            socket.emitMessage({ status: 500, statusMessage: 'Boom', error: { message: 'Boom' } }, correlationId);
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const backend = createBackend();
        const socket = new FakeChannel();
        const request = new AmqpRequest('topic.observe', null, { observe: 'observe' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));

        setTimeout(() => {
            const correlationId = socket.published[0].options.correlationId;
            socket.emitMessage({ status: 200, payload: 'one' }, 'other');
            socket.emitMessage({ status: 200, payload: 'one' }, correlationId);
            socket.emitMessage({ status: 200, payload: 'two' }, correlationId);
        }, 0);

        const result = await resultPromise;
        expect(result).toEqual(['one', 'two']);
        expect(socket.cancelled).toContain('consumer-1');
    });
});
