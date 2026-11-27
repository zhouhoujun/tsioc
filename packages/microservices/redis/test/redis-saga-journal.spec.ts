import expect = require('expect');
import Redis from 'ioredis';
import { RedisSagaJournal } from '../src/saga-journal';

describe('RedisSagaJournal', () => {
    const client = new Redis('redis://127.0.0.1:6379');
    const journal = new RedisSagaJournal(client, { prefix: `tsdi:test:saga:${Date.now()}:` });

    after(async () => {
        await client.quit();
    });

    it('saves, loads and clears entries', async () => {
        expect(await journal.load('order-1')).toBeUndefined();
        await journal.save('order-1', {
            completed: ['reserve', 'charge'],
            updatedAt: Date.now()
        });
        expect(await journal.load('order-1')).toMatchObject({
            completed: ['reserve', 'charge']
        });
        await journal.clear('order-1');
        expect(await journal.load('order-1')).toBeUndefined();
    });

    it('ignores malformed values and supports TTL', async () => {
        const key = `tsdi:test:saga:${Date.now()}:bad`;
        await client.set(key, 'not-json');
        const bad = new RedisSagaJournal(client, { prefix: key.slice(0, -4) });
        expect(await bad.load('bad')).toBeUndefined();

        const ttlJournal = new RedisSagaJournal(client, { prefix: `tsdi:test:saga:${Date.now()}:ttl:`, ttlMs: 30 });
        await ttlJournal.save('x', { completed: ['a'], updatedAt: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(await ttlJournal.load('x')).toBeUndefined();
    });
});
