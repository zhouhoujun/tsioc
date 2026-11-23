import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Suite, Test } from '@tsdi/unit';
import { AgentMessageEntity, AgentSessionEntity } from '../src/memory/entities';
import { AGENT_BASELINE_MIGRATION_ID, runAgentMigrations } from '../src/memory/migrations/AgentMigrationRunner';

const ENTITIES = [AgentSessionEntity, AgentMessageEntity];

function dataSource(location: string | undefined, synchronize: boolean): DataSource {
    return new DataSource({
        type: 'sqljs' as any,
        ...(location ? { location, autoSave: true } : { autoSave: false }),
        synchronize,
        autoLoadEntities: false as any,
        entities: ENTITIES
    } as any);
}

@Suite('agent database migrations')
export class AgentMigrationsTest {
    @Test('a new database gets the baseline schema and journal')
    async createsBaseline() {
        const source = dataSource(undefined, false);
        await source.initialize();
        try {
            const result = await runAgentMigrations(source);
            expect(result.applied).toEqual([AGENT_BASELINE_MIGRATION_ID, '20261123_0002_session_inbox', '20261123_0003_session_lease']);
            const runner = source.createQueryRunner();
            expect(await runner.hasTable(source.getMetadata(AgentSessionEntity).tableName)).toEqual(true);
            expect(await runner.hasTable(source.getMetadata(AgentMessageEntity).tableName)).toEqual(true);
            expect(await runner.hasTable('agent_session_inbox')).toEqual(true);
            expect(await runner.hasTable('agent_session_lease')).toEqual(true);
            expect((await runner.query('SELECT id FROM agent_migration')).map((row: any) => row.id))
                .toEqual([AGENT_BASELINE_MIGRATION_ID, '20261123_0002_session_inbox', '20261123_0003_session_lease']);
            await runner.release();
            expect((await runAgentMigrations(source)).applied).toEqual([]);
        } finally {
            await source.destroy();
        }
    }

    @Test('an existing synchronize-created database keeps its rows')
    async preservesLegacyRows() {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-migration-'));
        const location = path.join(root, 'agent.db');
        const legacy = dataSource(location, true);
        await legacy.initialize();
        const sessionTable = legacy.getMetadata(AgentSessionEntity).tableName;
        await legacy.query(
            `INSERT INTO ${sessionTable} (id, sessionId, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
            ['id-1', 'chat-1', 1, 2]
        );
        await legacy.destroy();

        const reopened = dataSource(location, false);
        await reopened.initialize();
        try {
            const result = await runAgentMigrations(reopened);
            expect(result.applied).toEqual([AGENT_BASELINE_MIGRATION_ID, '20261123_0002_session_inbox', '20261123_0003_session_lease']);
            const reopenedTable = reopened.getMetadata(AgentSessionEntity).tableName;
            expect(await reopened.query(`SELECT sessionId FROM ${reopenedTable}`)).toEqual([{ sessionId: 'chat-1' }]);
        } finally {
            await reopened.destroy();
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }

    @Test('refuses to bootstrap over an unrelated non-empty database')
    async refusesForeignDatabase() {
        const source = dataSource(undefined, false);
        await source.initialize();
        try {
            const messageTable = source.getMetadata(AgentMessageEntity).tableName;
            await source.query(`CREATE TABLE ${messageTable} (id varchar(191) PRIMARY KEY)`);
            let thrown: any = null;
            try {
                await runAgentMigrations(source);
            } catch (error) {
                thrown = error;
            }
            expect(thrown).toBeTruthy();
            expect(String(thrown?.message || thrown)).toContain('refusing to bootstrap');
        } finally {
            await source.destroy();
        }
    }
}
