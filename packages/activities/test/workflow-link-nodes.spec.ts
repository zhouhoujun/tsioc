import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow link routing', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    function node(type: any, id: string, config: Record<string, any> = {}, position = { x: 0, y: 0 }) {
        return registry.createNode(type, position, { id, config });
    }

    function connect(definition: VisualWorkflowDefinition, source: string, target: string): void {
        (definition.connections as any[]).push({
            id: `c_${source}_${target}`,
            sourceNodeId: source,
            sourcePort: 'out',
            targetNodeId: target,
            targetPort: 'in'
        });
    }

    it('jumps from a link-out into matching link-in branches', async () => {
        const hits: string[] = [];
        const definition: VisualWorkflowDefinition = {
            id: 'link-out-flow',
            name: 'Link out',
            nodes: [
                node('start', 'start_1'),
                node('link', 'link_out', { mode: 'out', links: 'job' }),
                node('link', 'link_in_a', { mode: 'in', links: 'job' }),
                node('link', 'link_in_b', { mode: 'in', links: 'other, job' }),
                node('task', 'task_a', { action: 'capture' }),
                node('task', 'task_b', { action: 'capture' })
            ],
            connections: []
        } as VisualWorkflowDefinition;
        connect(definition, 'start_1', 'link_out');
        connect(definition, 'link_in_a', 'task_a');
        connect(definition, 'link_in_b', 'task_b');

        const result = await service.execute(definition, {
            payload: { id: 7 },
            actions: {
                capture: (ctx: any) => {
                    hits.push('hit');
                    return ctx.payload;
                }
            }
        });
        expect(result.success).toBe(true);
        expect(hits.length).toBe(2);
        const states = result.data?.executionState?.nodeStates || ({} as any);
        expect(states.task_a?.status).toBe('success');
        expect(states.task_b?.status).toBe('success');
    });

    it('calls a branch and continues with the returned message', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'link-call-flow',
            name: 'Link call',
            nodes: [
                node('start', 'start_1'),
                node('link', 'call_1', { mode: 'call', links: 'job', timeout: 2000 }),
                node('task', 'after', { action: 'after' }),
                node('link', 'in_1', { mode: 'in', links: 'job' }),
                node('function', 'work', { code: 'return { payload: { doubled: input.payload.id * 2 } };' }),
                node('link', 'return_1', { mode: 'return', links: 'job' })
            ],
            connections: []
        } as VisualWorkflowDefinition;
        connect(definition, 'start_1', 'call_1');
        connect(definition, 'call_1', 'after');
        connect(definition, 'in_1', 'work');
        connect(definition, 'work', 'return_1');

        let afterValue: any;
        const result = await service.execute(definition, {
            payload: { id: 3 },
            actions: {
                after: (ctx: any) => {
                    afterValue = ctx.payload;
                    return ctx.payload;
                }
            }
        });
        expect(result.success).toBe(true);
        expect(afterValue).toEqual({ doubled: 6 });
        const states = result.data?.executionState?.nodeStates || ({} as any);
        expect(states.return_1?.status).toBe('success');
        expect(states.after?.status).toBe('success');
    });

    it('fails a link call that never returns', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'link-timeout-flow',
            name: 'Link timeout',
            nodes: [
                node('start', 'start_1'),
                node('link', 'call_1', { mode: 'call', links: 'slow', timeout: 60 }),
                node('link', 'in_1', { mode: 'in', links: 'slow' }),
                node('task', 'work', { action: 'work' })
            ],
            connections: []
        } as VisualWorkflowDefinition;
        connect(definition, 'start_1', 'call_1');
        connect(definition, 'in_1', 'work');

        const result = await service.execute(definition, {
            payload: {},
            actions: { work: () => ({ payload: {} }) }
        });
        expect(result.success).toBe(false);
        expect(String(result.error?.message || '')).toContain('timed out after 60ms');
    });

    it('reports a missing target instead of running the rest of the flow', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'link-missing-flow',
            name: 'Link missing',
            nodes: [
                node('start', 'start_1'),
                node('link', 'call_1', { mode: 'call', links: 'nobody', timeout: 50 })
            ],
            connections: []
        } as VisualWorkflowDefinition;
        connect(definition, 'start_1', 'call_1');
        const result = await service.execute(definition, { payload: {} });
        expect(result.success).toBe(false);
        expect(String(result.error?.message || '')).toContain('found no matching link-in node');
    });
});
