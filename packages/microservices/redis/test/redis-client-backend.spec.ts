import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withRedisTransport } from '../src/client';
import { RedisRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';
import { SOCKET } from '@tsdi/transport';

class FakeRedis extends EventEmitter {
    public published: Array<{ channel: string; message: string }> = [];
    public subscribed: string[] = [];
    public duplicates: FakeRedis[] = [];
    public quitCalled = 0;
    public disconnectCalled = 0;

    duplicate() {
        const dup = new FakeRedis();
        this.duplicates.push(dup);
        return dup;
    }

    publish(channel: string, message: string) {
        this.published.push({ channel, message });
        return Promise.resolve(1);
    }

    subscribe(channel: string) {
        this.subscribed.push(channel);
        return Promise.resolve(1);
    }

    quit() {
        this.quitCalled += 1;
        return Promise.resolve('OK');
    }

    disconnect() {
        this.disconnectCalled += 1;
    }
}

describe('Redis client backend', () => {
    const feature = withRedisTransport({ url: 'redis://localhost:6379', asDefault: true })[0];
    const backendToken = getClientBackendToken(feature.config as any);

    function createBackend() {
        const injector = createInjector(feature.providers as any);
        return injector.get(backendToken) as (input: any, context: any) => any;
    }

    function createContext(request: RedisRequest<any>, socket: FakeRedis) {
        const injector = createInjector();
        const context = createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
        return context;
    }

    it('returns ResponseEventPacket for emit after publish succeeds', async () => {
        const backend = createBackend();
        const socket = new FakeRedis();
        const request = new RedisRequest('topic.emit', null, { observe: 'emit' } as any, 'PUBLISH');
        const result: any = await lastValueFrom(backend('payload', createContext(request, socket)));

        expect(result).toEqual({ type: 0 });
        expect(socket.published).toHaveLength(1);
        expect(socket.published[0].channel).toBe('topic.emit');
    });

    it('returns body for body observe and tears down reply subscriber', async () => {
        const backend = createBackend();
        const socket = new FakeRedis();
        const request = new RedisRequest('topic.body', null, { observe: 'body', responseType: 'text' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const dup = socket.duplicates[0];
            expect(dup.subscribed).toContain('topic.body:response');
            dup.emit('message', 'topic.body:response', JSON.stringify({
                id: JSON.parse(socket.published[0].message).id,
                status: 200,
                statusMessage: 'OK',
                payload: 'done'
            }));
        }, 0);

        const result = await resultPromise;
        const dup = socket.duplicates[0];
        expect(result).toBe('done');
        expect(dup.quitCalled).toBe(1);
    });

    it('returns full response envelope for response observe', async () => {
        const backend = createBackend();
        const socket = new FakeRedis();
        const request = new RedisRequest('topic.response', null, { observe: 'response' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const dup = socket.duplicates[0];
            dup.emit('message', 'topic.response:response', JSON.stringify({
                id: JSON.parse(socket.published[0].message).id,
                status: 202,
                statusMessage: 'Accepted',
                payload: { ok: true }
            }));
        }, 0);

        const result: any = await resultPromise;
        expect(result.status).toBe(202);
        expect(result.statusText).toBe('Accepted');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const socket = new FakeRedis();
        const request = new RedisRequest('topic.error', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        setTimeout(() => {
            const dup = socket.duplicates[0];
            dup.emit('message', 'topic.error:response', JSON.stringify({
                id: JSON.parse(socket.published[0].message).id,
                status: 500,
                statusMessage: 'Boom',
                error: { message: 'Boom' },
                payload: { statusCode: 500 }
            }));
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const backend = createBackend();
        const socket = new FakeRedis();
        const request = new RedisRequest('topic.observe', null, { observe: 'observe' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));

        const promise = lastValueFrom(result$.pipe(take(2), toArray()));
        setTimeout(() => {
            const dup = socket.duplicates[0];
            const reqId = JSON.parse(socket.published[0].message).id;
            dup.emit('message', 'topic.observe:response', JSON.stringify({ id: 'other', status: 200, payload: 'skip' }));
            dup.emit('message', 'topic.observe:response', JSON.stringify({ id: reqId, status: 200, payload: 'one' }));
            dup.emit('message', 'topic.observe:response', JSON.stringify({ id: reqId, status: 200, payload: 'two' }));
        }, 0);

        const result = await promise;
        const dup = socket.duplicates[0];
        expect(result).toEqual(['one', 'two']);
        expect(dup.quitCalled).toBe(1);
    });
});
