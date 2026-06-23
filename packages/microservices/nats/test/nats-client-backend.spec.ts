import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withNatsTransport } from '../src/client';
import { NatsRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';
import { SOCKET } from '@tsdi/transport';

class FakeSubscription {
    public unsubscribed = 0;
    private values: any[] = [];
    private waiter?: () => void;

    push(value: any) {
        this.values.push(value);
        this.waiter?.();
        this.waiter = undefined;
    }

    unsubscribe() {
        this.unsubscribed += 1;
    }

    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.values.length) {
                yield this.values.shift();
                continue;
            }
            await new Promise<void>(resolve => {
                this.waiter = resolve;
            });
        }
    }
}

class FakeNatsConnection {
    public published: Array<{ subject: string; data: Uint8Array; reply?: string }> = [];
    public requests: Array<{ subject: string; data: Uint8Array; options?: any }> = [];
    public subscriptions = new Map<string, FakeSubscription>();
    public requestResponse?: any;

    publish(subject: string, data: Uint8Array, options?: { reply?: string }) {
        this.published.push({ subject, data, reply: options?.reply });
    }

    subscribe(subject: string) {
        const sub = new FakeSubscription();
        this.subscriptions.set(subject, sub);
        return sub as any;
    }

    request(subject: string, data: Uint8Array, options?: any) {
        this.requests.push({ subject, data, options });
        return Promise.resolve({ data: new TextEncoder().encode(JSON.stringify(this.requestResponse)) });
    }
}

describe('NATS client backend', () => {
    const feature = withNatsTransport({ servers: ['nats://127.0.0.1:4222'], asDefault: true })[0];
    const backendToken = getClientBackendToken(feature.config as any);

    function createBackend() {
        const injector = createInjector(feature.providers as any);
        return injector.get(backendToken) as (input: any, context: any) => any;
    }

    function createContext(request: NatsRequest<any>, socket: FakeNatsConnection) {
        const injector = createInjector();
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
    }

    it('returns ResponseEventPacket for emit', async () => {
        const backend = createBackend();
        const socket = new FakeNatsConnection();
        const request = new NatsRequest('topic.emit', null, { observe: 'emit' } as any, 'PUBLISH');
        const result: any = await lastValueFrom(backend('payload', createContext(request, socket)));

        expect(result).toEqual({ type: 0 });
        expect(socket.published).toHaveLength(1);
        expect(socket.published[0].subject).toBe('topic.emit');
    });

    it('returns body for body observe', async () => {
        const backend = createBackend();
        const socket = new FakeNatsConnection();
        socket.requestResponse = { status: 200, payload: 'done' };
        const request = new NatsRequest('topic.body', null, { observe: 'body' } as any, 'PUBLISH');
        const result = await lastValueFrom(backend({ hello: 'world' }, createContext(request, socket)));

        expect(result).toBe('done');
    });

    it('returns response envelope for response observe', async () => {
        const backend = createBackend();
        const socket = new FakeNatsConnection();
        socket.requestResponse = { status: 202, statusMessage: 'Accepted', payload: { ok: true } };
        const request = new NatsRequest('topic.response', null, { observe: 'response' } as any, 'PUBLISH');
        const result: any = await lastValueFrom(backend({ hello: 'world' }, createContext(request, socket)));

        expect(result.status).toBe(202);
        expect(result.statusText).toBe('Accepted');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const socket = new FakeNatsConnection();
        socket.requestResponse = { status: 500, statusMessage: 'Boom', error: { message: 'Boom' } };
        const request = new NatsRequest('topic.error', null, { observe: 'body' } as any, 'PUBLISH');

        await expect(lastValueFrom(backend({ hello: 'world' }, createContext(request, socket)))).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const backend = createBackend();
        const socket = new FakeNatsConnection();
        const request = new NatsRequest('topic.observe', null, { observe: 'observe' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));

        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));
        setTimeout(() => {
            const published = JSON.parse(new TextDecoder().decode(socket.published[0].data));
            const sub = socket.subscriptions.get(socket.published[0].reply!);
            sub?.push({ data: new TextEncoder().encode(JSON.stringify({ id: 'other', status: 200, payload: 'skip' })) });
            sub?.push({ data: new TextEncoder().encode(JSON.stringify({ id: published.id, status: 200, payload: 'one' })) });
            sub?.push({ data: new TextEncoder().encode(JSON.stringify({ id: published.id, status: 200, payload: 'two' })) });
        }, 0);

        const result = await resultPromise;
        const sub = socket.subscriptions.get(socket.published[0].reply!);
        expect(result).toEqual(['one', 'two']);
        expect(sub?.unsubscribed).toBe(1);
    });
});
