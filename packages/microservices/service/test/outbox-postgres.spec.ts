import expect = require('expect');
import { PostgresOutboxStore, PostgresSagaJournal, SqlQueryClient } from '../src/outbox-postgres';

const describePostgres = process.env.TSIO_TEST_POSTGRES === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

const CONNECTION = process.env.TSIO_TEST_POSTGRES_URL
    ?? 'postgres://postgres:postgres@127.0.0.1:5432/testdb';

describePostgres('PostgresOutboxStore (real Postgres)', () => {
    const suffix = `${process.pid}_${Date.now().toString(36)}`;
    const table = `tsdi_outbox_test_${suffix}`;
    const sagaTable = `tsdi_saga_test_${suffix}`;
    let pool: any;
    let store: PostgresOutboxStore;

    before(async () => {
        const { Pool } = require('pg');
        pool = new Pool({ connectionString: CONNECTION, max: 4 });
        await pool.query('SELECT 1');
        store = new PostgresOutboxStore(pool as SqlQueryClient, { table });
    });

    after(async () => {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
        await pool.query(`DROP TABLE IF EXISTS ${sagaTable}`);
        await pool.end();
    });

    it('adds, claims, fails, retries and acks records', async () => {
        const first = await store.add({
            id: 'pg-1',
            topic: 'orders',
            payload: { id: 1, nested: { ok: true } },
            headers: { trace: 'abc' }
        });
        await store.add({ id: 'pg-2', topic: 'orders', payload: { id: 2 }, nextAttemptAt: Date.now() + 60_000 });
        expect(first.id).toBe('pg-1');
        expect(first.payload).toEqual({ id: 1, nested: { ok: true } });
        expect(first.headers).toEqual({ trace: 'abc' });
        expect(await store.size()).toBe(2);

        const claimed = await store.claim(10);
        expect(claimed.map(record => record.id)).toEqual(['pg-1']);
        expect(await store.claim(10)).toEqual([]);

        await store.fail(claimed[0].id, Date.now() + 1000);
        expect(await store.claim(1)).toEqual([]);
        expect(await store.size()).toBe(2);

        const [retried] = await store.claim(1, Date.now() + 2000);
        expect(retried.id).toBe('pg-1');
        expect(retried.attempts).toBe(1);
        await store.ack(retried.id);
        await store.ack('pg-2');
        expect(await store.size()).toBe(0);
    });

    it('rolls back outbox rows written inside a rolled back transaction', async () => {
        await store.size();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const txStore = new PostgresOutboxStore(client as SqlQueryClient, { table });
            await txStore.add({ id: 'tx-rollback', topic: 'orders', payload: { id: 3 } });
            expect(await txStore.size()).toBe(1);
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
        expect(await store.size()).toBe(0);
    });

    it('commits outbox rows written inside a committed transaction', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const txStore = new PostgresOutboxStore(client as SqlQueryClient, { table });
            await txStore.add({ id: 'tx-commit', topic: 'orders', payload: { id: 4 } });
            await client.query('COMMIT');
        } finally {
            client.release();
        }
        expect(await store.size()).toBe(1);
        await store.ack('tx-commit');
        expect(await store.size()).toBe(0);
    });

    it('claims disjoint rows from two concurrent dispatchers', async () => {
        await store.add({ id: 'conc-1', topic: 'orders', payload: {} });
        await store.add({ id: 'conc-2', topic: 'orders', payload: {} });
        const first = new PostgresOutboxStore(pool as SqlQueryClient, { table });
        const second = new PostgresOutboxStore(pool as SqlQueryClient, { table });
        const [a, b] = await Promise.all([first.claim(1), second.claim(1)]);
        const ids = [...a, ...b].map(record => record.id).sort();
        expect(ids).toEqual(['conc-1', 'conc-2']);
        await first.ack('conc-1');
        await first.ack('conc-2');
        expect(await store.size()).toBe(0);
    });

    it('rejects unsafe table identifiers', () => {
        expect(() => new PostgresOutboxStore(pool as SqlQueryClient, { table: 'outbox; DROP TABLE x' }))
            .toThrow(/Invalid table name/);
        expect(() => new PostgresOutboxStore(pool as SqlQueryClient, { table: 'ok', schema: 'bad name' }))
            .toThrow(/Invalid schema name/);
    });
});

describePostgres('PostgresSagaJournal (real Postgres)', () => {
    const suffix = `${process.pid}_${Date.now().toString(36)}`;
    const table = `tsdi_saga_test_${suffix}`;
    let pool: any;
    let journal: PostgresSagaJournal;

    before(async () => {
        const { Pool } = require('pg');
        pool = new Pool({ connectionString: CONNECTION, max: 2 });
        await pool.query('SELECT 1');
        journal = new PostgresSagaJournal(pool as SqlQueryClient, { table });
    });

    after(async () => {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
        await pool.end();
    });

    it('saves, upserts, loads and clears an entry', async () => {
        expect(await journal.load('order-1')).toBeUndefined();

        await journal.save('order-1', { completed: ['reserve'], updatedAt: 1 });
        expect(await journal.load('order-1')).toEqual({ completed: ['reserve'], failedStep: undefined, updatedAt: 1 });

        await journal.save('order-1', { completed: ['reserve', 'charge'], failedStep: 'ship', updatedAt: 2 });
        expect(await journal.load('order-1')).toEqual({
            completed: ['reserve', 'charge'],
            failedStep: 'ship',
            updatedAt: 2
        });

        await journal.clear('order-1');
        expect(await journal.load('order-1')).toBeUndefined();
    });
});
