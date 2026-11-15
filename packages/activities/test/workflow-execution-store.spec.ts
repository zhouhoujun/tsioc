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

        // Callers must not mutate stored snapshots through the returned value.
        const copy = await store.get('e2');
        copy!.status = 'failed';
        expect((await store.get('e2'))?.status).toBe('completed');

        await store.prune('a', 1);
        expect((await store.list('a')).map(item => item.executionId)).toEqual(['e2']);
        expect((await store.list('b')).length).toBe(1);

        await store.removeWorkflow('a');
        expect((await store.list('a')).length).toBe(0);
        expect((await store.list('b')).length).toBe(1);
        await store.clear();
        expect((await store.list()).length).toBe(0);
    });

    it('bounds history by bytes and always keeps the newest run', async () => {
        const store = new InMemoryWorkflowExecutionStore();
        const big = (id: string, order: number) => {
            const item = snapshot(id, 'bytes', order * 100);
            item.logs = [{
                id: 'log_1',
                timestamp: 1,
                level: 'info',
                event: 'log',
                message: 'x'.repeat(400)
            }];
            return item;
        };
        for (let index = 1; index <= 5; index++) {
            await store.save(big(`e${index}`, index));
        }
        const all = await store.list('bytes', 50);
        expect(all.length).toBe(5);
        const newest = JSON.stringify(all[0]).length;
        await store.pruneBytes('bytes', newest * 2 + 10);

        const after = await store.list('bytes', 50);
        expect(after.length).toBe(2);
        expect(after[0].executionId).toBe('e5');
        expect(after[0].executionId).toBe(all[0].executionId);
        const total = after.reduce((sum, item) => sum + JSON.stringify(item).length, 0);
        expect(total).toBeLessThanOrEqual(newest * 2 + 10);
    });

    (isSqliteAvailable() ? it : it.skip)('trims persisted history to a byte budget', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-exec-bytes-'));
        const file = path.join(dir, 'workflows.db');
        try {
            const store = new SqliteWorkflowExecutionStore({ file });
            for (let index = 1; index <= 4; index++) {
                const item = snapshot(`b${index}`, 'bytes', index * 100);
                item.logs = [{ id: 'l', timestamp: 1, level: 'info', event: 'log', message: 'y'.repeat(600) }];
                await store.save(item);
            }
            const all = await store.list('bytes', 50);
            expect(all.length).toBe(4);
            const newest = JSON.stringify(all[0]).length;
            await store.pruneBytes('bytes', newest + 50);

            const after = await store.list('bytes', 50);
            expect(after.length).toBe(1);
            expect(after[0].executionId).toBe('b4');
            store.close();
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
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
