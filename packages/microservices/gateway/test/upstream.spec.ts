import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, Transport } from '@tsdi/common';
import { HttpMessageAdapter, HTTP_RESPONSE } from '@tsdi/http-microservice';
import { HmacSignatureService, HttpAuthService } from '@tsdi/security';
import { of } from 'rxjs';
import { GatewayAuth } from '../src/gateway.auth';
import { GatewayLoadBalancer } from '../src/load-balancer';
import { GatewayObservability } from '../src/gateway.observability';
import { GatewayRateLimiter } from '../src/gateway.rate-limit';
import { GatewayResponse } from '../src/gateway.response';
import { GatewayRuntime } from '../src/gateway.runtime';
import { GatewayUpstream } from '../src/gateway.upstream';

describe('GatewayUpstream', () => {
    function createUpstream(options: any = {}, deps: any = {}) {
        const runtime = deps.runtime ?? new GatewayRuntime();
        const observability = new GatewayObservability(options, runtime, null, null, null);
        const auth = new GatewayAuth(options, runtime, new HttpAuthService(), new HmacSignatureService());
        const response = new GatewayResponse(options, runtime, observability);
        const rateLimiter = new GatewayRateLimiter(options, runtime);
        const upstream = new GatewayUpstream(
            options,
            runtime,
            deps.discovery ?? null,
            deps.endpointResolver ?? null,
            new GatewayLoadBalancer(runtime),
            deps.injector ?? { get: (_token: any, defaultValue?: any) => defaultValue } as any,
            {
                observability,
                auth,
                response,
                rateLimiter,
                getFetch: deps.getFetch
            }
        );
        return { upstream, runtime, rateLimiter };
    }

    function createContext() {
        const adapter = {
            headers: {} as Record<string, string>,
            status: 0,
            payload: undefined as any,
            setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
            setStatus(status: number) { this.status = status; },
            setPayload(payload: any) { this.payload = payload; },
            sendResponse(payload: any) { this.payload = payload; }
        };
        const context = createRequestContext(createInjector());
        context.set(HttpMessageAdapter, adapter as any);
        context.set(HTTP_RESPONSE, { end() { return undefined; } } as any);
        return { context, adapter };
    }

    function createRequest(overrides: any = {}) {
        const headers: Record<string, string> = { ...(overrides.headers ?? {}) };
        return {
            url: '/api/users?active=1',
            method: 'GET',
            headers,
            query: { active: '1' },
            body: undefined,
            getHeader(name: string) {
                return headers[name.toLowerCase()] ?? headers[name];
            },
            socket: { remoteAddress: '10.0.0.5' },
            ...overrides
        } as any;
    }

    function jsonFetch(calls: Array<{ url: string; init: any }>) {
        return (async (url: string, init: any) => {
            calls.push({ url, init });
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: undefined,
                async json() { return { ok: true, url }; },
                async text() { return '{"ok":true}'; }
            };
        }) as any;
    }

    it('builds upstream urls with rewrite, target path and query', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const original = globalThis.fetch;
        globalThis.fetch = jsonFetch(calls);
        try {
            const { upstream } = createUpstream({});
            const { context } = createContext();
            await upstream.forward({
                path: '/api/users',
                service: 'users-service',
                targetUrl: 'http://users.internal',
                targetPath: '/v2',
                rewrite: { path: '/profile', query: { source: 'gateway' } }
            } as any, createRequest({ query: {} }), context);

            expect(calls.length).toBe(1);
            expect(calls[0].url).toBe('http://users.internal/v2/profile?source=gateway');
        } finally {
            globalThis.fetch = original;
        }
    });

    it('forwards headers while dropping hop-by-hop values and adding proxy headers', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const original = globalThis.fetch;
        globalThis.fetch = jsonFetch(calls);
        try {
            const { upstream } = createUpstream({});
            const { context } = createContext();
            await upstream.forward({
                path: '/api/users',
                service: 'users-service',
                targetUrl: 'http://users.internal',
                headers: { 'x-route': '1' },
                forwardHeaders: { exclude: ['x-secret'] },
                rewrite: { headers: { 'x-rewritten': 'yes' } }
            } as any, createRequest({
                headers: {
                    host: 'api.local',
                    'x-secret': 'hidden',
                    'connection': 'keep-alive',
                    'accept': 'application/json',
                    'x-request-id': 'req-1'
                }
            }), context);

            const headers = calls[0].init.headers;
            expect(headers['accept']).toBe('application/json');
            expect(headers['x-route']).toBe('1');
            expect(headers['x-rewritten']).toBe('yes');
            expect(headers['x-request-id']).toBe('req-1');
            expect(headers['x-secret']).toBe(undefined);
            expect(headers['connection']).toBe(undefined);
            expect(headers['x-forwarded-for']).toBe('10.0.0.5');
            expect(headers['x-forwarded-proto']).toBe('http');
            expect(headers['x-forwarded-host']).toBe('api.local');
            expect(headers['x-forwarded-method']).toBe('GET');
        } finally {
            globalThis.fetch = original;
        }
    });

    it('sends bodies and content-length for write methods', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const original = globalThis.fetch;
        globalThis.fetch = jsonFetch(calls);
        try {
            const { upstream } = createUpstream({});
            const { context } = createContext();
            await upstream.forward({
                path: '/api/orders',
                service: 'orders-service',
                targetUrl: 'http://orders.internal',
                rewrite: { body: { amount: 2 } }
            } as any, createRequest({
                url: '/api/orders',
                method: 'POST',
                body: { amount: 1 }
            }), context);

            expect(calls[0].init.method).toBe('POST');
            expect(calls[0].init.body).toBe(JSON.stringify({ amount: 2 }));
            expect(calls[0].init.headers['content-length']).toBe(String(Buffer.byteLength(JSON.stringify({ amount: 2 }))));
        } finally {
            globalThis.fetch = original;
        }
    });

    it('retries retryable failures through discovered endpoints', async () => {
        let calls = 0;
        const original = globalThis.fetch;
        globalThis.fetch = (async () => {
            calls += 1;
            if (calls === 1) {
                throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
            }
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json' }),
                async json() { return { ok: true }; },
                async text() { return '{"ok":true}'; }
            };
        }) as any;
        try {
            const { upstream } = createUpstream({}, {
                endpointResolver: {
                    resolve: async () => [{
                        id: 'users-1',
                        address: '127.0.0.1:9001',
                        protocol: 'http',
                        status: 'UP',
                        metadata: {}
                    }, {
                        id: 'users-2',
                        address: '127.0.0.1:9002',
                        protocol: 'http',
                        status: 'UP',
                        metadata: {}
                    }]
                }
            });
            const { context, adapter } = createContext();
            await upstream.forward({
                path: '/api/users',
                service: 'users-service',
                loadBalance: { retries: 1, retryMethods: ['GET'], retryOn: [502, 503, 504] }
            } as any, createRequest(), context);

            expect(calls).toBe(2);
            expect(adapter.status).toBe(200);
            expect(adapter.payload).toEqual({ ok: true });
        } finally {
            globalThis.fetch = original;
        }
    });

    it('fails with 503 when no endpoint is available', async () => {
        const { upstream } = createUpstream({}, {
            endpointResolver: { resolve: async () => [] }
        });
        const { context } = createContext();
        let error: any;
        try {
            await upstream.forward({
                path: '/api/users',
                service: 'users-service'
            } as any, createRequest(), context);
        } catch (err) {
            error = err;
        }
        expect(error.statusCode).toBe(503);
        expect(error.message).toContain('users-service');
    });

    it('rejects oversized request bodies', async () => {
        const { upstream } = createUpstream({});
        const { context } = createContext();
        let error: any;
        try {
            await upstream.forward({
                path: '/api/orders',
                service: 'orders-service',
                targetUrl: 'http://orders.internal',
                maxBodyBytes: 4
            } as any, createRequest({ method: 'POST', body: { amount: 1 } }), context);
        } catch (err) {
            error = err;
        }
        expect(error.statusCode).toBe(413);
        expect(error.statusMessage).toBe('Payload Too Large');
    });

    it('returns aggregate payloads from multiple sources', async () => {
        const original = globalThis.fetch;
        globalThis.fetch = (async (url: string) => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            async json() { return { from: url }; },
            async text() { return ''; }
        })) as any;
        try {
            const { upstream } = createUpstream({});
            const { context, adapter } = createContext();
            await upstream.forward({
                path: '/api/overview',
                service: 'overview-service',
                aggregate: {
                    enabled: true,
                    sources: [
                        { name: 'users', service: 'users-service', targetUrl: 'http://users.internal' },
                        { name: 'orders', service: 'orders-service', targetUrl: 'http://orders.internal' }
                    ]
                }
            } as any, createRequest({ url: '/api/overview', body: undefined }), context);

            expect(adapter.payload).toEqual({
                users: { from: 'http://users.internal/?active=1' },
                orders: { from: 'http://orders.internal/?active=1' }
            });
        } finally {
            globalThis.fetch = original;
        }
    });

    it('dispatches non-http routes to protocol clients', async () => {
        const sent: Array<{ pattern: string; options: any }> = [];
        const client = {
            send(pattern: string, options: any) {
                sent.push({ pattern, options });
                return of({ payload: { ok: true } });
            }
        };
        const { upstream } = createUpstream({}, {
            injector: { get: (_token: any, defaultValue?: any) => client ?? defaultValue } as any
        });
        const { context, adapter } = createContext();
        await upstream.forward({
            path: '/rpc/users',
            service: 'users-service',
            transport: Transport.TCP,
            pattern: 'users.get'
        } as any, createRequest({ url: '/rpc/users', body: { id: 1 } }), context);

        expect(sent.length).toBe(1);
        expect(sent[0].pattern).toBe('users.get');
        expect(sent[0].options.payload.payload).toEqual({ id: 1 });
        expect(adapter.payload).toEqual({ ok: true });
    });

    it('dispatches and optionally awaits webhooks', async () => {
        const calls: string[] = [];
        const original = globalThis.fetch;
        globalThis.fetch = (async (url: string) => {
            calls.push(url);
            return { status: 200, headers: new Headers(), async json() { return {}; }, async text() { return ''; } };
        }) as any;
        try {
            const { upstream } = createUpstream({});
            const { context } = createContext();
            await upstream.forward({
                path: '/api/users',
                service: 'users-service',
                targetUrl: 'http://users.internal',
                webhook: { enabled: true, url: 'http://hooks.internal/notify', async: false }
            } as any, createRequest(), context);

            expect(calls).toEqual(['http://users.internal/?active=1', 'http://hooks.internal/notify']);
        } finally {
            globalThis.fetch = original;
        }
    });
});
