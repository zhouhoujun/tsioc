import expect = require('expect');
import { GatewayRuntime } from '../src/gateway.runtime';
import { InMemoryGatewayStateStore, RedisGatewayStateStore, RedisLike } from '../src/state.store';

class FakeRedis implements RedisLike {
    private readonly data = new Map<string, { value: string; expireAt: number }>();
    private readonly counters = new Map<string, { count: number; resetAt: number }>();

    async get(key: string): Promise<string | null> {
        const entry = this.data.get(key);
        if (!entry) return null;
        if (entry.expireAt <= Date.now()) {
            this.data.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ...args: any[]): Promise<any> {
        let expireAt = Number.MAX_SAFE_INTEGER;
        let nx = false;
        for (let i = 0; i < args.length; i++) {
            const arg = String(args[i]).toUpperCase();
            if (arg === 'PX') {
                expireAt = Date.now() + Number(args[++i]);
            } else if (arg === 'NX') {
                nx = true;
            }
        }
        if (nx && await this.get(key) != null) {
            return null;
        }
        this.data.set(key, { value, expireAt });
        return 'OK';
    }

    async del(...keys: string[]): Promise<number> {
        let removed = 0;
        for (const key of keys) {
            if (this.data.delete(key)) removed++;
        }
        return removed;
    }

    async eval(_script: string, _numberOfKeys: number, ...args: any[]): Promise<any> {
        const key = String(args[0]);
        const windowMs = Number(args[1]);
        const now = Date.now();
        let entry = this.counters.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
        }
        entry.count += 1;
        this.counters.set(key, entry);
        return [entry.count, entry.resetAt - now];
    }

    async scan(_cursor: string, ...args: any[]): Promise<[string, string[]]> {
        const pattern = String(args[1] ?? '*').replace(/\*$/, '');
        return ['0', Array.from(this.data.keys()).filter(key => key.startsWith(pattern))];
    }
}

describe('GatewayStateStore', () => {
    it('shares cache, circuit and nonce state across runtime instances', async () => {
        const store = new InMemoryGatewayStateStore();
        const first = new GatewayRuntime(store);
        const second = new GatewayRuntime(store);

        await first.setCached('cache-key', { ok: true }, 5_000);
        const cached = await second.getCachedEntry('cache-key');
        expect(cached?.value).toEqual({ ok: true });

        await first.recordFailure('route', { failureThreshold: 1, resetTimeout: 60_000 });
        expect(await second.canPassCircuit('route', { failureThreshold: 1, resetTimeout: 60_000 })).toBe(false);

        expect(await first.rememberNonce('nonce', 5_000)).toBe(true);
        expect(await second.rememberNonce('nonce', 5_000)).toBe(false);

        expect((await first.incrementRateLimit('rate', 5_000))?.count).toBe(1);
        expect((await second.incrementRateLimit('rate', 5_000))?.count).toBe(2);

        const stats = await second.snapshot();
        expect(stats.cacheEntries).toBe(1);
        expect(stats.circuits.some(circuit => circuit.key === 'route' && circuit.open)).toBe(true);
    });

    it('expires in-memory cache and circuit state', async () => {
        const store = new InMemoryGatewayStateStore();
        await store.setCache('key', { value: { ok: true }, storedAt: Date.now(), size: 2 }, 5);
        await store.setCircuit('route', { failures: 1, openedAt: Date.now() }, 5);
        await new Promise(resolve => setTimeout(resolve, 15));
        expect(await store.getCache('key')).toBeUndefined();
        expect(await store.getCircuit('route')).toBeUndefined();
    });

    it('stores and clears state through a Redis-like client', async () => {
        const store = new RedisGatewayStateStore({ client: new FakeRedis(), prefix: 'test:' });

        await store.setCache('cache', { value: { ok: true }, storedAt: Date.now(), size: 2 }, 5_000);
        expect((await store.getCache('cache'))?.value).toEqual({ ok: true });

        await store.setCircuit('route', { failures: 2 }, 5_000);
        expect((await store.getCircuit('route'))?.failures).toBe(2);

        expect(await store.useNonce('nonce', 5_000)).toBe(true);
        expect(await store.useNonce('nonce', 5_000)).toBe(false);

        expect((await store.increment('rate', 5_000)).count).toBe(1);
        expect((await store.increment('rate', 5_000)).count).toBe(2);

        const stats = await store.stats();
        expect(stats.cacheEntries).toBe(1);
        expect(stats.circuits.some(circuit => circuit.key === 'route')).toBe(true);

        await store.clearCache();
        expect(await store.getCache('cache')).toBeUndefined();
    });
});
