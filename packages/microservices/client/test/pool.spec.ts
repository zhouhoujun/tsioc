import expect = require('expect');
import { Connection } from '../src/pool';
import { ConnectionFactory, DefaultConnectionPool } from '../src/connection.pool';

class FakeConnection implements Connection {
    id: string;
    active = true;
    lastUsed: number;

    constructor(id?: string) {
        this.id = id || 'conn-' + Date.now();
        this.lastUsed = Date.now();
    }

    async close(): Promise<void> {
        this.active = false;
    }
}

class FakeConnectionFactory extends ConnectionFactory {
    createdCount = 0;

    async create(): Promise<Connection> {
        this.createdCount++;
        return new FakeConnection('fake-' + this.createdCount);
    }
}

describe('ConnectionPool', () => {
    it('creates new connections when pool is empty on acquire', async () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const conn = await pool.acquire();
        expect(conn).toBeDefined();
        expect(conn.active).toBe(true);
        expect(factory.createdCount).toBe(1);
        await pool.clear();
    });

    it('reuses available connections on acquire', async () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const conn1 = await pool.acquire();
        pool.release(conn1);
        const conn2 = await pool.acquire();
        expect(conn2.id).toBe(conn1.id);
        await pool.clear();
    });

    it('tracks stats correctly', async () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const conn = await pool.acquire();
        expect(pool.stats.total).toBe(1);
        expect(pool.stats.active).toBe(1);
        pool.release(conn);
        expect(pool.stats.active).toBe(0);
        await pool.clear();
    });

    it('destroy removes connection from pool', async () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const conn = await pool.acquire();
        await pool.destroy(conn);
        expect(conn.active).toBe(false);
        expect(pool.stats.destroyedCount).toBe(1);
        await pool.clear();
    });

    it('validate checks connection.active', () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const activeConn = new FakeConnection();
        expect(pool.validate(activeConn)).toBe(true);
        activeConn.active = false;
        expect(pool.validate(activeConn)).toBe(false);
        pool.clear();
    });

    it('release does nothing for unknown connection', () => {
        const factory = new FakeConnectionFactory();
        const pool = new DefaultConnectionPool(factory, { min: 0, max: 5 });
        const unknownConn = new FakeConnection();
        pool.release(unknownConn);
        pool.clear();
    });
});
