import type { OutboxAddOptions, OutboxMessage, OutboxStore } from './outbox';
import type { SagaJournal, SagaJournalEntry } from './saga';

/**
 * Minimal SQL client surface (satisfied by `pg.Pool`, `pg.PoolClient`,
 * mysql2/promise, etc.). No database driver is imported by this module, so
 * applications choose their driver and transaction boundary.
 */
export interface SqlQueryClient {
    query(text: string, values?: any[]): Promise<{ rows: any[] }>;
}

export interface PostgresStoreOptions {
    /** table name. Default `tsdi_outbox` / `tsdi_saga_journal`. */
    table?: string;
    /** optional schema prefix (validated identifier). */
    schema?: string;
}

function qualifiedTable(schema: string | undefined, table: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name '${table}'`);
    }
    if (schema != null && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
        throw new Error(`Invalid schema name '${schema}'`);
    }
    return schema ? `${schema}.${table}` : table;
}

function parseJson(value: any, fallback: any): any {
    if (value == null) {
        return fallback;
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }
    return value;
}

/**
 * Postgres outbox store.
 *
 * Pass a `PoolClient` that is already inside a transaction when the business
 * write and the outbox insert must commit atomically. `claim()` uses
 * `FOR UPDATE SKIP LOCKED`, so multiple dispatchers can share the table.
 */
export class PostgresOutboxStore implements OutboxStore {
    private readonly table: string;
    private initialized?: Promise<void>;

    constructor(
        private readonly client: SqlQueryClient,
        options: PostgresStoreOptions = {}
    ) {
        this.table = qualifiedTable(options.schema, options.table ?? 'tsdi_outbox');
    }

    async add<T = any>(message: OutboxAddOptions<T>): Promise<OutboxMessage<T>> {
        await this.ensureSchema();
        const id = message.id ?? `outbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const now = Date.now();
        const result = await this.client.query(
            `INSERT INTO ${this.table} (id, topic, payload, headers, created_at, attempts, next_attempt_at, claimed)
             VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, 0, $6, false)
             RETURNING *`,
            [
                id,
                message.topic,
                JSON.stringify(message.payload ?? null),
                message.headers ? JSON.stringify(message.headers) : null,
                now,
                message.nextAttemptAt ?? 0
            ]
        );
        return this.mapRecord(result.rows[0]);
    }

    async claim(limit: number, now = Date.now()): Promise<OutboxMessage[]> {
        await this.ensureSchema();
        const result = await this.client.query(
            `WITH due AS (
                SELECT id FROM ${this.table}
                WHERE claimed = false AND next_attempt_at <= $1
                ORDER BY next_attempt_at, created_at
                LIMIT $2
                FOR UPDATE SKIP LOCKED
             )
             UPDATE ${this.table} SET claimed = true
             WHERE id IN (SELECT id FROM due)
             RETURNING *`,
            [now, Math.max(0, limit)]
        );
        return result.rows.map(row => this.mapRecord(row));
    }

    async ack(id: string): Promise<void> {
        await this.client.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    }

    async fail(id: string, nextAttemptAt: number): Promise<void> {
        await this.client.query(
            `UPDATE ${this.table}
             SET claimed = false, attempts = attempts + 1, next_attempt_at = $2
             WHERE id = $1`,
            [id, nextAttemptAt]
        );
    }

    async size(): Promise<number> {
        await this.ensureSchema();
        const result = await this.client.query(`SELECT COUNT(*)::int AS count FROM ${this.table}`);
        return Number(result.rows[0]?.count ?? 0);
    }

    private mapRecord(row: any): OutboxMessage {
        return {
            id: String(row.id),
            topic: String(row.topic),
            payload: parseJson(row.payload, null),
            headers: parseJson(row.headers, undefined),
            createdAt: Number(row.created_at),
            attempts: Number(row.attempts ?? 0),
            nextAttemptAt: Number(row.next_attempt_at ?? 0)
        };
    }

    private ensureSchema(): Promise<void> {
        if (!this.initialized) {
            this.initialized = this.client.query(
                `CREATE TABLE IF NOT EXISTS ${this.table} (
                    id text PRIMARY KEY,
                    topic text NOT NULL,
                    payload jsonb,
                    headers jsonb,
                    created_at bigint NOT NULL,
                    attempts integer NOT NULL DEFAULT 0,
                    next_attempt_at bigint NOT NULL DEFAULT 0,
                    claimed boolean NOT NULL DEFAULT false
                )`
            ).then(() => undefined);
        }
        return this.initialized;
    }
}

/** Postgres-backed saga journal (same transaction/client rules as the outbox). */
export class PostgresSagaJournal implements SagaJournal {
    private readonly table: string;
    private initialized?: Promise<void>;

    constructor(
        private readonly client: SqlQueryClient,
        options: PostgresStoreOptions = {}
    ) {
        this.table = qualifiedTable(options.schema, options.table ?? 'tsdi_saga_journal');
    }

    async load(id: string): Promise<SagaJournalEntry | undefined> {
        await this.ensureSchema();
        const result = await this.client.query(
            `SELECT completed, failed_step, updated_at FROM ${this.table} WHERE id = $1`,
            [id]
        );
        const row = result.rows[0];
        if (!row) {
            return undefined;
        }
        const completed = parseJson(row.completed, []);
        return {
            completed: Array.isArray(completed) ? completed.map(String) : [],
            failedStep: row.failed_step ?? undefined,
            updatedAt: Number(row.updated_at ?? 0)
        };
    }

    async save(id: string, entry: SagaJournalEntry): Promise<void> {
        await this.ensureSchema();
        await this.client.query(
            `INSERT INTO ${this.table} (id, completed, failed_step, updated_at)
             VALUES ($1, $2::jsonb, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
                completed = EXCLUDED.completed,
                failed_step = EXCLUDED.failed_step,
                updated_at = EXCLUDED.updated_at`,
            [id, JSON.stringify(entry.completed ?? []), entry.failedStep ?? null, entry.updatedAt ?? Date.now()]
        );
    }

    async clear(id: string): Promise<void> {
        await this.client.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    }

    private ensureSchema(): Promise<void> {
        if (!this.initialized) {
            this.initialized = this.client.query(
                `CREATE TABLE IF NOT EXISTS ${this.table} (
                    id text PRIMARY KEY,
                    completed jsonb NOT NULL DEFAULT '[]'::jsonb,
                    failed_step text,
                    updated_at bigint NOT NULL
                )`
            ).then(() => undefined);
        }
        return this.initialized;
    }
}
