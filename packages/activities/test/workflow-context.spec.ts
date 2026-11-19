import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import {
    InMemoryWorkflowContextStore,
    SqliteWorkflowContextStore
} from '../server/WorkflowContextStore';
import { isSqliteAvailable } from '../server/SqliteWorkflowDefinitionStore';

describe('Workflow context and global config', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    function flow(nodes: Array<{ type: any; id: string; config?: Record<string, any> }>): VisualWorkflowDefinition {
        return {
            id: 'context-flow',
            name: 'Context flow',
            nodes: nodes.map((node, index) => registry.createNode(node.type, { x: index * 200, y: 0 }, {
                id: node.id,
                config: node.config
            })),
            connections: nodes.slice(0, -1).map((node, index) => ({
                id: `c${index}`,
                sourceNodeId: node.id,
                sourcePort: 'out',
                targetNodeId: nodes[index + 1].id,
                targetPort: 'in'
            }))
        };
    }

    it('exposes global-config values through env with get/has helpers', async () => {
        const result = await service.execute(flow([
            {
                type: 'global-config',
                id: 'config_1',
                config: { values: { region: 'eu', retries: 3 }, scope: 'env' }
            },
            {
                type: 'function',
                id: 'fn',
                config: {
                    code: 'return { payload: { region: env.region, retries: env.get("retries"), has: env.has("region"), missing: env.has("nope") } };'
                }
            }
        ]), { payload: {} });
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.fn.result?.data?.payload).toEqual({
            region: 'eu',
            retries: 3,
            has: true,
            missing: false
        });
        // The helpers stay out of the serialized scope.
        expect(JSON.stringify(result.data?.executionState?.nodeStates.fn.result?.data?.payload)).not.toContain('get');
    });

    it('merges global-config values into the global scope', async () => {
        const result = await service.execute(flow([
            {
                type: 'global-config',
                id: 'config_1',
                config: { values: { tenant: 'acme' }, scope: 'global' }
            },
            { type: 'function', id: 'fn', config: { code: 'return { payload: global.tenant };' } }
        ]), { payload: {} });
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.fn.result?.data?.payload).toBe('acme');
    });

    it('persists flow and global context between runs', async () => {
        const store = new InMemoryWorkflowContextStore();
        service.setContextStore(store);
        const definition = flow([
            {
                type: 'function',
                id: 'fn',
                config: {
                    code: 'flow.runs = (flow.runs || 0) + 1; global.total = (global.total || 0) + 1; return { payload: { runs: flow.runs, total: global.total } };'
                }
            }
        ]);
        const first = await service.execute(definition, { payload: {} });
        const second = await service.execute(definition, { payload: {} });
        expect(first.data?.executionState?.nodeStates.fn.result?.data?.payload).toEqual({ runs: 1, total: 1 });
        expect(second.data?.executionState?.nodeStates.fn.result?.data?.payload).toEqual({ runs: 2, total: 2 });

        const saved = await store.read('context-flow');
        expect(saved?.flow).toEqual({ runs: 2 });
        expect(saved?.global?.total).toBe(2);

        await store.clear('context-flow');
        expect(await store.read('context-flow')).toBeUndefined();
    });

    (isSqliteAvailable() ? it : it.skip)('persists context in SQLite across service instances', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-context-'));
        const file = path.join(dir, 'workflows.db');
        const store = new SqliteWorkflowContextStore({ file });
        service.setContextStore(store);
        const definition = flow([
            {
                type: 'function',
                id: 'fn',
                config: { code: 'flow.counter = (flow.counter || 0) + 1; return { payload: flow.counter };' }
            }
        ]);
        await service.execute(definition, { payload: {} });
        store.close();

        const reopened = new SqliteWorkflowContextStore({ file });
        const saved = await reopened.read('context-flow');
        expect(saved?.flow).toEqual({ counter: 1 });

        const otherInjector = createInjector();
        InjectUtil.use(otherInjector, WorkflowModule);
        const otherService = otherInjector.get(VisualWorkflowService);
        otherService.setContextStore(reopened);
        const otherRegistry = otherInjector.get(WorkflowNodeRegistry);
        const second = await otherService.execute({
            id: 'context-flow',
            name: 'Context flow',
            nodes: [otherRegistry.createNode('function', { x: 0, y: 0 }, {
                id: 'fn',
                config: { code: 'flow.counter = (flow.counter || 0) + 1; return { payload: flow.counter };' }
            })],
            connections: []
        }, { payload: {} });
        expect(second.data?.executionState?.nodeStates.fn.result?.data?.payload).toBe(2);

        await reopened.clear();
        expect(await reopened.read('context-flow')).toBeUndefined();
        reopened.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('never fails a run when the context store throws', async () => {
        service.setContextStore({
            read: async () => { throw new Error('boom'); },
            write: async () => { throw new Error('boom'); },
            clear: async () => undefined
        });
        const result = await service.execute(flow([
            { type: 'function', id: 'fn', config: { code: 'return { payload: "ok" };' } }
        ]), { payload: {} });
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.fn.result?.data?.payload).toBe('ok');
    });
});
