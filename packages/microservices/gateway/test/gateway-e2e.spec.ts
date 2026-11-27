import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, Handle, Payload, provideService, useRouter } from '@tsdi/service';
import { REQUEST, RestfulRequestAdapter, Transport } from '@tsdi/common';
import { Inject } from '@tsdi/ioc';
import { Readable } from 'node:stream';
import { useHttpTransport } from '../../http/src/server';
import { DefaultEndpointResolver, EndpointResolver, InMemoryServiceDiscovery, ServiceDiscovery } from '../../discovery/src';
import { GatewayConfigService, InMemoryGatewayStateStore, useGateway } from '../src';
import expect = require('expect');
import * as http from 'node:http';
import { withUdpTransport } from '../../udp/src/client';
import { useUdpTransport } from '../../udp/src/server';
import { provideClient, withTimeout } from '../../client/src';

const PORT_SEED = Number(process.env.TSIO_TEST_GATEWAY_PORT_SEED ?? (process.pid % 1000));
const UPSTREAM_PORT = 26000 + (PORT_SEED * 10);
const GATEWAY_PORT = UPSTREAM_PORT + 1;
const UDP_PORT = UPSTREAM_PORT + 2;
const SHARED_A_PORT = GATEWAY_PORT + 10;
const SHARED_B_PORT = GATEWAY_PORT + 11;

@Controller('/users')
class UpstreamController {
    private counter = 0;

    @Get('/profile')
    profile() {
        return { service: 'users', ok: true };
    }

    @Get('/headers')
    headers(@Inject(REQUEST) request: any) {
        const headers = request?.headers ?? {};
        return {
            test: headers['x-test'],
            proxyAuthorization: headers['proxy-authorization'],
            connection: headers.connection,
            proto: headers['x-forwarded-proto'],
            host: headers['x-forwarded-host']
        };
    }

    @Get('/counter')
    count() {
        return { count: ++this.counter };
    }

    @Get('/slow')
    slow() {
        return new Promise(resolve => setTimeout(() => resolve({ slow: true }), 200));
    }

    @Get('/large')
    large(@Inject(RestfulRequestAdapter) adapter: RestfulRequestAdapter) {
        adapter.setHeader('content-type', 'application/octet-stream');
        const chunk = Buffer.alloc(64 * 1024, 65);
        let sent = 0;
        let pending = false;
        return new Readable({
            read() {
                if (sent >= 16) {
                    this.push(null);
                    return;
                }
                if (pending) {
                    return;
                }
                pending = true;
                setTimeout(() => {
                    pending = false;
                    sent += 1;
                    this.push(chunk);
                }, 3);
            }
        });
    }

    @Get('/fail')
    fail() {
        throw new Error('upstream boom');
    }

    @Get('/events')
    events(@Inject(RestfulRequestAdapter) adapter: RestfulRequestAdapter) {
        adapter.setHeader('content-type', 'text/event-stream');
        adapter.setHeader('cache-control', 'no-cache');
        let index = 0;
        let pending = false;
        return new Readable({
            read() {
                if (index >= 2) {
                    this.push(null);
                    return;
                }
                if (pending) {
                    return;
                }
                pending = true;
                setTimeout(() => {
                    pending = false;
                    index += 1;
                    this.push(`data: ${index}\n\n`);
                }, 30);
            }
        });
    }
}

class UdpPatternService {
    @Handle({ cmd: 'echo' }, Transport.UDP)
    echo(@Payload() payload: { msg: string }) {
        return { protocol: 'udp', echoed: payload.msg };
    }
}

