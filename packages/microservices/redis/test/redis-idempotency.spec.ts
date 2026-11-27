import expect = require('expect');
import Redis from 'ioredis';
import { RedisIdempotencyStore } from '../src/idempotency.store';

describe('RedisIdempotencyStore', () => {
    const client = new Redis('redis://127.0.0.1:6379');
    const store = new RedisIdempotencyStore(client, { prefix: `tsdi:test:idem:${Date.now()}:` });

    after(async () => {
        await client.quit();
    });

    it('reserves once, releases, and expires reservations', async () => {
        expect(await store.reserve('key-1', 50)).toBe(true);
        expect(await store.reserve('key-1', 50)).toBe(false);

        await store.release('key-1');
        expect(await store.reserve('key-1', 50)).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 70));
        expect(await store.reserve('key-1', 50)).toBe(true);
    });

    it('isolates keys by prefix', async () => {
        const other = new RedisIdempotencyStore(client, { prefix: `tsdi:test:idem:${Date.now()}:other:` });
        expect(await store.reserve('shared', 1000)).toBe(true);
        expect(await other.reserve('shared', 1000)).toBe(true);
    });
});
