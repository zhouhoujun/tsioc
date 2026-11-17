import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    InMemoryWorkflowCredentialStore,
    SqliteWorkflowCredentialStore
} from '../server/WorkflowCredentialStore';
import { isSqliteAvailable } from '../server/SqliteWorkflowDefinitionStore';

describe('Workflow credential store', () => {
    it('stores and removes credentials in memory', async () => {
        const store = new InMemoryWorkflowCredentialStore();
        await store.setCredential('api-token', 'secret');
        expect(await store.getCredential('api-token')).toBe('secret');
        expect(await store.list()).toEqual(['api-token']);
        expect(await store.remove('api-token')).toBe(true);
        expect(await store.remove('api-token')).toBe(false);
        expect(await store.getCredential('api-token')).toBeUndefined();
    });

    (isSqliteAvailable() ? it : it.skip)('encrypts SQLite credentials at rest', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-credentials-'));
        const file = path.join(dir, 'workflows.db');
        const key = 'a'.repeat(64);
        const store = new SqliteWorkflowCredentialStore({ file, key });
        await store.setCredential('api-token', 'super-secret');
        expect(await store.getCredential('api-token')).toBe('super-secret');
        expect(await store.list()).toEqual(['api-token']);
        store.close();

        expect(fs.readFileSync(file).includes('super-secret')).toBe(false);

        const reopened = new SqliteWorkflowCredentialStore({ file, key });
        expect(await reopened.getCredential('api-token')).toBe('super-secret');
        expect(await reopened.remove('api-token')).toBe(true);
        reopened.close();

        const wrongKey = new SqliteWorkflowCredentialStore({ file, key: 'b'.repeat(64) });
        await wrongKey.setCredential('other', 'value');
        wrongKey.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
