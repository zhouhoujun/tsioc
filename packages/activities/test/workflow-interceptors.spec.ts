import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowRetryInterceptor, WorkflowTimeoutInterceptor } from '../src/visual/workflow-interceptors';
import { VisualWorkflowDefinition } from '../src/visual/types';

function buildWorkflow(registry: WorkflowNodeRegistry, config: Record<string, any>): VisualWorkflowDefinition {
    return {
        id: 'interceptor-test',
        name: 'Interceptor test',
        nodes: [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_i' }),
            registry.createNode('task', { x: 200, y: 0 }, { id: 'task_i', config }),
            registry.createNode('end', { x: 400, y: 0 }, { id: 'end_i' })
        ],
        connections: [
            { id: 'e1', sourceNodeId: 'start_i', sourcePort: 'out', targetNodeId: 'task_i', targetPort: 'in' },
            { id: 'e2', sourceNodeId: 'task_i', sourcePort: 'out', targetNodeId: 'end_i', targetPort: 'in' }
        ]
    };
}

describe('Workflow Interceptors', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    it('retries a failing generated node through the core interceptor chain', async () => {
        let calls = 0;
        const actions = {
            flaky: () => {
                calls += 1;
                if (calls < 3) {
                    throw new Error('temporary');
                }
                return { ok: true, calls };
            }
        };
        service.use(new WorkflowRetryInterceptor({ retries: 2, delayMs: 1 }));
        const result = await service.execute(buildWorkflow(registry, { action: 'flaky' }), { actions });
        expect(result.success).toBe(true);
        expect(calls).toBe(3);
        expect(result.data?.executionState.nodeStates.task_i.status).toBe('success');
        expect(result.data?.executionState.nodeStates.task_i.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('stops retrying after the configured attempts', async () => {
        let calls = 0;
        service.use(new WorkflowRetryInterceptor({ retries: 1, delayMs: 0 }));
        const result = await service.execute(buildWorkflow(registry, { action: 'alwaysFail' }), {
            actions: {
                alwaysFail: () => {
                    calls += 1;
                    throw new Error('permanent');
                }
            }
        });
        expect(result.success).toBe(false);
        expect(calls).toBe(2);
        expect(result.data?.executionState.nodeStates.task_i.status).toBe('failed');
    });

    it('fails a slow node with a timeout interceptor', async () => {
        service.use(new WorkflowTimeoutInterceptor({ timeoutMs: 15 }));
        const definition: VisualWorkflowDefinition = {
            id: 'timeout-test',
            name: 'Timeout test',
            nodes: [
                registry.createNode('start', { x: 0, y: 0 }, { id: 'start_t' }),
                registry.createNode('delay', { x: 200, y: 0 }, { id: 'delay_t', config: { delay: 200 } }),
                registry.createNode('end', { x: 400, y: 0 }, { id: 'end_t' })
            ],
            connections: [
                { id: 't1', sourceNodeId: 'start_t', sourcePort: 'out', targetNodeId: 'delay_t', targetPort: 'in' },
                { id: 't2', sourceNodeId: 'delay_t', sourcePort: 'out', targetNodeId: 'end_t', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        expect(result.success).toBe(false);
        expect(result.data?.executionState.nodeStates.delay_t.status).toBe('failed');
        expect(result.data?.executionState.nodeStates.delay_t.error).toContain('timed out');
        expect(result.data?.executionState.nodeStates.end_t.status).toBe('skipped');
    });

    it('applies interceptors only to filtered nodes', async () => {
        service.use(new WorkflowRetryInterceptor({
            retries: 5,
            delayMs: 0,
            filter: input => input.node.id === 'other'
        }));
        let calls = 0;
        const result = await service.execute(buildWorkflow(registry, { action: 'failOnce' }), {
            actions: {
                failOnce: () => {
                    calls += 1;
                    throw new Error('fail');
                }
            }
        });
        expect(result.success).toBe(false);
        expect(calls).toBe(1);
    });

    it('applies node-level retry config through the default policy interceptor', async () => {
        let calls = 0;
        const result = await service.execute(
            buildWorkflow(registry, { action: 'flakyNode', retry: 2, retryDelay: 1 }),
            {
                actions: {
                    flakyNode: () => {
                        calls += 1;
                        if (calls < 3) {
                            throw new Error('temporary');
                        }
                        return { ok: true };
                    }
                }
            }
        );
        expect(result.success).toBe(true);
        expect(calls).toBe(3);
        expect(result.data?.executionState.nodeStates.task_i.status).toBe('success');
    });

    it('applies node-level timeout config through the default policy interceptor', async () => {
        const result = await service.execute(
            buildWorkflow(registry, { action: 'slow', timeout: 10 }),
            {
                actions: {
                    slow: () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
                }
            }
        );
        expect(result.success).toBe(false);
        expect(result.data?.executionState.nodeStates.task_i.status).toBe('failed');
        expect(result.data?.executionState.nodeStates.task_i.error).toContain('timed out');
        expect(result.data?.executionState.nodeStates.end_i.status).toBe('skipped');
    });
});
