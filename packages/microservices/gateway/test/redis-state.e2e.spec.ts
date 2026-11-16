import expect = require('expect');
import * as http from 'node:http';
import * as net from 'node:net';
import Redis from 'ioredis';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useHttpTransport } from '../../http/src/server';
import { GatewayRuntime } from '../src/gateway.runtime';
import { RedisGatewayStateStore } from '../src/state.store';
import { useGateway } from '../src/provider';

const describeRedis = process.env.TSIO_TEST_REDIS === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeRedis('RedisGatewayStateStore (real Redis)', () => {
    const prefix = `tsdi:test:${process.pid}:${Date.now().toString(36)}:`;
    let client: Redis;
    let store: RedisGatewayStateStore;
    let other: RedisGatewayStateStore;

    before(async () => {
        client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
            lazyConnect: true,
            maxRetriesPerRequest: 1
        });
        await client.connect();
        store = new RedisGatewayStateStore({ client, prefix });
        other = new RedisGatewayStateStore({ client, prefix });
    });

    after(async () => {
        const keys = await client.keys(`${prefix}*`);
        if (keys.length) {
            await client.del(...keys);
        }
        await client.quit();
    });

    it('shares cache and circuit state between store instances', async () => {
        await store.setCache('cache', { value: { ok: true }, storedAt: Date.now(), size: 2 }, 5_000);
        const cached = await other.getCache('cache');
        expect(cached?.value).toEqual({ ok: true });

        await store.setCircuit('route', { failures: 2, openedAt: Date.now() }, 5_000);
        expect((await other.getCircuit('route'))?.failures).toBe(2);

        const stats = await other.stats();
        expect(stats.cacheEntries).toBe(1);
        expect(stats.circuits.some(circuit => circuit.key === 'route' && circuit.open)).toBe(true);
    });

    it('uses atomic SET NX PX for replay protection', async () => {
        expect(await store.useNonce('nonce', 5_000)).toBe(true);
        expect(await other.useNonce('nonce', 5_000)).toBe(false);

        expect(await store.useNonce('expire', 10)).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 25));
        expect(await other.useNonce('expire', 10)).toBe(true);
    });

    it('increments fixed windows atomically across instances', async () => {
        expect((await store.increment('rate', 5_000)).count).toBe(1);
        expect((await other.increment('rate', 5_000)).count).toBe(2);
        expect((await store.increment('rate', 5_000)).count).toBe(3);
    });

    it('shares rate limits and cache between two real gateway processes', async () => {
        const upstreamPort = await freePort();
        const firstPort = await freePort();
        const secondPort = await freePort();
        const upstreamCtx = await Application.run(createUpstreamModule(upstreamPort));
        const storeA = new RedisGatewayStateStore({ client, prefix: `${prefix}gw:` });
        const storeB = new RedisGatewayStateStore({ client, prefix: `${prefix}gw:` });
        const first = await Application.run(createGatewayModule(firstPort, upstreamPort, storeA));
        const second = await Application.run(createGatewayModule(secondPort, upstreamPort, storeB));
        const request = (port: number, path: string) => get(port, path);
        try {
            expect((await request(firstPort, '/redis-shared')).status).toBe(200);
            expect((await request(secondPort, '/redis-shared')).status).toBe(200);
            expect((await request(firstPort, '/redis-shared')).status).toBe(429);

            const cachedA = await request(firstPort, '/redis-cache');
            const cachedB = await request(secondPort, '/redis-cache');
            expect(cachedA.status).toBe(200);
            expect(cachedB.headers['x-gateway-cache']).toBe('HIT');
            expect(JSON.parse(cachedB.body).count).toBe(JSON.parse(cachedA.body).count);
        } finally {
            await first.close();
            await second.close();
            await upstreamCtx.close();
        }
    });

    it('drives GatewayRuntime cache/circuit/nonce through Redis', async () => {
        const first = new GatewayRuntime(store);
        const second = new GatewayRuntime(other);

        await first.setCached('runtime-cache', { ok: true }, 5_000);
        expect((await second.getCachedEntry('runtime-cache'))?.value).toEqual({ ok: true });

        await first.recordFailure('runtime-route', { failureThreshold: 1, resetTimeout: 60_000 });
        expect(await second.canPassCircuit('runtime-route', { failureThreshold: 1, resetTimeout: 60_000 })).toBe(false);

        expect(await first.rememberNonce('runtime-nonce', 5_000)).toBe(true);
        expect(await second.rememberNonce('runtime-nonce', 5_000)).toBe(false);
    });
});

let counter = 0;

@Controller('/upstream')
class UpstreamController {
    @Get('/counter')
    count() {
        return { count: ++counter };
    }
}

function createUpstreamModule(port: number) {
    @Module({
        imports: [LoggerModule],
        declarations: [UpstreamController],
        providers: [provideService(useRouter(), useHttpTransport({ listenOpts: { port, host: '127.0.0.1' }, asDefault: true }))]
    })
    class UpstreamModule { }
    return UpstreamModule;
}

function createGatewayModule(port: number, upstreamPort: number, stateStore: RedisGatewayStateStore) {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(
                useRouter(),
                useGateway({
                    routes: [{
                        path: '/redis-shared',
                        service: 'upstream',
                        targetUrl: `http://127.0.0.1:${upstreamPort}`,
                        targetPath: '/upstream',
                        rewrite: { path: () => '/counter' },
                        rateLimit: { limit: 2, windowMs: 60_000 }
                    }, {
                        path: '/redis-cache',
                        service: 'upstream',
                        targetUrl: `http://127.0.0.1:${upstreamPort}`,
                        targetPath: '/upstream',
                        rewrite: { path: () => '/counter' },
                        cache: { enabled: true, ttl: 60_000 }
                    }],
                    rateLimit: false,
                    stateStore
                }),
                useHttpTransport({ listenOpts: { port, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class RedisGatewayModule { }
    return RedisGatewayModule;
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

function get(port: number, path: string): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
        const request = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers: { accept: 'application/json' } }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => body += chunk);
            response.on('end', () => resolve({ status: response.statusCode ?? 0, body, headers: response.headers }));
        });
        request.on('error', reject);
        request.end();
    });
}
