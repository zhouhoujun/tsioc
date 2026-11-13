import expect = require('expect');
import * as zlib from 'zlib';
import { Readable } from 'node:stream';
import { of } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, RequestContext, REQUEST, Transport, TransferSide } from '@tsdi/common';
import { HmacSignatureService, JWTService } from '@tsdi/security';
import { Logger } from '@tsdi/logger';
import { InMemoryServiceDiscovery } from '../../discovery/src';
import { ConfigurationManagerGatewayAdapter, GatewayInterceptor, GatewayLifecycle, GatewayModule, GatewayRuntime, InMemoryGatewayStateStore, classifyGatewayError } from '../src';
import { getClientToken } from '../../client/src/tokens';
import { DefaultConfigurationManager } from '../../config/src';
import { DefaultTracer } from '../../tracing/src';

describe('Gateway', () => {
    function createContext(adapter: any = {}, extra = new Map<any, any>()) {
        const context = createRequestContext(createInjector());
        extra.forEach((v, k) => context.set(k, v));
        return context;
    }

    it('forwards gateway requests to the upstream service', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'users-service',
            address: 'http://users.internal'
        });

        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/gateway/users',
                service: 'users-service',
                stripPrefix: true,
                targetPath: '/users'
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (url: any) => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true, url }; },
            async text() { return JSON.stringify({ ok: true, url }); }
        })) as any;

        const request = {
            url: '/gateway/users/profile',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.status).toBe(200);
        expect(sent.sentPayload.ok).toBe(true);
        expect(String(sent.sentPayload.url)).toContain('/users/profile');
    });

    function createRuleContext() {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);
        return { sent, context };
    }

    function runInterceptor(interceptor: GatewayInterceptor, request: any, context: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            interceptor.intercept(request, { handle: () => of(null) } as any, context).subscribe({
                next: () => resolve(),
                error: reject,
                complete: () => resolve()
            });
        });
    }

    it('rejects requests matched by a visual gateway rule', async () => {
        const { sent, context } = createRuleContext();
        const interceptor = new GatewayInterceptor({
            routes: [],
            rules: [{
                id: 'block-admin',
                when: [{ field: 'path', operator: 'prefix', value: '/admin' }],
                action: { type: 'deny', status: 401, message: 'Unauthorized' }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

        await runInterceptor(interceptor, {
            url: '/admin/users',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        } as any, context);

        expect(sent.status).toBe(401);
        expect(sent.sentPayload).toEqual({ statusCode: 401, message: 'Unauthorized' });
    });

    it('routes requests matched by visual rule conditions', async () => {
        const { sent, context } = createRuleContext();
        const interceptor = new GatewayInterceptor({
            routes: [],
            rules: [{
                id: 'vip-route',
                when: [
                    { field: 'path', operator: 'prefix', value: '/api/users' },
                    { field: 'method', operator: 'equals', value: 'GET' },
                    { field: 'header', name: 'x-role', operator: 'equals', value: 'vip' },
                    { field: 'query', name: 'region', operator: 'equals', value: 'cn' }
                ],
                action: {
                    type: 'route',
                    service: 'vip-service',
                    targetUrl: 'http://vip.internal',
                    stripPrefix: true,
                    targetPath: '/users'
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

        let fetchedUrl = '';
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (url: any) => {
            fetchedUrl = String(url);
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; },
                async text() { return '{"ok":true}'; }
            };
        }) as any;
        try {
            await runInterceptor(interceptor, {
                url: '/api/users/profile?region=cn',
                method: 'GET',
                headers: { 'x-role': 'vip' },
                socket: { remoteAddress: '127.0.0.1' }
            } as any, context);
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.status).toBe(200);
        expect(fetchedUrl).toBe('http://vip.internal/users/profile');
    });

    it('evaluates visual gateway rules by priority before the route table', async () => {
        const { sent, context } = createRuleContext();
        const interceptor = new GatewayInterceptor({
            routes: [{ path: '/api', service: 'fallback', targetUrl: 'http://fallback' }],
            rules: [
                { when: [{ field: 'path', operator: 'prefix', value: '/api' }], priority: 10, action: { type: 'deny', status: 403, message: 'Later' } },
                { when: [{ field: 'path', operator: 'prefix', value: '/api' }], priority: 1, action: { type: 'deny', status: 429, message: 'Earlier' } }
            ]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

        await runInterceptor(interceptor, {
            url: '/api/orders',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        } as any, context);

        expect(sent.status).toBe(429);
        expect(sent.sentPayload.message).toBe('Earlier');
    });

    it('matches route paths on segment boundaries and prefers the most specific route', async () => {
        const runtime = new GatewayRuntime();
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) { sent.status = code; sent.statusMessage = message; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const calls: string[] = [];
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (url: any) => {
            calls.push(String(url));
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { url: String(url) }; },
                async text() { return JSON.stringify({ url: String(url) }); }
            };
        }) as any;

        const run = async (interceptor: GatewayInterceptor, url: string) => {
            let nextCalled = 0;
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({ url, method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any, {
                    handle: () => { nextCalled++; return of(null); }
                } as any, context).subscribe({ next: () => undefined, error: reject, complete: () => resolve() });
            });
            return nextCalled;
        };

        try {
            const single = new GatewayInterceptor({
                routes: [{ path: '/api/users', service: 'users', targetUrl: 'http://users.internal' }]
            }, null as any, null as any, runtime, null as any, { get: () => null } as any);

            const unmatched = await run(single, '/api/users2');
            expect(unmatched).toBe(1);
            expect(calls.length).toBe(0);

            await run(single, '/api/users/profile');
            expect(calls[0]).toContain('http://users.internal/profile');

            const nested = new GatewayInterceptor({
                routes: [
                    { path: '/api', service: 'general', targetUrl: 'http://general.internal' },
                    { path: '/api/users', service: 'users', targetUrl: 'http://users.internal' }
                ]
            }, null as any, null as any, runtime, null as any, { get: () => null } as any);
            await run(nested, '/api/users/1');
            expect(calls[1]).toContain('http://users.internal/1');
            expect(calls[1]).not.toContain('general.internal');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('streams SSE responses instead of buffering them', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/events',
                service: 'sse-service',
                targetUrl: 'http://sse.internal',
                stream: true
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) { sent.status = code; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'text/event-stream' }),
            body: Readable.toWeb(Readable.from(['data: 1\n\n', 'data: 2\n\n']))
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({ url: '/events', method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => undefined,
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(sent.status).toBe(200);
            expect(sent.payload).toBeInstanceOf(Readable);
            const chunks: Buffer[] = [];
            for await (const chunk of sent.payload) {
                chunks.push(Buffer.from(chunk));
            }
            expect(Buffer.concat(chunks).toString('utf8')).toBe('data: 1\n\ndata: 2\n\n');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('strips hop-by-hop headers and sets forwarded headers and body length', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/api/echo',
                service: 'echo-service',
                targetUrl: 'http://echo.internal'
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) { sent.status = code; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const originalFetch = globalThis.fetch;
        let captured: any;
        globalThis.fetch = (async (_url: any, init: any) => {
            captured = init;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; }
            };
        }) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/api/echo',
                    method: 'POST',
                    body: 'hello',
                    headers: { host: 'example.com', connection: 'keep-alive', 'content-length': '99', 'x-test': '1' },
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(captured.headers.host).toBeUndefined();
            expect(captured.headers.connection).toBeUndefined();
            expect(captured.headers['x-test']).toBe('1');
            expect(captured.headers['content-length']).toBe('5');
            expect(captured.headers['x-forwarded-proto']).toBe('http');
            expect(captured.headers['x-forwarded-host']).toBe('example.com');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('rejects requests above the configured body size limit', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/limited',
                service: 'limited-service',
                targetUrl: 'http://limited.internal',
                maxBodyBytes: 4
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const context = createContext({});
        const originalFetch = globalThis.fetch;
        let called = false;
        globalThis.fetch = (async () => {
            called = true;
            throw new Error('should not forward');
        }) as any;

        try {
            let error: any;
            await new Promise<void>((resolve) => {
                interceptor.intercept({
                    url: '/limited',
                    method: 'POST',
                    body: { value: '12345' },
                    headers: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: (err) => { error = err; resolve(); },
                    complete: () => resolve()
                });
            });
            expect(error?.statusCode).toBe(413);
            expect(called).toBe(false);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports circuit breaker half-open probing', async () => {
        const runtime = new GatewayRuntime();
        const options = { failureThreshold: 1, resetTimeout: 5 };
        await runtime.recordFailure('route', options);
        expect(await runtime.canPassCircuit('route', options)).toBe(false);

        await new Promise(resolve => setTimeout(resolve, 10));
        expect(await runtime.canPassCircuit('route', options)).toBe(true);
        expect(await runtime.canPassCircuit('route', options)).toBe(false);

        await runtime.recordSuccess('route');
        expect(await runtime.canPassCircuit('route', options)).toBe(true);
    });

    it('queues bulkhead waiters and rejects when the queue is full', async () => {
        const runtime = new GatewayRuntime();
        const options = { maxConcurrent: 1, maxQueue: 1, queueTimeoutMs: 20 };
        const release = await runtime.acquireBulkhead('route', options);
        const queued = runtime.acquireBulkhead('route', options);

        await expect(runtime.acquireBulkhead('route', options)).rejects.toThrow('bulkhead');
        release();
        const queuedRelease = await queued;
        queuedRelease();
    });

    it('classifies gateway errors for logs, metrics and response headers', () => {
        expect(classifyGatewayError({ statusCode: 429 })).toBe('rate_limited');
        expect(classifyGatewayError({ statusCode: 503, message: 'Gateway bulkhead is full' })).toBe('bulkhead_full');
        expect(classifyGatewayError({ message: 'Circuit breaker is open' })).toBe('circuit_open');
        expect(classifyGatewayError({ statusCode: 401 })).toBe('unauthorized');
        expect(classifyGatewayError({ statusCode: 403 })).toBe('forbidden');
        expect(classifyGatewayError({ statusCode: 422 })).toBe('validation');
        expect(classifyGatewayError({ statusCode: 504 })).toBe('timeout');
        expect(classifyGatewayError({ code: 'ECONNREFUSED' })).toBe('network');
        expect(classifyGatewayError({ statusCode: 502 })).toBe('upstream');
        expect(classifyGatewayError(new Error('boom'))).toBe('internal');
    });

    it('wires built-in discovery providers when discovery is enabled', () => {
        const feature = GatewayModule.withOptions({ routes: [], discovery: true });
        expect(feature.providers?.some((provider: any) => provider === InMemoryServiceDiscovery)).toBe(true);
    });

    it('initializes an outbound HTTP pool when configured', () => {
        const interceptor = new GatewayInterceptor({
            routes: [],
            httpPool: { connections: 2, keepAliveTimeout: 1000 }
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);
        expect((interceptor as any).httpFetch).toBeDefined();
        interceptor.onDestroy();
    });

    it('emits a completed SERVER span per gateway request', async () => {
        const tracer = new DefaultTracer({ serviceName: 'gateway-test', propagateHeaders: true });
        const spans: any[] = [];
        tracer.addExporter({ export: async batch => { spans.push(...batch); } });
        const sent: any = {};
        const adapter = {
            setStatus(code: number) { sent.status = code; return this; },
            setHeader() { return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);
        const interceptor = new GatewayInterceptor({
            routes: [{ path: '/trace', service: 'trace-service', targetUrl: 'http://trace.internal' }]
        }, null as any, null as any, new GatewayRuntime(), null as any, tracer as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;
        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({ url: '/trace', method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any,
                    { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
            await tracer.flush();
        } finally {
            globalThis.fetch = originalFetch;
            await tracer.close();
        }

        const span = spans.find(item => item.kind === 'SERVER' && item.name.includes('/trace'));
        expect(span).toBeDefined();
        expect(span.status).toBe('OK');
        expect(span.duration).toBeGreaterThanOrEqual(0);
    });

    it('fails over to the next endpoint for retryable GET requests', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({ name: 'failover-service', id: 'node-a', address: 'http://node-a.internal' });
        await discovery.register({ name: 'failover-service', id: 'node-b', address: 'http://node-b.internal' });

        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) { sent.status = code; sent.statusMessage = message; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/failover',
                service: 'failover-service',
                loadBalance: { strategy: 'round-robin', retries: 1 },
                circuitBreaker: { failureThreshold: 1, resetTimeout: 60_000, perEndpoint: true }
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        let calls = 0;
        globalThis.fetch = (async (url: any) => {
            calls += 1;
            if (calls === 1) {
                throw new Error('node-a unavailable');
            }
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true, url }; },
                async text() { return JSON.stringify({ ok: true, url }); }
            } as any;
        }) as any;

        const request = {
            url: '/failover',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(calls).toBe(2);
            expect(sent.status).toBe(200);
            expect(String(sent.sentPayload.url)).toContain('node-b.internal');

            sent.headers = {};
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(calls).toBe(3);
            expect(String(sent.sentPayload.url)).toContain('node-b.internal');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('applies route-level rate limit', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'users-service',
            address: 'http://users.internal'
        });

        const adapter = {
            setStatus() { return this; },
            setHeader() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, {});

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/limited',
                service: 'users-service',
                rateLimit: { limit: 1, windowMs: 10_000 }
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        const request = {
            url: '/limited',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            let error: any;
            await new Promise<void>((resolve) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    error: err => {
                        error = err;
                        resolve();
                    },
                    complete: () => resolve()
                });
            });

            expect(error).toBeDefined();
            expect(error.statusCode).toBe(429);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('dispatches non-http routes to protocol-specific microservice clients', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const tcpClientToken = getClientToken({
            transport: Transport.TCP,
            side: TransferSide.client,
            microservice: true,
            features: {}
        } as any);
        const context = createContext(adapter, new Map());
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let capturedPattern: any;
        let capturedOptions: any;
        const injector = {
            get(token: any) {
                if (token === tcpClientToken) {
                    return {
                        send(pattern: any, options: any) {
                            capturedPattern = pattern;
                            capturedOptions = options;
                            return of({ payload: { protocol: 'tcp', ok: true } });
                        }
                    };
                }
                return null;
            }
        };

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/rpc/users',
                service: 'users-service',
                transport: Transport.TCP,
                pattern: { cmd: 'users.profile' } as any
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, injector as any);

        const request = {
            url: '/rpc/users/profile',
            method: 'POST',
            headers: {},
            body: { id: 'u1' },
            query: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        await new Promise<void>((resolve, reject) => {
            interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                next: () => resolve(),
                error: reject,
                complete: () => resolve()
            });
        });

        expect(capturedPattern).toEqual({ cmd: 'users.profile' });
        expect(capturedOptions.payload.body).toEqual({ id: 'u1' });
        expect(sent.sentPayload).toEqual({ protocol: 'tcp', ok: true });
    });

    it('applies gateway defaults such as prefix, default transport and headers', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const tcpClientToken = getClientToken({
            transport: Transport.TCP,
            side: TransferSide.client,
            microservice: true,
            features: {}
        } as any);
        const context = createContext(adapter, new Map());
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let capturedOptions: any;
        const injector = {
            get(token: any) {
                if (token === tcpClientToken) {
                    return {
                        send(_pattern: any, options: any) {
                            capturedOptions = options;
                            return of({ payload: { ok: true } });
                        }
                    };
                }
                return null;
            }
        };

        const interceptor = new GatewayInterceptor({
            defaults: {
                prefix: '/api',
                transport: Transport.TCP,
                headers: { 'x-gateway': 'core' },
                responseHeaders: { 'x-gateway-response': '1' }
            },
            routes: [{
                path: '/users',
                service: 'users-service',
                pattern: { cmd: 'users.list' } as any
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, injector as any);

        const request = {
            url: '/api/users',
            method: 'GET',
            headers: { accept: 'application/json' },
            query: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        await new Promise<void>((resolve, reject) => {
            interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                next: () => resolve(),
                error: reject,
                complete: () => resolve()
            });
        });

        expect(capturedOptions.payload.headers['x-gateway']).toBe('core');
        expect(sent.headers['x-gateway-response']).toBe('1');
        expect(sent.sentPayload).toEqual({ ok: true });
    });

    it('shares fixed-window rate limits through the state store', async () => {
        const runtime = new GatewayRuntime(new InMemoryGatewayStateStore());
        const adapter = {
            setStatus() { return this; },
            setHeader() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, {});

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/shared-limited',
                service: 'users-service',
                targetUrl: 'http://users.internal',
                rateLimit: { limit: 1, windowMs: 60_000 }
            }]
        }, null as any, null as any, runtime, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        const request = {
            url: '/shared-limited',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };
        const run = () => new Promise<any>((resolve) => {
            interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                next: () => resolve(undefined),
                error: (err) => resolve(err),
                complete: () => resolve(undefined)
            });
        });

        try {
            expect(await run()).toBeUndefined();
            const error = await run();
            expect(error?.statusCode).toBe(429);
            expect(error?.headers?.['Retry-After']).toBeDefined();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('applies global gateway rate limit before route forwarding', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'users-service',
            address: 'http://users.internal'
        });

        const adapter = {
            setStatus() { return this; },
            setHeader() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, {});

        const interceptor = new GatewayInterceptor({
            globalRateLimit: { limit: 1, windowMs: 10_000, message: 'gateway busy' },
            routes: [{
                path: '/global-limit',
                service: 'users-service'
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        const request = {
            url: '/global-limit',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            let error: any;
            await new Promise<void>((resolve) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    error: err => {
                        error = err;
                        resolve();
                    },
                    complete: () => resolve()
                });
            });

            expect(error).toBeDefined();
            expect(error.statusCode).toBe(429);
            expect(error.message).toBe('gateway busy');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports auth, request rewrite, response rewrite and masking', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'secure-service',
            address: 'http://secure.internal'
        });

        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            defaults: {
                auth: { bearerToken: 'secret-token' }
            },
            routes: [{
                path: '/secure',
                service: 'secure-service',
                rewrite: {
                    path: '/v2/profile',
                    query: { source: 'gateway' },
                    headers: { 'x-rewritten': '1' },
                    body: { rewritten: true },
                    responseHeaders: { 'x-response-rewritten': '1' },
                    responseBody: (payload: any) => ({ ...payload, note: 'rewritten' })
                },
                maskFields: [{ field: 'phone', mask: '***' }]
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        let capturedUrl = '';
        let capturedInit: RequestInit | undefined;
        globalThis.fetch = (async (url: any, init?: any) => {
            capturedUrl = String(url);
            capturedInit = init;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true, phone: '13800000000' }; },
                async text() { return '{"ok":true}'; }
            } as any;
        }) as any;

        const request = {
            url: '/secure/profile',
            method: 'POST',
            headers: {
                authorization: 'Bearer secret-token',
                host: 'gateway.local'
            },
            query: { id: 'u1' },
            body: { id: 'u1' },
            socket: { remoteAddress: '127.0.0.1' },
            getHeader(name: string) {
                return (this.headers as any)[name];
            }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(capturedUrl).toContain('/v2/profile');
        expect(capturedUrl).toContain('source=gateway');
        expect((capturedInit?.headers as any)['x-rewritten']).toBe('1');
        expect((capturedInit?.headers as any)['x-request-id']).toBeDefined();
        expect(sent.headers['x-response-rewritten']).toBe('1');
        expect(sent.sentPayload).toEqual({ ok: true, phone: '***', note: 'rewritten' });
    });

    it('supports ip access control and returns forbidden for denied clients', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/admin',
                service: 'secure-service',
                targetUrl: 'http://secure.internal',
                accessControl: {
                    denyIps: ['127.0.0.1']
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const context = createContext({});
        const request = {
            url: '/admin',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        let error: any;
        await new Promise<void>((resolve) => {
            interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                error: err => {
                    error = err;
                    resolve();
                },
                complete: () => resolve()
            });
        });

        expect(error).toBeDefined();
        expect(error.statusCode).toBe(403);
    });

    it('counts upstream 5xx responses as circuit and error failures', async () => {
        const runtime = new GatewayRuntime();
        const circuitBreaker = { failureThreshold: 1, resetTimeout: 60_000 };
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/flaky',
                service: 'flaky-service',
                targetUrl: 'http://flaky.internal',
                circuitBreaker
            }]
        }, null as any, null as any, runtime, null as any, { get: () => null } as any);

        const sent: any = { calls: 0 };
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => {
            sent.calls++;
            return {
                status: 500,
                statusText: 'Internal Server Error',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { message: 'boom' }; },
                async text() { return '{"message":"boom"}'; }
            };
        }) as any;

        const request = {
            url: '/flaky',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(sent.status).toBe(500);
            expect(sent.sentPayload).toEqual({ message: 'boom' });
            expect(await runtime.canPassCircuit('flaky-service:/flaky:2', circuitBreaker)).toBe(false);

            sent.status = undefined;
            let circuitError: any;
            await new Promise<void>((resolve) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: (err) => { circuitError = err; resolve(); },
                    complete: () => resolve()
                });
            });
            expect(circuitError?.statusCode).toBe(503);
            expect(sent.calls).toBe(1);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports cache and avoids duplicate upstream calls', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/cache',
                service: 'cache-service',
                targetUrl: 'http://cache.internal',
                cache: { enabled: true, ttl: 60_000 }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let calls = 0;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => {
            calls++;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { calls }; },
                async text() { return JSON.stringify({ calls }); }
            } as any;
        }) as any;

        const request = {
            url: '/cache',
            method: 'GET',
            headers: {},
            query: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            for (let i = 0; i < 2; i++) {
                await new Promise<void>((resolve, reject) => {
                    interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                        next: () => resolve(),
                        error: reject,
                        complete: () => resolve()
                    });
                });
            }
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(calls).toBe(1);
        expect(sent.headers['x-gateway-cache']).toBe('HIT');
    });

    it('does not share cached responses across authenticated callers by default', async () => {
        const runtime = new GatewayRuntime();
        const create = (allowAuth: boolean) => new GatewayInterceptor({
            routes: [{
                path: '/secure-cache',
                service: 'secure-cache',
                targetUrl: 'http://secure.internal',
                cache: { enabled: true, ttl: 60_000, allowAuth }
            }]
        }, null as any, null as any, runtime, null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) { sent.status = code; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let calls = 0;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => {
            calls++;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { calls }; },
                async text() { return JSON.stringify({ calls }); }
            } as any;
        }) as any;

        const run = async (interceptor: GatewayInterceptor, authorization: string) => {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/secure-cache',
                    method: 'GET',
                    headers: { authorization },
                    query: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        };

        try {
            const isolated = create(true);
            await run(isolated, 'Bearer a');
            await run(isolated, 'Bearer b');
            await run(isolated, 'Bearer a');
            expect(calls).toBe(2);

            calls = 0;
            runtime.invalidateConfigCaches();
            const shared = create(false);
            await run(shared, 'Bearer a');
            await run(shared, 'Bearer b');
            await run(shared, 'Bearer a');
            expect(calls).toBe(3);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('keys the cache by vary headers and caps the number of entries', async () => {
        const runtime = new GatewayRuntime();
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/vary-cache',
                service: 'vary-cache',
                targetUrl: 'http://vary.internal',
                cache: { enabled: true, ttl: 60_000, vary: ['accept-language'], maxEntries: 2 }
            }]
        }, null as any, null as any, runtime, null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) { sent.status = code; return this; },
            setHeader(name: string, value: string) { (sent.headers ??= {})[name] = value; return this; },
            setPayload(payload: any) { sent.payload = payload; return this; },
            sendResponse(payload: any) { sent.sentPayload = payload; }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let calls = 0;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => {
            calls++;
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { calls }; },
                async text() { return JSON.stringify({ calls }); }
            } as any;
        }) as any;

        const run = async (language: string) => {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/vary-cache',
                    method: 'GET',
                    headers: { 'accept-language': language },
                    query: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        };

        try {
            await run('en');
            await run('fr');
            expect(calls).toBe(2);
            await run('en');
            expect(calls).toBe(2);
            expect(sent.headers['x-gateway-cache']).toBe('HIT');
            expect(sent.headers.age).toBeDefined();

            await run('de');
            expect(calls).toBe(3);
            expect((await runtime.snapshot()).cacheEntries).toBeLessThanOrEqual(2);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports circuit breaker fallback and route mock on upstream failure', async () => {
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/unstable',
                service: 'unstable-service',
                targetUrl: 'http://unstable.internal',
                circuitBreaker: {
                    failureThreshold: 1,
                    fallback: { fallback: true }
                },
                mock: {
                    onError: true,
                    data: { mocked: true },
                    status: 200
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => {
            throw new Error('upstream unavailable');
        }) as any;

        const request = {
            url: '/unstable',
            method: 'GET',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(sent.sentPayload).toEqual({ mocked: true });
            expect(sent.headers['x-gateway-mock']).toBe('1');

            sent.headers = {};
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            expect(sent.sentPayload).toEqual({ fallback: true });
            expect(sent.headers['x-gateway-fallback']).toBe('1');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports host, header, canary and weighted endpoint selection', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'multi-service',
            id: 'node-a',
            address: 'http://node-a.internal',
            weight: 0
        });
        await discovery.register({
            name: 'multi-service',
            id: 'node-b',
            address: 'http://node-b.internal',
            weight: 10
        });

        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/rollout',
                service: 'multi-service',
                hosts: ['api.example.com'],
                matchHeaders: { 'x-release': 'canary' },
                canary: { header: { name: 'x-canary', value: '1' } },
                loadBalance: { strategy: 'weighted' }
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        let calledUrl = '';
        globalThis.fetch = (async (url: any) => {
            calledUrl = String(url);
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true, url }; },
                async text() { return JSON.stringify({ ok: true, url }); }
            } as any;
        }) as any;

        const request = {
            url: '/rollout',
            method: 'GET',
            headers: {
                host: 'api.example.com',
                'x-release': 'canary',
                'x-canary': '1'
            },
            socket: { remoteAddress: '127.0.0.1' },
            getHeader(name: string) {
                return (this.headers as any)[name];
            }
        };

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(calledUrl).toContain('node-b.internal');
        expect(sent.sentPayload.ok).toBe(true);
    });

    it('supports canary routing by endpoint version, tags and metadata', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'versioned-service',
            id: 'stable-node',
            address: 'http://stable.internal',
            version: 'v1',
            tags: ['stable'],
            metadata: { stage: 'prod' }
        });
        await discovery.register({
            name: 'versioned-service',
            id: 'canary-node',
            address: 'http://canary.internal',
            version: 'v2',
            tags: ['canary', 'beta'],
            metadata: { stage: 'gray' }
        });

        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/canary/versioned',
                service: 'versioned-service',
                canary: {
                    header: { name: 'x-canary', value: '1' },
                    version: 'v2',
                    tags: ['canary'],
                    metadata: { stage: 'gray' }
                }
            }]
        }, discovery as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        let calledUrl = '';
        globalThis.fetch = (async (url: any) => {
            calledUrl = String(url);
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; },
                async text() { return '{"ok":true}'; }
            } as any;
        }) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/canary/versioned',
                    method: 'GET',
                    headers: { 'x-canary': '1' },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(calledUrl).toContain('canary.internal');
        expect(calledUrl).not.toContain('stable.internal');
    });

    it('supports dynamic gateway config hot updates', async () => {
        const config = new DefaultConfigurationManager({ defaults: {} });
        const runtime = new GatewayRuntime();
        const lifecycle = new GatewayLifecycle({
            routes: [{
                path: '/old',
                service: 'users-service',
                targetUrl: 'http://old.internal'
            }],
            configSync: {
                enabled: true,
                key: 'gateway'
            }
        }, runtime, config as any, null as any, null as any);
        lifecycle.start();

        config.set('gateway', {
            routes: [{
                path: '/new',
                service: 'users-service',
                targetUrl: 'http://new.internal'
            }]
        });

        const routes = runtime.getRoutes([{
            path: '/old',
            service: 'users-service',
            targetUrl: 'http://old.internal'
        }]);
        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('/new');

        lifecycle.onDestroy();
    });

    it('supports nacos/apollo/consul style gateway config adapter keys', () => {
        const manager = new DefaultConfigurationManager({ defaults: {} });
        manager.set('nacos.public.DEFAULT_GROUP.gateway', { routes: [{ path: '/nacos', service: 'svc' }] });
        manager.set('apollo.application.gateway', { routes: [{ path: '/apollo', service: 'svc' }] });
        manager.set('consul/core/gateway', { routes: [{ path: '/consul', service: 'svc' }] });

        const nacos = new ConfigurationManagerGatewayAdapter(manager as any, {
            provider: 'nacos',
            namespace: 'public',
            group: 'DEFAULT_GROUP',
            key: 'gateway'
        });
        const apollo = new ConfigurationManagerGatewayAdapter(manager as any, {
            provider: 'apollo',
            namespace: 'application',
            key: 'gateway'
        });
        const consul = new ConfigurationManagerGatewayAdapter(manager as any, {
            provider: 'consul',
            namespace: 'core',
            key: 'gateway'
        });

        expect(nacos.load()?.routes?.[0]?.path).toBe('/nacos');
        expect(apollo.load()?.routes?.[0]?.path).toBe('/apollo');
        expect(consul.load()?.routes?.[0]?.path).toBe('/consul');
    });

    it('supports gateway lifecycle config sync through adapter-style keys', async () => {
        const config = new DefaultConfigurationManager({ defaults: {} });
        const adapter = new ConfigurationManagerGatewayAdapter(config as any, {
            provider: 'nacos',
            namespace: 'public',
            group: 'DEFAULT_GROUP',
            key: 'gateway'
        });
        const runtime = new GatewayRuntime();
        const lifecycle = new GatewayLifecycle({
            routes: [{
                path: '/old-adapter',
                service: 'svc',
                targetUrl: 'http://old.internal'
            }],
            configSync: {
                enabled: true,
                provider: 'nacos',
                namespace: 'public',
                group: 'DEFAULT_GROUP',
                key: 'gateway'
            }
        }, runtime, config as any, adapter as any, null as any);

        lifecycle.start();
        config.set('nacos.public.DEFAULT_GROUP.gateway', {
            routes: [{
                path: '/new-adapter',
                service: 'svc',
                targetUrl: 'http://new.internal'
            }]
        });

        const routes = runtime.getRoutes([{
            path: '/old-adapter',
            service: 'svc',
            targetUrl: 'http://old.internal'
        }]);
        expect(routes[0].path).toBe('/new-adapter');
        lifecycle.onDestroy();
    });

    it('evicts unhealthy endpoints during active health probing', async () => {
        const discovery = new InMemoryServiceDiscovery();
        await discovery.register({
            name: 'probe-service',
            id: 'up-node',
            address: 'http://up-node.internal',
            protocol: 'http'
        });
        await discovery.register({
            name: 'probe-service',
            id: 'down-node',
            address: 'http://down-node.internal',
            protocol: 'http'
        });

        const originalHealthCheck = discovery.healthCheck.bind(discovery);
        discovery.healthCheck = async (endpoint: any) => {
            if (endpoint.id === 'down-node') {
                return false;
            }
            return originalHealthCheck(endpoint);
        };

        const runtime = new GatewayRuntime();
        const lifecycle = new GatewayLifecycle({
            routes: [{
                path: '/probe',
                service: 'probe-service',
                loadBalance: { strategy: 'round-robin' }
            }],
            healthProbe: {
                enabled: true,
                interval: 5,
                evictFor: 1000
            }
        }, runtime, null as any, null as any, discovery as any);
        lifecycle.start();

        await new Promise(resolve => setTimeout(resolve, 20));

        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        let calledUrl = '';
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (url: any) => {
            calledUrl = String(url);
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; },
                async text() { return '{"ok":true}'; }
            } as any;
        }) as any;

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/probe',
                service: 'probe-service'
            }],
            healthProbe: {
                enabled: true,
                interval: 5,
                evictFor: 1000
            }
        }, discovery as any, null as any, runtime, lifecycle, null as any, { get: () => null } as any);

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/probe',
                    method: 'GET',
                    headers: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
            lifecycle.onDestroy();
        }

        expect(calledUrl).toContain('up-node.internal');
        expect(calledUrl).not.toContain('down-node.internal');
    });

    it('supports request aggregation across multiple downstream http services', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/dashboard',
                service: 'aggregate-root',
                aggregate: {
                    enabled: true,
                    sources: [{
                        name: 'user',
                        service: 'users-service',
                        targetUrl: 'http://users.internal',
                        path: '/profile'
                    }, {
                        name: 'orders',
                        service: 'orders-service',
                        targetUrl: 'http://orders.internal',
                        path: '/latest'
                    }],
                    combine(results: Record<string, any>) {
                        return {
                            user: results.user,
                            orders: results.orders,
                            totalOrders: results.orders.items.length
                        };
                    }
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        const calls: string[] = [];
        globalThis.fetch = (async (url: any) => {
            const target = String(url);
            calls.push(target);
            if (target.includes('users.internal')) {
                return {
                    status: 200,
                    statusText: 'OK',
                    headers: new Headers({ 'content-type': 'application/json' }),
                    async json() { return { id: 'u1', name: 'alice' }; },
                    async text() { return '{"id":"u1","name":"alice"}'; }
                } as any;
            }
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { items: [{ id: 'o1' }, { id: 'o2' }] }; },
                async text() { return '{"items":[{"id":"o1"},{"id":"o2"}]}'; }
            } as any;
        }) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/dashboard',
                    method: 'GET',
                    headers: {},
                    query: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(calls).toHaveLength(2);
        expect(sent.sentPayload).toEqual({
            user: { id: 'u1', name: 'alice' },
            orders: { items: [{ id: 'o1' }, { id: 'o2' }] },
            totalOrders: 2
        });
    });

    it('supports webhook notifications after gateway response', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/payments/callback',
                service: 'payments-service',
                targetUrl: 'http://payments.internal',
                webhook: {
                    enabled: true,
                    url: 'http://hooks.internal/audit',
                    async: false,
                    onSuccess: true,
                    headers: { 'x-webhook-source': 'gateway' },
                    body: (_request: any, response: any) => ({
                        status: response.status,
                        payload: response.payload
                    })
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        const captured: Array<{ url: string; init?: RequestInit }> = [];
        globalThis.fetch = (async (url: any, init?: any) => {
            captured.push({ url: String(url), init });
            if (String(url).includes('hooks.internal')) {
                return {
                    status: 202,
                    statusText: 'Accepted',
                    headers: new Headers({ 'content-type': 'application/json' }),
                    async json() { return { ok: true }; },
                    async text() { return '{"ok":true}'; }
                } as any;
            }
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { paid: true, orderId: 'p1' }; },
                async text() { return '{"paid":true,"orderId":"p1"}'; }
            } as any;
        }) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/payments/callback',
                    method: 'POST',
                    headers: {},
                    body: { event: 'paid' },
                    query: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(captured).toHaveLength(2);
        expect(captured[1].url).toContain('hooks.internal/audit');
        expect((captured[1].init?.headers as any)['x-webhook-source']).toBe('gateway');
        expect(JSON.parse(String(captured[1].init?.body))).toEqual({
            status: 200,
            payload: { paid: true, orderId: 'p1' }
        });
        expect(sent.sentPayload).toEqual({ paid: true, orderId: 'p1' });
    });

    it('supports api key validation', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number) {
                sent.status = code;
                return this;
            },
            setHeader() { return this; },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/secure-key',
                service: 'key-service',
                targetUrl: 'http://key.internal',
                apiKey: {
                    keys: ['k-1']
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/secure-key',
                    method: 'GET',
                    headers: { 'x-api-key': 'k-1' },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.sentPayload).toEqual({ ok: true });
    });

    it('rejects invalid api key and replayed signatures', async () => {
        const runtime = new GatewayRuntime();
        const signatureService = new HmacSignatureService();
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/signed',
                service: 'signed-service',
                targetUrl: 'http://signed.internal',
                apiKey: {
                    keys: ['valid-key']
                },
                signature: {
                    secret: 'gateway-secret',
                    preventReplay: true,
                    maxSkew: 60_000
                }
            }]
        }, null as any, null as any, runtime, null as any, null as any, {
            get(token: any, defaultValue?: any) {
                if (token === HmacSignatureService) {
                    return signatureService;
                }
                return defaultValue;
            }
        } as any);

        const invalidContext = createContext({});
        let invalidApiKeyError: any;
        await new Promise<void>((resolve) => {
            interceptor.intercept({
                url: '/signed',
                method: 'GET',
                headers: { 'x-api-key': 'bad-key' },
                socket: { remoteAddress: '127.0.0.1' },
                getHeader(name: string) {
                    return (this.headers as any)[name];
                }
            } as any, { handle: () => of(null) } as any, invalidContext).subscribe({
                error: err => {
                    invalidApiKeyError = err;
                    resolve();
                },
                complete: () => resolve()
            });
        });
        expect(invalidApiKeyError.statusCode).toBe(401);

        const ts = String(Date.now());
        const nonce = 'nonce-1';
        const canonical = ['POST', '/signed', ts, nonce, JSON.stringify({ amount: 1 })].join('\n');
        const signature = signatureService.sign(canonical, 'gateway-secret');

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        try {
            const goodContext = createContext({
                setStatus() { return this; },
                setHeader() { return this; },
                setPayload() { return this; },
                sendResponse() { return; }
            });
            (goodContext as any).set(require('../../http/src/server').HttpMessageAdapter, {
                setStatus() { return this; },
                setHeader() { return this; },
                setPayload() { return this; },
                sendResponse() { return; }
            });
            (goodContext as any).set(require('../../http/src/server').HTTP_RESPONSE, {});

            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/signed',
                    method: 'POST',
                    headers: {
                        'x-api-key': 'valid-key',
                        'x-signature': signature,
                        'x-timestamp': ts,
                        'x-nonce': nonce
                    },
                    body: { amount: 1 },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, goodContext).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });

            let replayError: any;
            await new Promise<void>((resolve) => {
                interceptor.intercept({
                    url: '/signed',
                    method: 'POST',
                    headers: {
                        'x-api-key': 'valid-key',
                        'x-signature': signature,
                        'x-timestamp': ts,
                        'x-nonce': nonce
                    },
                    body: { amount: 1 },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, goodContext).subscribe({
                    error: err => {
                        replayError = err;
                        resolve();
                    },
                    complete: () => resolve()
                });
            });

            expect(replayError.statusCode).toBe(409);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('applies cache-control and etag headers to successful responses', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/catalog',
                service: 'catalog-service',
                targetUrl: 'http://catalog.internal',
                responseCache: {
                    cacheControl: 120,
                    etag: true,
                    vary: ['accept-encoding']
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { items: [1, 2] }; },
            async text() { return '{"items":[1,2]}'; }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/catalog',
                    method: 'GET',
                    headers: {},
                    socket: { remoteAddress: '127.0.0.1' }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.status).toBe(200);
        expect(sent.headers['cache-control']).toBe('public, max-age=120');
        expect(sent.headers['vary']).toBe('accept-encoding');
        expect(sent.headers['etag']).toBeDefined();
    });

    it('returns 304 when if-none-match matches generated etag', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const payload = { version: 1 };
        const hash = require('crypto').createHash('sha1').update(JSON.stringify(payload)).digest('hex');
        const etag = `W/\"${hash}\"`;

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/cached',
                service: 'cache-service',
                targetUrl: 'http://cache.internal',
                responseCache: {
                    etag: true
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return payload; },
            async text() { return JSON.stringify(payload); }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/cached',
                    method: 'GET',
                    headers: { 'if-none-match': etag },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.status).toBe(304);
        expect(sent.sentPayload).toBeNull();
        expect(sent.headers['etag']).toBe(etag);
    });

    it('supports role and scope based authorization from jwt claims', async () => {
        const jwtService = new JWTService();
        const token = await jwtService.sign({
            sub: 'u-1',
            role: 'admin',
            scope: 'orders.read orders.write'
        }, { privateKey: 'jwt-secret' as any });

        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/orders',
                service: 'orders-service',
                targetUrl: 'http://orders.internal',
                auth: {
                    jwt: {
                        publicKey: 'jwt-secret' as any,
                        algorithms: ['HS256']
                    }
                },
                authorize: {
                    roles: ['admin'],
                    scopes: ['orders.read']
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, {
            get(tokenRef: any, defaultValue?: any) {
                if (tokenRef === JWTService) {
                    return jwtService;
                }
                return defaultValue;
            }
        } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/orders',
                    method: 'GET',
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.sentPayload).toEqual({ ok: true });
    });

    it('rejects requests when claims-based authorization does not match', async () => {
        const context = createContext({});
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/admin-only',
                service: 'admin-service',
                targetUrl: 'http://admin.internal',
                authorize: {
                    roles: ['admin'],
                    scopes: ['system.manage'],
                    claims: { tenant: 'core' }
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const request = {
            url: '/admin-only',
            method: 'GET',
            headers: {},
            _auth: {
                authenticated: true,
                token: 'token',
                claims: {
                    role: 'viewer',
                    scope: 'system.read',
                    tenant: 'other'
                }
            },
            socket: { remoteAddress: '127.0.0.1' }
        };

        let error: any;
        await new Promise<void>((resolve) => {
            interceptor.intercept(request as any, { handle: () => of(null) } as any, context).subscribe({
                error: err => {
                    error = err;
                    resolve();
                },
                complete: () => resolve()
            });
        });

        expect(error).toBeDefined();
        expect(error.statusCode).toBe(403);
    });

    it('compresses gateway responses when client accepts gzip', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/compressed',
                service: 'compressed-service',
                targetUrl: 'http://compressed.internal',
                compression: {
                    enabled: true,
                    algorithms: ['gzip'],
                    minSize: 8
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { text: 'a'.repeat(64) }; },
            async text() { return JSON.stringify({ text: 'a'.repeat(64) }); }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/compressed',
                    method: 'GET',
                    headers: { 'accept-encoding': 'gzip' },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.headers['content-encoding']).toBe('gzip');
        expect(Buffer.isBuffer(sent.sentPayload)).toBe(true);
        const body = JSON.parse(zlib.gunzipSync(sent.sentPayload).toString('utf8'));
        expect(body).toEqual({ text: 'a'.repeat(64) });
    });

    it('skips compression when payload is smaller than minSize', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/small',
                service: 'small-service',
                targetUrl: 'http://small.internal',
                compression: {
                    enabled: true,
                    algorithms: ['gzip'],
                    minSize: 1024
                }
            }]
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any, { get: () => null } as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/small',
                    method: 'GET',
                    headers: { 'accept-encoding': 'gzip' },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(sent.headers?.['content-encoding']).toBeUndefined();
        expect(sent.sentPayload).toEqual({ ok: true });
    });

    it('emits structured access logs and enriched metrics labels', async () => {
        const sent: any = {};
        const adapter = {
            setStatus(code: number, message?: string) {
                sent.status = code;
                sent.statusMessage = message;
                return this;
            },
            setHeader(name: string, value: string) {
                (sent.headers ??= {})[name] = value;
                return this;
            },
            setPayload(payload: any) {
                sent.payload = payload;
                return this;
            },
            sendResponse(payload: any) {
                sent.sentPayload = payload;
            }
        };
        const context = createContext(adapter);
        (context as any).set(require('../../http/src/server').HttpMessageAdapter, adapter);
        (context as any).set(require('../../http/src/server').HTTP_RESPONSE, sent);

        const metricsCalls: Array<{ type: string; name: string; value: any; labels: Record<string, string> }> = [];
        const metrics = {
            increment(name: string, value: number, labels: Record<string, string>) {
                metricsCalls.push({ type: 'increment', name, value, labels });
            },
            timing(name: string, value: number, labels: Record<string, string>) {
                metricsCalls.push({ type: 'timing', name, value, labels });
            }
        };
        const logs: Array<{ level: string; event: string; payload: any }> = [];
        const logger: Partial<Logger> = {
            info(event: string, payload: any) {
                logs.push({ level: 'info', event, payload });
            },
            error(event: string, payload: any) {
                logs.push({ level: 'error', event, payload });
            }
        };
        const injector = {
            get(token: any, defaultValue?: any) {
                if (token === Logger) {
                    return logger;
                }
                return defaultValue ?? null;
            }
        };

        const interceptor = new GatewayInterceptor({
            observability: {
                accessLog: {
                    enabled: true,
                    includeHeaders: ['x-request-id'],
                    includeQuery: true
                },
                metrics: {
                    includeEndpoint: true
                }
            },
            routes: [{
                path: '/observed',
                service: 'observed-service',
                targetUrl: 'http://observed.internal',
                canary: {
                    percentage: 100
                }
            }]
        }, null as any, metrics as any, new GatewayRuntime(), null as any, injector as any);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { ok: true }; },
            async text() { return '{"ok":true}'; }
        })) as any;

        try {
            await new Promise<void>((resolve, reject) => {
                interceptor.intercept({
                    url: '/observed?tenant=t1',
                    method: 'GET',
                    headers: { 'x-request-id': 'req-1', host: 'gw.internal' },
                    query: { tenant: 't1' },
                    socket: { remoteAddress: '127.0.0.1' },
                    getHeader(name: string) {
                        return (this.headers as any)[name];
                    }
                } as any, { handle: () => of(null) } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject,
                    complete: () => resolve()
                });
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(logs.length).toBe(1);
        expect(logs[0].level).toBe('info');
        expect(logs[0].event).toBe('gateway.access');
        expect(logs[0].payload.service).toBe('observed-service');
        expect(logs[0].payload.endpoint).toBe('http://observed.internal');
        expect(logs[0].payload.requestId).toBe('req-1');
        expect(logs[0].payload.query).toEqual({ tenant: 't1' });
        expect(logs[0].payload.headers).toEqual({ 'x-request-id': 'req-1' });

        const increment = metricsCalls.find(call => call.type === 'increment' && call.name === 'gateway_requests_total');
        const timing = metricsCalls.find(call => call.type === 'timing' && call.name === 'gateway_request_duration_ms');
        expect(increment).toBeDefined();
        expect(timing).toBeDefined();
        expect(increment!.labels.endpoint).toBe('http://observed.internal');
        expect(increment!.labels.cache).toBe('SKIP');
        expect(increment!.labels.outcome).toBe('upstream');
        expect(increment!.labels.canary).toBe('true');
    });
});
