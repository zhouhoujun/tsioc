import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    InMemoryWorkflowAuditStore,
    SqliteWorkflowAuditStore
} from '../server/WorkflowAuditStore';
import { isSqliteAvailable } from '../server/SqliteWorkflowDefinitionStore';

describe('Workflow audit store', () => {
    it('lists newest first, filters and prunes audit entries', async () => {
        const store = new InMemoryWorkflowAuditStore();
        await store.append({ action: 'save', workflowId: 'a' });
        await new Promise(resolve => setTimeout(resolve, 2));
        await store.append({ action: 'publish', workflowId: 'a' });
        await new Promise(resolve => setTimeout(resolve, 2));
        await store.append({ action: 'delete', workflowId: 'b' });

        const all = await store.list();
        expect(all.map(entry => entry.action)).toEqual(['delete', 'publish', 'save']);
        expect((await store.list({ workflowId: 'a' })).map(entry => entry.action))
            .toEqual(['publish', 'save']);
        expect((await store.list({ action: 'publish' })).length).toBe(1);

        await store.prune(2);
        expect((await store.list()).length).toBe(2);
        await store.clear();
        expect(await store.list()).toEqual([]);
    });

    (isSqliteAvailable() ? it : it.skip)('persists audit entries in SQLite', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-audit-store-'));
        const file = path.join(dir, 'workflows.db');
        const store = new SqliteWorkflowAuditStore({ file });
        await store.append({ action: 'save', workflowId: 'a', actor: 'tester', detail: { version: 1 } });
        await store.append({ action: 'publish', workflowId: 'a' });
        await store.append({ action: 'delete', workflowId: 'b' });
        store.close();

        const reopened = new SqliteWorkflowAuditStore({ file });
        const entries = await reopened.list({ workflowId: 'a' });
        expect(entries.length).toBe(2);
        expect(entries[0].action).toBe('publish');
        expect(entries[1].actor).toBe('tester');
        expect(entries[1].detail).toEqual({ version: 1 });

        await reopened.prune(1);
        expect((await reopened.list()).length).toBe(1);
        await reopened.clear();
        expect(await reopened.list()).toEqual([]);
        reopened.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
