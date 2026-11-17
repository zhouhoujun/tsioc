import expect = require('expect');
import * as zlib from 'zlib';
import { Transport } from '@tsdi/common';
import { GatewayObservability } from '../src/gateway.observability';
import { GatewayResponse } from '../src/gateway.response';
import { GatewayRuntime } from '../src/gateway.runtime';

describe('GatewayResponse', () => {
    function createRequest(overrides: any = {}) {
        const headers: Record<string, string> = { ...(overrides.headers ?? {}) };
        return {
            url: '/api/users',
            method: 'GET',
            headers,
            query: {},
            getHeader(name: string) {
                return headers[name.toLowerCase()] ?? headers[name];
            },
            socket: { remoteAddress: '127.0.0.1' },
            ...overrides
        } as any;
    }

    function createAdapter() {
        const headers: Record<string, string> = {};
        return {
            headers,
            status: 0,
            statusText: '',
            payload: undefined as any,
            setHeader(name: string, value: string) {
                headers[name.toLowerCase()] = String(value);
            },
            setStatus(status: number, statusText: string) {
                this.status = status;
                this.statusText = statusText;
            },
            setPayload(payload: any) {
                this.payload = payload;
            },
            sendResponse(payload: any) {
                this.payload = payload;
            }
        } as any;
    }

    function create(options: any = {}, runtime = new GatewayRuntime()) {
        const observability = new GatewayObservability(options, runtime, null, null, null);
        return { runtime, response: new GatewayResponse(options, runtime, observability) };
    }

    const route = {
        path: '/api/users',
        service: 'users-service',
        transport: Transport.HTTP
    } as any;

    it('applies response rewrites, masks fields and route headers', () => {
        const adapter = createAdapter();
        const { response } = create();
        const target = {
            ...route,
            responseHeaders: { 'x-route': '1' },
            maskFields: [{ field: 'phone', mask: '***' }],
            rewrite: {
                responseHeaders: { 'x-rewritten': 'yes' },
                responseBody: (payload: any) => ({ ...payload, rewritten: true })
            }
        };

        const returned = response.send(target, createRequest(), {
            status: 200,
            statusText: 'OK',
            payload: { id: 1, phone: '123456' },
            headers: { 'x-upstream': '1' }
        }, Date.now(), adapter, { end() { return undefined; } });

        expect(returned).toEqual({ id: 1, phone: '***', rewritten: true });
        expect(adapter.status).toBe(200);
        expect(adapter.headers['x-upstream']).toBe('1');
        expect(adapter.headers['x-rewritten']).toBe('yes');
        expect(adapter.headers['x-route']).toBe('1');
        expect(adapter.payload).toEqual({ id: 1, phone: '***', rewritten: true });
    });

    it('generates etags and returns 304 for matching if-none-match', () => {
        const { response } = create();
        const target = { ...route, responseCache: { etag: true } };

        const first = createAdapter();
        response.send(target, createRequest(), {
            status: 200, statusText: 'OK', payload: { id: 1 }
        }, Date.now(), first, undefined);
        const etag = first.headers['etag'];
        expect(etag).toMatch(/^W\/"[0-9a-f]{40}"$/);

        const second = createAdapter();
        response.send(target, createRequest({ headers: { 'if-none-match': etag } }), {
            status: 200, statusText: 'OK', payload: { id: 1 }
        }, Date.now(), second, undefined);
        expect(second.status).toBe(304);
        expect(second.payload).toBe(null);
    });

    it('sets cache-control and vary for cached responses', () => {
        const adapter = createAdapter();
        const { response } = create();
        response.send({
            ...route,
            responseCache: { cacheControl: 60, vary: ['accept-language'] }
        }, createRequest(), {
            status: 200, statusText: 'OK', payload: { ok: true }
        }, Date.now(), adapter, undefined);

        expect(adapter.headers['cache-control']).toBe('public, max-age=60');
        expect(adapter.headers['vary']).toBe('accept-language');
    });

    it('compresses large payloads only for accepted encodings', () => {
        const payload = { text: 'x'.repeat(1024) };
        const target = { ...route, compression: { enabled: true } };

        const gzipAdapter = createAdapter();
        const { response } = create({}, new GatewayRuntime());
        response.send(target, createRequest({ headers: { 'accept-encoding': 'gzip' } }), {
            status: 200, statusText: 'OK', payload
        }, Date.now(), gzipAdapter, undefined);
        expect(gzipAdapter.headers['content-encoding']).toBe('gzip');
        expect(JSON.parse(zlib.gunzipSync(gzipAdapter.payload).toString())).toEqual(payload);
        expect(gzipAdapter.headers['vary']).toBe('accept-encoding');

        const plainAdapter = createAdapter();
        response.send(target, createRequest(), {
            status: 200, statusText: 'OK', payload
        }, Date.now(), plainAdapter, undefined);
        expect(plainAdapter.headers['content-encoding']).toBe(undefined);
        expect(plainAdapter.payload).toEqual(payload);

        const smallAdapter = createAdapter();
        response.send({ ...route, compression: { enabled: true, minSize: 2048 } }, createRequest({ headers: { 'accept-encoding': 'br' } }), {
            status: 200, statusText: 'OK', payload: { small: true }
        }, Date.now(), smallAdapter, undefined);
        expect(smallAdapter.headers['content-encoding']).toBe(undefined);
    });

    it('keeps streaming responses untouched', () => {
        const adapter = createAdapter();
        const { response } = create({});
        const streamPayload = { pipe() { return this; } };
        response.send({ ...route, responseCache: { etag: true }, compression: { enabled: true } }, createRequest({ headers: { 'accept-encoding': 'gzip' } }), {
            status: 200,
            statusText: 'OK',
            payload: streamPayload,
            meta: { streaming: true }
        }, Date.now(), adapter, undefined);

        expect(adapter.payload).toBe(streamPayload);
        expect(adapter.headers['etag']).toBe(undefined);
        expect(adapter.headers['content-encoding']).toBe(undefined);
    });

    it('builds vary-aware cache keys and skips authenticated callers', () => {
        const { response } = create();
        const target = { ...route, cache: { enabled: true, vary: ['accept-language'] } };

        const key = response.resolveCacheKey(target, createRequest({ headers: { 'accept-language': 'zh-CN' } }));
        expect(key).toBe('/api/users:GET:/api/users|accept-language=zh-CN');

        expect(response.resolveCacheKey(target, createRequest({ headers: { authorization: 'Bearer x' } }))).toBe(null);
        expect(response.resolveCacheKey({ ...route, cache: { enabled: true, allowAuth: true } },
            createRequest({ headers: { authorization: 'Bearer x' } }))).toContain('auth=');
        expect(response.resolveCacheKey({ ...route, cache: false }, createRequest())).toBe(null);
    });

    it('honours cache controls and cookies when deciding to cache', () => {
        const { response } = create();
        const target = { ...route, cache: { enabled: true } };

        expect(response.shouldCache(target, { status: 200, statusText: 'OK', payload: {} })).toBe(true);
        expect(response.shouldCache(target, { status: 200, statusText: 'OK', payload: {}, headers: { 'set-cookie': 'a=1' } })).toBe(false);
        expect(response.shouldCache(target, { status: 200, statusText: 'OK', payload: {}, headers: { 'cache-control': 'private' } })).toBe(false);
        expect(response.shouldCache(target, { status: 500, statusText: 'ERR', payload: {} })).toBe(false);
        expect(response.shouldCache({ ...route, cache: false }, { status: 200, statusText: 'OK', payload: {} })).toBe(false);
    });

    it('resolves circuit fallbacks and mocks', () => {
        const { response } = create();

        expect(response.resolveFallbackPayload({ ...route, circuitBreaker: { fallback: { degraded: true } } },
            createRequest(), new Error('Circuit breaker is open'))).toMatchObject({
                payload: { degraded: true },
                headers: { 'x-gateway-fallback': '1' },
                meta: { outcome: 'fallback' }
            });

        expect(response.resolveFallbackPayload({ ...route, mock: { data: { mocked: true }, status: 202 } },
            createRequest())).toMatchObject({
                status: 202,
                payload: { mocked: true },
                headers: { 'x-gateway-mock': '1' },
                meta: { outcome: 'mock' }
            });

        expect(response.resolveFallbackPayload(route, createRequest())).toBe(null);
    });

    it('records route outcomes when sending responses', async () => {
        const adapter = createAdapter();
        const { response, runtime } = create();
        response.send(route, createRequest(), {
            status: 200, statusText: 'OK', payload: { ok: true }
        }, Date.now() - 3, adapter, undefined);

        const snapshot = await runtime.snapshot();
        expect(snapshot.routes[0].key).toBe('users-service:/api/users:2');
        expect(snapshot.routes[0].requests).toBe(1);
        expect(snapshot.routes[0].errors).toBe(0);
    });
});
