import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SqliteWorkflowDefinitionStore } from '../server/SqliteWorkflowDefinitionStore';
import { VisualWorkflowDefinition } from '../src/visual/types';

function definition(id: string, name: string): VisualWorkflowDefinition {
    return {
        id,
        name,
        nodes: [
            { id: 'start', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
            { id: 'end', name: 'End', type: 'end', position: { x: 240, y: 0 } }
        ],
        connections: [{
            id: 'c1',
            sourceNodeId: 'start',
            sourcePort: 'out',
            targetNodeId: 'end',
            targetPort: 'in'
        }]
    };
}

describe('SQLite workflow definition store', () => {
    let dir: string;
    let file: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-workflow-sqlite-'));
        file = path.join(dir, 'workflows.db');
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('persists, lists and removes multiple workflows', async () => {
        const store = new SqliteWorkflowDefinitionStore({ file });
        await store.save(definition('a', 'Workflow A'));
        await store.save(definition('b', 'Workflow B'));

        const list = await store.list();
        expect(list.length).toBe(2);
        expect(list.map(item => item.id).sort()).toEqual(['a', 'b']);
        expect(list.find(item => item.id === 'a')?.nodeCount).toBe(2);

        const loaded = await store.get('a');
        expect(loaded?.name).toBe('Workflow A');
        expect(loaded?.connections?.length).toBe(1);

        expect(await store.remove('a')).toBe(true);
        expect(await store.remove('a')).toBe(false);
        expect(await store.get('a')).toBeUndefined();
        expect((await store.list()).length).toBe(1);
        store.close();
    });

    it('keeps data after reopening the database file', async () => {
        const first = new SqliteWorkflowDefinitionStore({ file });
        await first.save(definition('persisted', 'Persisted workflow'));
        first.close();

        const second = new SqliteWorkflowDefinitionStore({ file });
        const loaded = await second.get('persisted');
        expect(loaded?.name).toBe('Persisted workflow');
        await second.clear();
        expect((await second.list()).length).toBe(0);
        second.close();
    });
});
