import { DataSource, QueryRunner } from 'typeorm';
import { AgentMessageEntity, AgentSessionEntity } from '../entities';

/** A versioned schema change. The baseline is handled separately. */
export interface AgentMigration {
    id: string;
    up(runner: QueryRunner): Promise<void>;
}

export const AGENT_BASELINE_MIGRATION_ID = '20261123_0001_baseline';
const JOURNAL_TABLE = 'agent_migration';

/**
 * Migrations after the baseline. Add new schema changes here with a
 * chronological id; never edit an id that has shipped.
 */
export const AGENT_MIGRATIONS: AgentMigration[] = [
    {
        id: '20261123_0002_session_inbox',
        async up(runner) {
            await runner.query(`CREATE TABLE IF NOT EXISTS agent_session_inbox (
                id varchar PRIMARY KEY NOT NULL,
                sessionId varchar NOT NULL,
                itemId varchar NOT NULL,
                kind varchar NOT NULL,
                payload text NOT NULL,
                state varchar NOT NULL DEFAULT 'queued',
                seq bigint NOT NULL,
                createdAt bigint NOT NULL,
                updatedAt bigint NOT NULL
            )`);
            await runner.query('CREATE UNIQUE INDEX IF NOT EXISTS IDX_agent_session_inbox_item ON agent_session_inbox (sessionId, itemId)');
            await runner.query('CREATE INDEX IF NOT EXISTS IDX_agent_session_inbox_seq ON agent_session_inbox (sessionId, seq)');
        }
    },
    {
        id: '20261123_0003_session_lease',
        async up(runner) {
            await runner.query(`CREATE TABLE IF NOT EXISTS agent_session_lease (
                sessionId varchar PRIMARY KEY NOT NULL,
                ownerId varchar NOT NULL,
                leaseUntil bigint NOT NULL,
                updatedAt bigint NOT NULL
            )`);
            await runner.query('CREATE INDEX IF NOT EXISTS IDX_agent_session_lease_until ON agent_session_lease (leaseUntil)');
        }
    },
];

/**
 * Versioned bootstrap for the agent database.
 *
 * - New database: create the current entity schema once and record the baseline.
 * - Legacy database created by `synchronize: true`: keep the existing schema and
 *   record the baseline (no destructive diff), then apply newer migrations.
 * - Reopened database: only apply migrations missing from the journal.
 *
 * This runs from TypeORM's `initDb` hook, so repositories always see the final
 * schema and the process never starts on a partially applied upgrade.
 */
export async function runAgentMigrations(dataSource: DataSource): Promise<{ applied: string[] }> {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    const applied: string[] = [];
    try {
        await runner.query(`CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (id varchar(191) PRIMARY KEY, appliedAt bigint NOT NULL)`);
        const rows: Array<{ id: string }> = await runner.query(`SELECT id FROM ${JOURNAL_TABLE}`);
        const done = new Set(rows.map(row => String(row.id)));
        if (!done.size) {
            const legacy = await runner.hasTable(tableName(dataSource, AgentSessionEntity));
            if (!legacy && await hasUnrelatedAgentTables(dataSource, runner)) {
                throw new Error('Agent database is not empty but has no agent_session table; refusing to bootstrap over it.');
            }
            await runner.startTransaction();
            try {
                if (!legacy) {
                    const schema = await dataSource.driver.createSchemaBuilder().log();
                    for (const change of schema.upQueries) {
                        await runner.query(change.query, change.parameters);
                    }
                }
                await record(runner, AGENT_BASELINE_MIGRATION_ID);
                await runner.commitTransaction();
            } catch (error) {
                await runner.rollbackTransaction();
                throw error;
            }
            done.add(AGENT_BASELINE_MIGRATION_ID);
            applied.push(AGENT_BASELINE_MIGRATION_ID);
        }
        for (const migration of AGENT_MIGRATIONS) {
            if (done.has(migration.id)) {
                continue;
            }
            await runner.startTransaction();
            try {
                await migration.up(runner);
                await record(runner, migration.id);
                await runner.commitTransaction();
            } catch (error) {
                await runner.rollbackTransaction();
                throw error;
            }
            applied.push(migration.id);
        }
        return { applied };
    } finally {
        await runner.release();
    }
}

async function record(runner: QueryRunner, id: string): Promise<void> {
    await runner.query(`INSERT INTO ${JOURNAL_TABLE} (id, appliedAt) VALUES (?, ?)`, [id, Date.now()]);
}

function tableName(dataSource: DataSource, entity: Function): string {
    return dataSource.getMetadata(entity as any).tableName;
}

/** A non-empty file that is not an agent database (e.g. a user's other SQLite DB). */
async function hasUnrelatedAgentTables(dataSource: DataSource, runner: QueryRunner): Promise<boolean> {
    for (const entity of [AgentMessageEntity, AgentSessionEntity]) {
        if (await runner.hasTable(tableName(dataSource, entity))) {
            return true;
        }
    }
    return false;
}
