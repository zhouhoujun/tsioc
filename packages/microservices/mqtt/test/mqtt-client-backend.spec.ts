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
        const [backend] = injector.get(backendToken) as unknown as Array<(input: any, context: any) => any>;
        return backend;
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
        const result: any = await lastValueFrom(backend(request.clone({ payload: 'payload' }), createContext(request, socket)));

        expect(result).toEqual({ type: 0 });
        expect(socket.published).toHaveLength(1);
        expect(socket.published[0].topic).toBe('topic.emit');
    });

    it('serializes topic requests with payload only and generated response topic', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.payload', null, {
            observe: 'events',
            payload: { hello: 'world' },
            headers: { 'x-test': '1' }
        }, 'PUBLISH');

        await lastValueFrom(backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket)));

        const published = JSON.parse(String(socket.published[0].payload));
        expect(published.topic).toBe('topic.payload');
        expect(published.responseTopic).toBe('topic.payload/response');
        expect(published.method).toBe('PUBLISH');
        expect(published.payload).toEqual({ hello: 'world' });
        expect(published.body).toBeUndefined();
        expect(published.headers).toEqual({ 'x-test': '1' });
    });

    it('preserves custom responseTopic and formatted pattern in published payload', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('cmd:device.status', { cmd: 'device.status' }, {
            observe: 'events',
            payload: { id: 'a1' },
            responseTopic: 'custom/replies'
        }, 'PUBLISH');
        const outbound = new MqttRequest('cmd:device.status', { cmd: 'device.status' }, {
            observe: 'events',
            payload: { id: 'a1' },
            responseTopic: 'custom/replies'
        }, 'PUBLISH');

        await lastValueFrom(backend(outbound, createContext(request, socket)));

        const published = JSON.parse(String(socket.published[0].payload));
        expect(published.responseTopic).toBe('custom/replies');
        expect(published.pattern).toEqual({ cmd: 'device.status' });
        expect(published.payload).toEqual({ id: 'a1' });
        expect(socket.published[0].topic).toBe('cmd:device.status');
    });

    it('returns body for body observe', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.body', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket));
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
        const result$ = backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket));
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

    it('subscribes and unsubscribes custom response topic for body observe', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.custom-response', null, {
            observe: 'body',
            responseTopic: 'custom/replies'
        }, 'PUBLISH');
        const result$ = backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket));
        const resultPromise = lastValueFrom(result$);

        setTimeout(() => {
            const reqId = JSON.parse(String(socket.published[0].payload)).id;
            socket.emit('message', 'custom/replies', Buffer.from(JSON.stringify({ id: reqId, status: 200, payload: 'done' })));
        }, 0);

        const result = await resultPromise;
        expect(result).toBe('done');
        expect(socket.subscriptions).toContain('custom/replies');
        expect(socket.unsubscriptions).toContain('custom/replies');
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const socket = new FakeMqttClient();
        const request = new MqttRequest('topic.error', null, { observe: 'body' } as any, 'PUBLISH');
        const result$ = backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket));
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
        const result$ = backend(request.clone({ payload: { hello: 'world' } }), createContext(request, socket));
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
