import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    InMemoryWorkflowExecutionStore,
    SqliteWorkflowExecutionStore
} from '../server/WorkflowExecutionStore';
import {
    isSqliteAvailable,
    SqliteWorkflowDefinitionStore
} from '../server/SqliteWorkflowDefinitionStore';
import { WorkflowExecutionSnapshot } from '../src/visual/types';

function snapshot(
    executionId: string,
    workflowId: string,
    startTime: number,
    status: WorkflowExecutionSnapshot['status'] = 'completed'
): WorkflowExecutionSnapshot {
    return {
        executionId,
        workflowId,
        status,
        startTime,
        endTime: startTime + 5,
        nodeStates: {},
        edgeStates: {},
        activeNodeIds: [],
        logs: []
    };
}

describe('Workflow execution store', () => {
    it('lists newest first, filters by workflow and prunes history', async () => {
        const store = new InMemoryWorkflowExecutionStore();
        await store.save(snapshot('e1', 'a', 100));
        await store.save(snapshot('e2', 'a', 300));
        await store.save(snapshot('e3', 'b', 200));

        expect((await store.list()).map(item => item.executionId)).toEqual(['e2', 'e3', 'e1']);
        expect((await store.list('a')).map(item => item.executionId)).toEqual(['e2', 'e1']);
        expect((await store.get('e3'))?.workflowId).toBe('b');
        expect(await store.get('missing')).toBeUndefined();

        await store.prune('a', 1);
        expect((await store.list('a')).map(item => item.executionId)).toEqual(['e2']);
        expect((await store.list('b')).length).toBe(1);

        // Callers must not mutate stored snapshots through the returned value.
        const copy = await store.get('e2');
        copy!.status = 'failed';
        expect((await store.get('e2'))?.status).toBe('completed');
    });

    (isSqliteAvailable() ? it : it.skip)('persists snapshots beside workflow definitions', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-exec-store-'));
        const file = path.join(dir, 'workflows.db');
        const definitions = new SqliteWorkflowDefinitionStore({ file });
        await definitions.save({
            id: 'demo',
            name: 'Demo',
            nodes: [],
            connections: []
        });

        const store = new SqliteWorkflowExecutionStore({ file });
        await store.save(snapshot('e1', 'demo', 100));
        await store.save(snapshot('e2', 'demo', 200, 'cancelled'));
        await store.save(snapshot('e3', 'other', 300));
        store.close();

        const reopened = new SqliteWorkflowExecutionStore({ file });
        expect((await reopened.get('e2'))?.status).toBe('cancelled');
        expect((await reopened.list('demo')).map(item => item.executionId)).toEqual(['e2', 'e1']);

        await reopened.prune('demo', 1);
        expect((await reopened.list('demo')).map(item => item.executionId)).toEqual(['e2']);
        expect((await reopened.list('other')).map(item => item.executionId)).toEqual(['e3']);
        reopened.close();

        definitions.close();
        // Executions live in their own table; reopening the definition store
        // must still return the saved workflow unchanged.
        const verify = new SqliteWorkflowDefinitionStore({ file });
        expect((await verify.get('demo'))?.name).toBe('Demo');
        verify.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
