import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner, createDefaultWorkflowDefinition } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { validateVisualWorkflow } from '../src/visual/workflow-runtime';
import { compileVisualWorkflow, layoutVisualWorkflow } from '../src/visual/workflow-compiler';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';

describe('Visual Workflow Designer', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;
    let designer: WorkflowDesigner;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        designer = new WorkflowDesigner({ registry, service });
    });

    describe('Generic node registry', () => {
        it('registers built-in generic node components', () => {
            const types = registry.list().map(item => item.type);
            ['start', 'end', 'inject', 'task', 'function', 'template', 'json', 'csv', 'change', 'statistics', 'merge', 'event-emit', 'event-wait', 'command', 'split', 'map', 'filter', 'sort', 'range', 'batch', 'trigger', 'comment', 'condition', 'delay', 'log', 'http-request', 'assign', 'transform', 'switch', 'parallel', 'join', 'loop', 'trycatch', 'subprocess', 'custom']
                .forEach(type => expect(types).toContain(type));
            expect(registry.palette('zh-CN').length).toBeGreaterThan(0);
        });

        it('builds a node with cloned ports and config defaults', () => {
            const node = registry.createNode('condition', { x: 10, y: 20 });
            expect(node.type).toBe('condition');
            expect(node.position).toEqual({ x: 10, y: 20 });
            expect(node.outputs?.map(port => port.id)).toEqual(['true', 'false']);
            expect(node.config?.operator).toBe('truthy');
            node.outputs![0].id = 'changed';
            const another = registry.createNode('condition', { x: 0, y: 0 });
            expect(another.outputs?.[0].id).toBe('true');
        });

        it('supports custom node definitions with palette metadata', () => {
            registry.register({
                type: 'custom',
                label: 'Robot',
                labelZh: '机器人',
                category: 'action',
                icon: 'R',
                color: '#123456',
                inputs: [{ id: 'in', name: 'in', type: 'input' }],
                outputs: [{ id: 'out', name: 'out', type: 'output' }],
                fields: [{ key: 'name', label: 'Name', type: 'text' }]
            });
            const node = registry.createNode('custom', { x: 1, y: 2 }, { name: 'Move' });
            expect(node.name).toBe('Move');
            expect(registry.nodeLabel('custom', 'zh-CN')).toBe('机器人');
        });
    });

    describe('Editing model', () => {
        it('starts from a valid default document', () => {
            expect(designer.nodes.length).toBe(6);
            expect(designer.connections.length).toBe(6);
            expect(designer.validate().valid).toBe(true);
        });

        it('adds, removes, undoes and redoes nodes', () => {
            const node = designer.addNode('log', { x: 900, y: 500 });
            expect(node).toBeDefined();
            expect(designer.nodes.length).toBe(7);
            expect(designer.selection.nodeId).toBe(node!.id);

            expect(designer.undo()).toBe(true);
            expect(designer.nodes.length).toBe(6);
            expect(designer.redo()).toBe(true);
            expect(designer.nodes.length).toBe(7);

            expect(designer.removeNode(node!.id)).toBe(true);
            expect(designer.nodes.length).toBe(6);
        });

        it('prevents a second singleton start node', () => {
            const added = designer.addNode('start', { x: 0, y: 0 });
            expect(added).toBeUndefined();
            expect(designer.error).toBe('workflow.error.singleton');
        });

        it('moves nodes through drag gestures without flooding undo history', () => {
            const original = designer.nodes.find(node => node.id === 'task_1')!.position;
            expect(designer.beginNodeDrag('task_1', { x: original.x + 10, y: original.y + 10 })).toBe(true);
            designer.dragNodeTo({ x: original.x + 60, y: original.y + 40 });
            expect(designer.endNodeDrag()).toBe(true);
            const moved = designer.nodes.find(node => node.id === 'task_1')!.position;
            expect(moved).toEqual({ x: original.x + 50, y: original.y + 30 });
            designer.undo();
            expect(designer.nodes.find(node => node.id === 'task_1')!.position).toEqual(original);
        });

        it('connects ports and rejects self-links', () => {
            const log = designer.addNode('log', { x: 900, y: 500 })!;
            const connection = designer.addConnection('task_2', 'out', log.id, 'in');
            expect(connection).toBeDefined();
            expect(designer.connections.some(item => item.id === connection!.id)).toBe(true);

            const duplicate = designer.addConnection('task_2', 'out', log.id, 'in');
            expect(duplicate?.id).toBe(connection!.id);
            expect(designer.connections.filter(item => item.id === connection!.id).length).toBe(1);

            expect(designer.addConnection(log.id, 'out', log.id, 'in')).toBeUndefined();
            expect(designer.error).toBe('workflow.error.selfLink');
        });

        it('supports connection gestures from output to input ports', () => {
            const log = designer.addNode('log', { x: 900, y: 500 })!;
            expect(designer.beginConnection('task_2', 'out', { x: 500, y: 300 })).toBe(true);
            designer.updateConnectionDraft({ x: 760, y: 420 });
            const connection = designer.completeConnection(log.id, 'in');
            expect(connection?.targetNodeId).toBe(log.id);
            expect(designer.connectionDraft).toBeUndefined();
        });

        it('removes dangling connections when a node is deleted', () => {
            const log = designer.addNode('log', { x: 900, y: 500 })!;
            designer.addConnection('task_2', 'out', log.id, 'in');
            expect(designer.removeNode(log.id)).toBe(true);
            expect(designer.connections.some(item => item.targetNodeId === log.id)).toBe(false);
        });

        it('serializes and reloads a visual document', () => {
            designer.addNode('log', { x: 1000, y: 600 });
            const json = designer.serialize();
            const restored = new WorkflowDesigner({ registry, service, definition: JSON.parse(json) });
            expect(restored.nodes.length).toBe(designer.nodes.length);
            expect(restored.connections.length).toBe(designer.connections.length);
            expect(validateVisualWorkflow(restored.definition).valid).toBe(true);
        });
    });

    describe('Default document factory', () => {
        it('creates a runnable approval workflow', () => {
            const definition = createDefaultWorkflowDefinition(registry, 'en');
            expect(definition.nodes.length).toBe(6);
            expect(validateVisualWorkflow(definition).valid).toBe(true);
        });
    });

    describe('Compiled execution plan', () => {
        it('compiles entry, adjacency and reachability once', () => {
            const local = new WorkflowDesigner({ registry, service });
            const plan = compileVisualWorkflow(local.definition);
            expect(plan.valid).toBe(true);
            expect(plan.entry?.id).toBe('start_1');
            expect(plan.nodes.size).toBe(6);
            expect(plan.outgoing.get('condition_1')?.map(edge => edge.sourcePort)).toEqual(['true', 'false']);
            expect(plan.incoming.get('end_1')?.length).toBe(2);
            expect(plan.reachable.has('task_2')).toBe(true);
            expect(plan.order[0]).toBe('start_1');
        });

        it('lays out reachable nodes in columns', () => {
            const local = new WorkflowDesigner({ registry, service });
            const positions = layoutVisualWorkflow(local.definition, { originX: 0, originY: 0, columnGap: 200, rowGap: 100 });
            expect(positions.start_1).toEqual({ x: 0, y: 0 });
            expect(positions.task_1.x).toBe(200);
            expect(positions.condition_1.x).toBe(400);
            expect(positions.end_1.x).toBeGreaterThan(positions.condition_1.x);
        });
    });

    describe('Workflow definition store', () => {
        it('saves, lists, loads and removes definitions', async () => {
            const local = new WorkflowDesigner({ registry, service });
            const store = new InMemoryWorkflowDefinitionStore();
            const saved = await local.saveTo(store);
            expect(saved.id).toBe(local.definition.id);

            const list = await local.listSaved(store);
            expect(list.length).toBe(1);
            expect(list[0].nodeCount).toBe(6);

            local.updateNodeConfig('task_1', { result: { approved: true } });
            const restored = new WorkflowDesigner({ registry, service, definition: { id: 'empty', name: 'empty', nodes: [], connections: [] } });
            expect(await restored.openFrom(store, saved.id)).toBe(true);
            expect(restored.nodes.length).toBe(6);

            expect(await local.removeSaved(store, saved.id)).toBe(true);
            expect((await local.listSaved(store)).length).toBe(0);
        });

        it('saves a copy with a new id', async () => {
            const local = new WorkflowDesigner({ registry, service });
            const store = new InMemoryWorkflowDefinitionStore();
            const original = await local.saveTo(store);
            const copy = await local.saveTo(store, { as: true, name: 'Copy' });
            expect(copy.id).not.toBe(original.id);
            expect(copy.name).toBe('Copy');
            expect((await local.listSaved(store)).length).toBe(2);
        });
    });

    describe('Editing helpers', () => {        it('duplicates the selected node with a new id and offset', () => {
            const local = new WorkflowDesigner({ registry, service });
            local.selectNode('task_1');
            const duplicate = local.duplicateSelection();
            expect(duplicate).toBeDefined();
            expect(duplicate!.id).not.toBe('task_1');
            expect(duplicate!.name).toContain('copy');
            expect(duplicate!.position.x).toBeGreaterThan(local.nodes.find(node => node.id === 'task_1')!.position.x);
            expect(local.nodes.length).toBe(7);
        });

        it('applies auto layout and can undo it', () => {
            const local = new WorkflowDesigner({ registry, service });
            const before = local.nodes.find(node => node.id === 'end_1')!.position;
            expect(local.autoLayout()).toBe(true);
            const after = local.nodes.find(node => node.id === 'end_1')!.position;
            expect(after).not.toEqual(before);
            local.undo();
            expect(local.nodes.find(node => node.id === 'end_1')!.position).toEqual(before);
        });

        it('snaps node positions to the configured grid', () => {
            const local = new WorkflowDesigner({ registry, service });
            local.gridSize = 20;
            local.moveNode('task_1', { x: 137, y: 143 });
            expect(local.nodes.find(node => node.id === 'task_1')!.position).toEqual({ x: 140, y: 140 });
        });
    });
});
