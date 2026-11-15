import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    InMemoryWorkflowVersionStore,
    SqliteWorkflowVersionStore,
    versionContentHash
} from '../server/WorkflowVersionStore';
import {
    isSqliteAvailable,
    SqliteWorkflowDefinitionStore
} from '../server/SqliteWorkflowDefinitionStore';
import { VisualWorkflowDefinition } from '../src/visual/types';

function definition(name: string, config: Record<string, any> = {}): VisualWorkflowDefinition {
    return {
        id: 'wf-1',
        name,
        nodes: [
            { id: 'start_1', name: 'Start', type: 'start', position: { x: 0, y: 0 }, config } as any,
            { id: 'end_1', name: 'End', type: 'end', position: { x: 200, y: 0 } } as any
        ],
        connections: [{
            id: 'c1',
            sourceNodeId: 'start_1',
            sourcePort: 'out',
            targetNodeId: 'end_1',
            targetPort: 'in'
        }]
    };
}

describe('Workflow version store', () => {
    it('records versions, reuses identical content and keeps a release pointer', async () => {
        const store = new InMemoryWorkflowVersionStore();
        const first = await store.append(definition('v1'));
        expect(first.version).toBe(1);
        expect(first.kind).toBe('save');

        // Identical content must not add a row.
        const again = await store.append(definition('v1'));
        expect(again.version).toBe(1);
        expect((await store.list('wf-1')).items.length).toBe(1);

        const second = await store.append(definition('v2'));
        expect(second.version).toBe(2);
        expect(second.contentHash).toBe(versionContentHash(definition('v2')));

        // Publishing promotes the snapshot instead of duplicating it.
        const published = await store.append(definition('v2'), { kind: 'publish', createdBy: 'tester' });
        expect(published.version).toBe(2);
        expect(published.kind).toBe('publish');
        const release = await store.publish('wf-1', published.version, 'tester');
        expect(release.version).toBe(2);
        expect((await store.list('wf-1')).release?.version).toBe(2);

        const listed = await store.list('wf-1');
        expect(listed.items.map(item => item.version)).toEqual([2, 1]);
        expect((await store.get('wf-1', 1))?.name).toBe('v1');
        expect(await store.get('wf-1', 99)).toBeUndefined();
    });

    it('bounds draft-save history but never prunes published versions', async () => {
        const store = new InMemoryWorkflowVersionStore();
        const published = await store.append(definition('published'), { kind: 'publish' });
        await store.publish('wf-1', published.version);
        for (let index = 0; index < 8; index++) {
            await store.append(definition(`draft-${index}`), { keepSaves: 3 });
        }
        const listed = await store.list('wf-1', 50);
        const saves = listed.items.filter(item => item.kind === 'save');
        expect(saves.length).toBe(3);
        expect(saves.map(item => item.name)).toEqual(['draft-7', 'draft-6', 'draft-5']);
        expect(listed.items.some(item => item.kind === 'publish')).toBe(true);
        expect(listed.release?.version).toBe(published.version);

        await store.removeWorkflow('wf-1');
        expect((await store.list('wf-1')).items.length).toBe(0);
        expect(await store.release('wf-1')).toBeUndefined();
    });

    it('refuses to publish a version that does not exist', async () => {
        const store = new InMemoryWorkflowVersionStore();
        let error: Error | undefined;
        try {
            await store.publish('wf-1', 3);
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Version not found');
    });

    (isSqliteAvailable() ? it : it.skip)('persists versions and releases beside the workflow database', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-workflow-versions-'));
        const file = path.join(dir, 'workflows.db');
        try {
            const definitions = new SqliteWorkflowDefinitionStore({ file });
            const store = new SqliteWorkflowVersionStore({ file, keepSaves: 2 });
            await definitions.save(definition('draft'));

            const first = await store.append(definition('draft'));
            expect(first.version).toBe(1);
            expect((await store.append(definition('draft'))).version).toBe(1);

            const published = await store.append(definition('release'), { kind: 'publish' });
            const release = await store.publish('wf-1', published.version, 'tester');
            expect(release.version).toBe(published.version);

            // Retention keeps the newest two draft saves and every published row.
            for (let index = 0; index < 5; index++) {
                await store.append(definition(`draft-${index}`));
            }
            const listed = await store.list('wf-1', 50);
            expect(listed.items.filter(item => item.kind === 'save').length).toBe(2);
            expect(listed.items.filter(item => item.kind === 'publish').length).toBe(1);
            expect(listed.release?.version).toBe(published.version);
            store.close();

            // A second connection sees the same history (survives restarts).
            const reopened = new SqliteWorkflowVersionStore({ file });
            const after = await reopened.list('wf-1', 50);
            expect(after.items.length).toBe(3);
            expect(after.release?.version).toBe(published.version);
            expect((await reopened.get('wf-1', published.version))?.name).toBe('release');
            // Version tables share the file but must never touch the draft row.
            expect((await definitions.get('wf-1'))?.name).toBe('draft');
            reopened.close();
            definitions.close();
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
