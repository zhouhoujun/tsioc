import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { buildWorkflowCanvasModel, buildWorkflowInspectorModel } from '../src/visual/workflow-view-models';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow dynamic output ports', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    function designerWith(rules: any[]): WorkflowDesigner {
        const definition: VisualWorkflowDefinition = {
            id: 'dynamic-ports',
            name: 'Dynamic ports',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { level: 7 } } }),
                registry.createNode('switch', { x: 200, y: 0 }, { id: 'switch_1', config: { field: 'level', rules } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'switch_1', targetPort: 'in' }
            ]
        };
        return new WorkflowDesigner({ definition, registry, service });
    }

    it('derives one route port per rule plus fallback and error', () => {
        const node = registry.createNode('switch', { x: 0, y: 0 }, {
            id: 'switch_1',
            config: {
                field: 'level',
                rules: [
                    { operator: 'equals', value: { type: 'msg', path: 'level' } },
                    { operator: 'gt', value: { type: 'literal', valueType: 'num', value: '5' } },
                    { operator: 'else' }
                ]
            }
        });
        expect(node.outputs.map(port => port.id)).toEqual(['route-1', 'route-2', 'route-3', 'default', 'error']);
        // Labels summarize the rule so the canvas tooltip explains the wire.
        expect(node.outputs[0].label).toContain('1 · =');
        expect(node.outputs[1].label).toContain('2 · >');
        expect(node.outputs[2].label).toContain('3 · else');
        expect(node.outputs[3].label).toContain('Default');
    });

    it('follows rule edits and keeps connections instead of deleting wiring', () => {
        const designer = designerWith([
            { operator: 'equals', value: '1' },
            { operator: 'equals', value: '2' }
        ]);
        designer.updateNode('switch_1', { x: 200, y: 0 });
        expect(designer.nodes.find(node => node.id === 'switch_1')!.outputs.map(port => port.id))
            .toEqual(['route-1', 'route-2', 'default', 'error']);

        designer.addNode('task', { x: 400, y: 0 }, { id: 'task_next' });
        designer.addConnection('switch_1', 'route-2', 'task_next', 'in');
        designer.updateNodeConfig('switch_1', { rules: [{ operator: 'equals', value: '1' }] });
        const node = designer.nodes.find(item => item.id === 'switch_1')!;
        expect(node.outputs.map(port => port.id)).toEqual(['route-1', 'default', 'error']);
        // The wire survives and validation names the port that needs rework.
        expect(designer.connections.some(item => item.sourcePort === 'route-2')).toBe(true);
        expect(designer.validate().errors.join(' ')).toContain('route-2');
    });

    it('keeps normalization in sync for documents saved with the old fixed list', () => {
        const designer = designerWith([]);
        const legacy = JSON.parse(JSON.stringify(designer.definition));
        const legacySwitch = legacy.nodes.find((node: any) => node.id === 'switch_1');
        legacySwitch.outputs = Array.from({ length: 10 }, (_, index) =>
            index < 8
                ? { id: `route-${index + 1}`, name: `route-${index + 1}`, type: 'output', label: `${index + 1}` }
                : index === 8
                    ? { id: 'default', name: 'default', type: 'output', label: 'Default' }
                    : { id: 'error', name: 'error', type: 'output', label: 'Error' }
        );
        legacySwitch.config.rules = [{ operator: 'equals', value: '1' }];

        const reloaded = new WorkflowDesigner({ definition: legacy, registry, service });
        const node = reloaded.nodes.find(item => item.id === 'switch_1')!;
        expect(node.outputs.map(port => port.id)).toEqual(['route-1', 'default', 'error']);
        expect(node.outputs[0].label).toBe('1 · = 1');
    });

    it('shows the derived ports on the canvas', () => {
        const designer = designerWith([
            { operator: 'equals', value: 'a' },
            { operator: 'equals', value: 'b' },
            { operator: 'else' }
        ]);
        const model = buildWorkflowCanvasModel(designer, registry, 'en');
        const node = model.nodes.find(item => item.id === 'switch_1')!;
        expect(node.outputs.map(port => port.id)).toEqual(['route-1', 'route-2', 'route-3', 'default', 'error']);
        designer.selectNode('switch_1');
        expect(buildWorkflowInspectorModel(designer, registry, 'en').fields.length).toBeGreaterThan(0);
    });

    it('routes past the eighth rule instead of dropping it', async () => {
        const rules = Array.from({ length: 11 }, (_, index) => ({
            operator: 'equals',
            value: String(index + 1)
        })).concat([{ operator: 'equals', value: '12' }]);
        const definition: VisualWorkflowDefinition = {
            id: 'switch-twelve',
            name: 'Switch twelve',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { level: 12 } } }),
                registry.createNode('switch', { x: 200, y: 0 }, { id: 'switch_1', config: { field: 'level', rules } }),
                registry.createNode('task', { x: 400, y: 0 }, { id: 'task_twelfth' })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'switch_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'switch_1', sourcePort: 'route-12', targetNodeId: 'task_twelfth', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(states.switch_1.result?.data?.route).toBe(12);
        expect(states.task_twelfth.status).toBe('success');
    });
});
