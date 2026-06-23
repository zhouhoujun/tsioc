import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withMqttTransport } from '../src/client';
import { MqttRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';
import { SOCKET } from '@tsdi/transport';

class FakeMqttClient extends EventEmitter {
    public subscriptions: string[] = [];
    public unsubscriptions: string[] = [];
    public published: Array<{ topic: string; payload: string | Buffer }> = [];

    subscribe(topic: string, _options: any, callback: (err: Error | null) => void) {
        this.subscriptions.push(topic);
        callback(null);
    }

    unsubscribe(topic: string, callback: (err: Error | null) => void) {
        this.unsubscriptions.push(topic);
        callback(null);
    }

    publish(topic: string, payload: string | Buffer, callback: (err?: Error | null) => void) {
        this.published.push({ topic, payload });
        callback(null);
    }
}

describe('MQTT client backend', () => {
    const feature = withMqttTransport({ asDefault: true })[0];
    const backendToken = getClientBackendToken(feature.config as any);

    function createBackend() {
        const injector = createInjector(feature.providers as any);
        return injector.get(backendToken) as (input: any, context: any) => any;
    }

    function createContext(request: MqttRequest<any>, socket: FakeMqttClient) {
        const injector = createInjector();
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, socket]
        ]);
    }

    it('returns ResponseEventPacket for emit', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.emit', null, { observe: 'events' } as any, 'PUBLISH');
        const result: any = await lastValueFrom(backend('payload', createContext(request, socket)));

        expect(result).toEqual({ type: 0 });
        expect(socket.published).toHaveLength(1);
        expect(socket.published[0].topic).toBe('topic.emit');
    });

    it('returns body for body observe', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.body', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const reqId = JSON.parse(String(socket.published[0].payload)).id;
            socket.emit('message', 'topic.body/response', Buffer.from(JSON.stringify({ id: reqId, status: 200, payload: 'done' })));
        }, 0);

        const result = await resultPromise;
        expect(result).toBe('done');
        expect(socket.unsubscriptions).toContain('topic.body/response');
    });

    it('returns response envelope for response observe', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.response', null, { observe: 'response' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const reqId = JSON.parse(String(socket.published[0].payload)).id;
            socket.emit('message', 'topic.response/response', Buffer.from(JSON.stringify({ id: reqId, status: 201, statusMessage: 'Created', payload: { ok: true } })));
        }, 0);

        const result: any = await resultPromise;
        expect(result.status).toBe(201);
        expect(result.statusText).toBe('Created');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.error', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        setTimeout(() => {
            const reqId = JSON.parse(String(socket.published[0].payload)).id;
            socket.emit('message', 'topic.error/response', Buffer.from(JSON.stringify({ id: reqId, status: 500, statusMessage: 'Boom', error: { message: 'Boom' } })));
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.observe', null, { observe: 'observe' } as any, 'PUBLISH');
        const result$ = backend({ hello: 'world' }, createContext(request, socket));
        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));

        setTimeout(() => {
            const reqId = JSON.parse(String(socket.published[0].payload)).id;
            socket.emit('message', 'topic.observe/response', Buffer.from(JSON.stringify({ id: 'other', status: 200, payload: 'skip' })));
            socket.emit('message', 'topic.observe/response', Buffer.from(JSON.stringify({ id: reqId, status: 200, payload: 'one' })));
            socket.emit('message', 'topic.observe/response', Buffer.from(JSON.stringify({ id: reqId, status: 200, payload: 'two' })));
        }, 0);

        const result = await resultPromise;
        expect(result).toEqual(['one', 'two']);
        expect(socket.unsubscriptions).toContain('topic.observe/response');
    });
});
