import expect = require('expect');
import Redis from 'ioredis';
import { GatewayRuntime } from '../src/gateway.runtime';
import { RedisGatewayStateStore } from '../src/state.store';

const describeRedis = process.env.TSIO_TEST_REDIS === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as typeof describe;

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
