import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { buildWorkflowCanvasModel, buildWorkflowInspectorModel } from '../src/visual/workflow-view-models';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow node status lines', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    function chain(steps: Array<{ type: any; config?: Record<string, any> }>): VisualWorkflowDefinition {
        const nodes = steps.map((step, index) =>
            registry.createNode(step.type, { x: index * 200, y: 100 }, {
                id: `${step.type}_${index}`,
                config: step.config
            })
        );
        return {
            id: 'status-chain',
            name: 'Status chain',
            nodes,
            connections: nodes.slice(0, -1).map((node, index) => ({
                id: `c${index}`,
                sourceNodeId: node.id,
                sourcePort: 'out',
                targetNodeId: nodes[index + 1].id,
                targetPort: 'in'
            }))
        };
    }

    it('reports a switch route as a status line', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { level: 7 } } },
            { type: 'switch', config: { field: 'level', rules: [
                { operator: 'equals', value: '7' }
            ] } }
        ]), {});
        const state = result.data?.executionState?.nodeStates.switch_1;
        expect(state?.result?.status).toEqual({
            text: 'Route 1',
            level: 'info',
            key: 'workflow.nodeStatus.route',
            params: { route: 1 }
        });
    });

    it('reports a no-match switch as a warning', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { level: 7 } } },
            { type: 'switch', config: { field: 'level', rules: [
                { operator: 'equals', value: '1' }
            ] } }
        ]), {});
        expect(result.data?.executionState?.nodeStates.switch_1.result?.status)
            .toEqual({ text: 'No rule matched', level: 'warn', key: 'workflow.nodeStatus.noRule' });
    });

    it('reports inbound transports with their source', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'status-inbound',
            name: 'Status inbound',
            nodes: [
                registry.createNode('tcp-in', { x: 0, y: 0 }, { id: 'tcp_in' })
            ],
            connections: []
        };
        const result = await service.execute(definition, {
            inbound: {
                nodeId: 'tcp_in',
                transport: 'tcp',
                payload: 'hello',
                remote: '10.0.0.5:4711'
            }
        } as any);
        expect(result.data?.executionState?.nodeStates.tcp_in.result?.status)
            .toEqual({ text: 'tcp 10.0.0.5:4711', level: 'info' });
    });

    it('reports HTTP responses with their code and outcome', async () => {
        const original = (globalThis as any).fetch;
        (globalThis as any).fetch = async () => new Response('ok', { status: 200 });
        try {
            const result = await service.execute(chain([
                {
                    type: 'http-request',
                    config: { url: 'https://api.example.com/status' }
                }
            ]), {});
            const ok = result.data?.executionState?.nodeStates['http-request_0'];
            expect(ok?.result?.status).toEqual({
                text: 'HTTP 200',
                level: 'success',
                key: 'workflow.nodeStatus.http',
                params: { status: 200 }
            });

            (globalThis as any).fetch = async () => new Response('bad', { status: 500 });
            const failed = await service.execute(chain([
                {
                    type: 'http-request',
                    config: { url: 'https://api.example.com/status' }
                }
            ]), {});
            const state = failed.data?.executionState?.nodeStates['http-request_0'];
            expect(state?.result?.status).toEqual({
                text: 'HTTP 500',
                level: 'error',
                key: 'workflow.nodeStatus.http',
                params: { status: 500 }
            });
        } finally {
            (globalThis as any).fetch = original;
        }
    });

    it('shows the status line on the canvas and in the inspector', async () => {
        const designer = new WorkflowDesigner({
            definition: chain([
                { type: 'inject', config: { payload: { level: 7 } } },
                { type: 'switch', config: { field: 'level', rules: [
                    { operator: 'equals', value: '7' }
                ] } }
            ]),
            registry,
            service
        });
        designer.selectNode('switch_1');
        const idle = buildWorkflowCanvasModel(designer, registry, 'en')
            .nodes.find(node => node.id === 'switch_1')!;
        expect(idle.detail).toBe('');

        await designer.run({});
        const canvas = buildWorkflowCanvasModel(designer, registry, 'en');
        const node = canvas.nodes.find(item => item.id === 'switch_1')!;
        expect(node.detail).toBe('Route 1');
        expect(node.statusLabel).toBeTruthy();

        const inspector = buildWorkflowInspectorModel(designer, registry, 'en');
        expect(inspector.statusDetail).toBe('Route 1');
    });

    it('translates status keys through the workflow bundle', async () => {
        const designer = new WorkflowDesigner({
            definition: chain([
                { type: 'inject', config: { payload: { level: 7 } } },
                { type: 'switch', config: { field: 'level', rules: [
                    { operator: 'equals', value: '7' }
                ] } }
            ]),
            registry,
            service
        });
        designer.selectNode('switch_1');
        await designer.run({});
        const translator: any = {
            has: (key: string) => key === 'workflow.nodeStatus.route',
            translate: (key: string, _locale: string, params: any) =>
                key === 'workflow.nodeStatus.route' ? `ROUTE ${params.route}` : key
        };
        const canvas = buildWorkflowCanvasModel(designer, registry, 'en', translator);
        expect(canvas.nodes.find(node => node.id === 'switch_1')!.detail).toBe('ROUTE 1');
        expect(buildWorkflowInspectorModel(designer, registry, 'en', translator).statusDetail)
            .toBe('ROUTE 1');
    });
});