describe('Gateway E2E', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [UpstreamController],
        providers: [
            InMemoryServiceDiscovery,
            provideService(useRouter(),
                useHttpTransport({
                    listenOpts: { port: UPSTREAM_PORT, host: '127.0.0.1' },
                    serviceName: 'users-service',
                    asDefault: true
                }))
        ]
    })
    class UpstreamModule {}

    @Module({
        imports: [LoggerModule],
        declarations: [UdpPatternService],
        providers: [
            provideService(useRouter(),
                useUdpTransport({
                    listenOpts: { port: UDP_PORT, host: '127.0.0.1' },
                    serviceName: 'udp-service',
                    asDefault: true
                })),
            provideClient(
                withTimeout(),
                withUdpTransport({
                    host: '127.0.0.1',
                    port: UDP_PORT,
                    microservice: true,
                    asDefault: true
                }))
        ]
    })
    class UdpModule {}

    @Module({
        imports: [LoggerModule],
        providers: [
            InMemoryServiceDiscovery,
            { provide: ServiceDiscovery, useExisting: InMemoryServiceDiscovery },
            DefaultEndpointResolver,
            { provide: EndpointResolver, useExisting: DefaultEndpointResolver },
            provideClient(
                withTimeout(),
                withUdpTransport({
                    host: '127.0.0.1',
                    port: UDP_PORT,
                    microservice: true,
                    asDefault: true
                })),
            provideService(
                useRouter(),
                useGateway({
                    routes: [{
                        path: '/gateway/users',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        stripPrefix: true,
                        targetPath: '/users'
                    }, {
                        path: '/limited',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        stripPrefix: true,
                        targetPath: '/users/profile',
                        rateLimit: { limit: 1, windowMs: 10_000 }
                    }, {
                        path: '/gateway/stream-large',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/large' },
                        stream: true
                    }, {
                        path: '/gateway/discovered',
                        service: 'users-service',
                        stripPrefix: true,
                        targetPath: '/users'
                    }, {
                        path: '/gateway/sse',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/events' },
                        stream: true,
                        timeout: 5000
                    }, {
                        path: '/gateway/fail',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/fail' },
                        circuitBreaker: { failureThreshold: 1, resetTimeout: 60_000 }
                    }, {
                        path: '/gateway/cache',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/counter' },
                        cache: { enabled: true, ttl: 60_000 }
                    }, {
                        path: '/gateway/secure-cache',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/counter' },
                        cache: { enabled: true, ttl: 60_000, allowAuth: true }
                    }, {
                        path: '/gateway/slow',
                        service: 'users-service',
                        targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                        targetPath: '/users',
                        rewrite: { path: () => '/slow' },
                        timeout: 50
                    }, {
                        path: '/gateway/udp',
                        service: 'udp-service',
                        transport: Transport.UDP,
                        pattern: { cmd: 'echo' } as any,
                        rewrite: {
                            body: (request: any) => ({
                                msg: request.query?.msg ?? request.body?.msg ?? ''
                            })
                        }
                    }],
                    rateLimit: false,
                    httpPool: { connections: 4, keepAliveTimeout: 1000 }
                }),
                useHttpTransport({
                    listenOpts: { port: GATEWAY_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class GatewayModule {}

    let upstreamCtx: ApplicationContext;
    let udpCtx: ApplicationContext;
    let gatewayCtx: ApplicationContext;

    before(async () => {
        upstreamCtx = await Application.run(UpstreamModule);
        udpCtx = await Application.run(UdpModule);
        gatewayCtx = await Application.run(GatewayModule);
        const discovery = gatewayCtx.get(ServiceDiscovery);
        await discovery.register({
            name: 'users-service',
            address: `127.0.0.1:${UPSTREAM_PORT}`,
            protocol: 'http',
            port: UPSTREAM_PORT
        });
    });

    after(async () => {
        if (gatewayCtx) await gatewayCtx.close();
        if (udpCtx) await udpCtx.close();
        if (upstreamCtx) await upstreamCtx.close();
    });

    function requestOn(port: number, path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port,
                path,
                method: 'GET',
                headers: { accept: 'application/json', ...headers }
            }, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
            });
            req.on('error', reject);
            req.end();
        });
    }

    function request(path: string, headers: Record<string, string> = {}) {
        return requestOn(GATEWAY_PORT, path, headers);
    }

    function post(path: string, body: any): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify(body);
            const req = http.request({
                host: '127.0.0.1',
                port: GATEWAY_PORT,
                path,
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'content-length': Buffer.byteLength(payload)
                }
            }, res => {
                let responseBody = '';
                res.setEncoding('utf8');
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => resolve({ status: res.statusCode ?? 0, body: responseBody }));
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    it('forwards gateway requests to the upstream service', async () => {
        const response = await request('/gateway/users/profile');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ service: 'users', ok: true });
    });

    it('applies route-level rate limit', async () => {
        const first = await request('/limited');
        expect(first.status).toBe(200);

        const second = await request('/limited');
        expect(second.status).toBe(429);
    });

    it('strips hop-by-hop headers and forwards proxy headers to the upstream', async () => {
        const response = await request('/gateway/users/headers', {
            'x-test': '1',
            'proxy-authorization': 'secret'
        });
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.test).toBe('1');
        expect(body.proxyAuthorization).toBeUndefined();
        expect(body.proto).toBe('http');
        expect(String(body.host)).toContain('127.0.0.1');
    });

    it('resolves a route through discovery and EndpointResolver', async () => {
        const response = await request('/gateway/discovered/profile');
        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ service: 'users', ok: true });
    });

    it('returns 504 when the upstream exceeds the route timeout', async () => {
        const response = await request('/gateway/slow');
        expect(response.status).toBe(504);
    });

    it('soaks concurrent requests without failures or hangs', async () => {
        const responses = await Promise.all(
            Array.from({ length: 50 }, () => request('/gateway/users/profile'))
        );
        expect(responses.length).toBe(50);
        expect(responses.every(response => response.status === 200)).toBe(true);
        expect(responses.every(response => JSON.parse(response.body).ok === true)).toBe(true);
    });

    it('streams SSE events through the gateway before the upstream finishes', async () => {
        const startedAt = Date.now();
        const result = await new Promise<{ status: number; body: string; firstChunkAt: number; endAt: number }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: GATEWAY_PORT,
                path: '/gateway/sse',
                method: 'GET',
                headers: { accept: 'text/event-stream' }
            }, res => {
                let body = '';
                let firstChunkAt = 0;
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    if (!firstChunkAt) {
                        firstChunkAt = Date.now();
                    }
                    body += chunk;
                });
                res.on('end', () => resolve({
                    status: res.statusCode ?? 0,
                    body,
                    firstChunkAt,
                    endAt: Date.now()
                }));
            });
            req.on('error', reject);
            req.end();
            setTimeout(() => {
                if (Date.now() - startedAt > 5000) {
                    req.destroy(new Error('SSE timeout'));
                }
            }, 5000);
        });

        expect(result.status).toBe(200);
        expect(result.body).toContain('data: 1');
        expect(result.body).toContain('data: 2');
        expect(result.firstChunkAt - startedAt).toBeLessThan(result.endAt - startedAt);
    });

    it('streams a 1MB response in chunks before the upstream finishes', async () => {
        const startedAt = Date.now();
        const result = await new Promise<{ status: number; bytes: number; chunks: number; firstChunkAt: number; endAt: number }>((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: GATEWAY_PORT,
                path: '/gateway/stream-large',
                method: 'GET'
            }, res => {
                let bytes = 0;
                let chunks = 0;
                let firstChunkAt = 0;
                res.on('data', chunk => {
                    if (!firstChunkAt) {
                        firstChunkAt = Date.now();
                    }
                    chunks += 1;
                    bytes += chunk.length;
                });
                res.on('end', () => resolve({
                    status: res.statusCode ?? 0,
                    bytes,
                    chunks,
                    firstChunkAt,
                    endAt: Date.now()
                }));
            });
            req.on('error', reject);
            req.end();
            setTimeout(() => req.destroy(new Error('stream timeout')), 5000);
        });

        expect(result.status).toBe(200);
        expect(result.bytes).toBe(1024 * 1024);
        expect(result.chunks).toBeGreaterThan(4);
        expect(result.firstChunkAt - startedAt).toBeLessThan(result.endAt - startedAt);
    });

    it('opens the circuit after an upstream 500', async () => {
        const first = await request('/gateway/fail');
        expect(first.status).toBe(500);

        const second = await request('/gateway/fail');
        expect(second.status).toBe(503);
    });

    it('does not cache authenticated responses unless allowAuth is set', async () => {
        const first = await request('/gateway/cache', { authorization: 'Bearer a' });
        const second = await request('/gateway/cache', { authorization: 'Bearer a' });
        expect(JSON.parse(second.body).count).toBeGreaterThan(JSON.parse(first.body).count);

        const secureFirst = await request('/gateway/secure-cache', { authorization: 'Bearer a' });
        const secureSecond = await request('/gateway/secure-cache', { authorization: 'Bearer b' });
        const secureThird = await request('/gateway/secure-cache', { authorization: 'Bearer a' });
        expect(JSON.parse(secureSecond.body).count).toBeGreaterThan(JSON.parse(secureFirst.body).count);
        expect(JSON.parse(secureThird.body).count).toBe(JSON.parse(secureFirst.body).count);
        expect(secureThird.headers['x-gateway-cache']).toBe('HIT');
        expect(secureThird.headers.age).toBeDefined();
    });

    it('forwards gateway requests to udp downstream services', async () => {
        const queryResponse = await request('/gateway/udp?msg=hello');
        expect(queryResponse.status).toBe(200);
        expect(JSON.parse(queryResponse.body)).toMatchObject({ protocol: 'udp', echoed: 'hello' });

        const bodyResponse = await post('/gateway/udp', { msg: 'world' });
        expect(bodyResponse.status).toBe(200);
        expect(JSON.parse(bodyResponse.body)).toMatchObject({ protocol: 'udp', echoed: 'world' });
    });
    it('shares rate limits and cache across gateway instances', async () => {
        const store = new InMemoryGatewayStateStore();
        const createApp = (port: number) => {
            @Module({
                imports: [LoggerModule],
                providers: [
                    provideService(
                        useRouter(),
                        useGateway({
                            routes: [{
                                path: '/shared',
                                service: 'users-service',
                                targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                                targetPath: '/users',
                                rewrite: { path: () => '/profile' },
                                rateLimit: { limit: 2, windowMs: 60_000 }
                            }, {
                                path: '/shared-cache',
                                service: 'users-service',
                                targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
                                targetPath: '/users',
                                rewrite: { path: () => '/counter' },
                                cache: { enabled: true, ttl: 60_000 }
                            }],
                            rateLimit: false,
                            stateStore: store
                        }),
                        useHttpTransport({ listenOpts: { port, host: '127.0.0.1' }, asDefault: true })
                    )
                ]
            })
            class SharedGatewayModule { }
            return SharedGatewayModule;
        };

        const first = await Application.run(createApp(SHARED_A_PORT));
        const second = await Application.run(createApp(SHARED_B_PORT));
        try {
            expect((await requestOn(SHARED_A_PORT, '/shared')).status).toBe(200);
            expect((await requestOn(SHARED_B_PORT, '/shared')).status).toBe(200);
            expect((await requestOn(SHARED_A_PORT, '/shared')).status).toBe(429);

            const cachedOnA = await requestOn(SHARED_A_PORT, '/shared-cache');
            const cachedOnB = await requestOn(SHARED_B_PORT, '/shared-cache');
            expect(cachedOnA.status).toBe(200);
            expect(cachedOnB.headers['x-gateway-cache']).toBe('HIT');
            expect(JSON.parse(cachedOnB.body).count).toBe(JSON.parse(cachedOnA.body).count);
        } finally {
            await first.close();
            await second.close();
        }
    });

    it('applies a hot config update and rolls it back', async () => {
        const config = gatewayCtx.get(GatewayConfigService);
        const route = {
            path: '/gateway/hot',
            service: 'users-service',
            targetUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
            targetPath: '/users',
            rewrite: { path: () => '/profile' }
        };
        const applied = config.apply({ routes: [route] }, { source: 'e2e' });
        expect(applied.version).toBe(1);

        const hot = await request('/gateway/hot');
        expect(hot.status).toBe(200);
        expect(JSON.parse(hot.body)).toEqual({ service: 'users', ok: true });

        const second = config.apply({
            routes: [route, { ...route, path: '/gateway/hot-2' }]
        });
        expect(second.version).toBe(2);
        expect((await request('/gateway/hot-2')).status).toBe(200);

        const rolledBack = config.rollback(1);
        expect(rolledBack.version).toBe(3);
        expect((await request('/gateway/hot')).status).toBe(200);
        expect((await request('/gateway/hot-2')).status).toBe(404);
    });

});
