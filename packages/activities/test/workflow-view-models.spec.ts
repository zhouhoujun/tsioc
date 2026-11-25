import expect = require('expect');
import {
    buildWorkflowCanvasModel,
    buildWorkflowCanvasViewport,
    buildWorkflowInspectorModel,
} from '../src/visual/workflow-view-models';
import {
    createDefaultWorkflowDefinition,
    WorkflowDesigner,
} from '../src/visual/workflow-designer';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';

/**
 * Canvas projection must stay incremental: a pan/zoom or an unrelated edit may
 * not replace every node/edge view object, otherwise the renderer replays the
 * whole graph (icons included) on each pointer event.
 */
describe('Workflow canvas incremental view model', () => {
    function createDesigner(): { designer: WorkflowDesigner; registry: WorkflowNodeRegistry } {
        const registry = new WorkflowNodeRegistry();
        const designer = new WorkflowDesigner({
            registry,
            definition: createDefaultWorkflowDefinition(registry, 'en')
        });
        return { designer, registry };
    }

    it('offers node ids and node types for multi-select scope fields', () => {
        const { designer, registry } = createDesigner();
        const node = designer.addNode('catch', { x: 0, y: 0 })!;
        designer.selectNode(node.id);
        const field = buildWorkflowInspectorModel(designer, registry, 'en')
            .fields.find(item => item.key === 'scope')!;
        expect(field.reference?.multiple).toBe(true);
        expect(field.options.some(option => option.value === 'task')).toBe(true);
        expect(field.options.some(option => option.value === 'task_1')).toBe(true);
    });

    it('exposes inline config issues for the selected node only', () => {
        const { designer, registry } = createDesigner();
        const node = designer.addNode('subprocess', { x: 0, y: 0 })!;
        const other = designer.addNode('subprocess', { x: 0, y: 200 })!;
        designer.selectNode(node.id);
        const issues = buildWorkflowInspectorModel(designer, registry, 'en').issues;
        expect(issues.some(issue => issue.fieldKey === 'workflow' && issue.message === 'Required')).toBe(true);
        expect(issues.every(issue => issue.severity === 'error' || issue.severity === 'warning')).toBe(true);

        designer.updateNodeConfig(node.id, { workflow: 'child' });
        expect(buildWorkflowInspectorModel(designer, registry, 'en').issues).toEqual([]);
        // The sibling node keeps its own issue instead of polluting the selection.
        designer.selectNode(other.id);
        expect(buildWorkflowInspectorModel(designer, registry, 'en').issues.length).toBe(1);
    });

    it('renders a stored workflow picker for subflow sources', () => {
        const { designer, registry } = createDesigner();
        designer.workflowLibrary.set([
            { id: designer.definition.id, name: 'Self', updatedAt: '2026-01-01' } as any,
            { id: 'wf_child', name: 'Child flow', updatedAt: '2026-01-01' } as any
        ]);
        const node = designer.addNode('subprocess', { x: 0, y: 0 })!;
        designer.selectNode(node.id);
        const field = (key: string) => buildWorkflowInspectorModel(designer, registry, 'en')
            .fields.find(item => item.key === key)!;
        expect(field('workflowMode').type).toBe('select');
        expect(field('workflow').type).toBe('select');
        expect(field('workflow').reference?.kind).toBe('workflow');
        expect(field('workflow').options.some(option => option.value === 'wf_child')).toBe(true);
        expect(field('workflow').options.find(option => option.value === 'wf_child')?.label).toBe('Child flow');
        // The active document cannot be its own sub-workflow.
        expect(field('workflow').options.some(option => option.value === designer.definition.id)).toBe(false);
        // The picker can create a child document; edit appears once one is picked.
        expect((field('workflow').actions || []).map(action => action.id)).toEqual(['create']);
        designer.updateNodeConfig(node.id, { workflow: 'wf_child' });
        designer.selectNode(node.id);
        const picked = buildWorkflowInspectorModel(designer, registry, 'en')
            .fields.find(item => item.key === 'workflow')!;
        expect((picked.actions || []).map(action => action.id)).toEqual(['create', 'edit']);
    });

    it('reports stored workflows that the loaded library no longer has', () => {
        const { designer, registry } = createDesigner();
        designer.workflowLibrary.set([{ id: 'wf_child', name: 'Child flow', updatedAt: 'now' } as any]);
        const node = designer.addNode('subprocess', { x: 0, y: 0 })!;
        designer.updateNodeConfig(node.id, { workflow: 'ghost_wf' });
        designer.selectNode(node.id);
        const issues = buildWorkflowInspectorModel(designer, registry, 'en').issues;
        expect(issues.some(issue => issue.fieldKey === 'workflow' && issue.message.includes('ghost_wf'))).toBe(true);

        designer.updateNodeConfig(node.id, { workflow: 'wf_child' });
        expect(buildWorkflowInspectorModel(designer, registry, 'en').issues).toEqual([]);
    });

    it('infers the workflow control from documents without a mode', () => {
        const { designer, registry } = createDesigner();
        const cases: Array<[any, string]> = [
            ['child_1', 'select'],
            ['flow.child', 'text'],
            ['{\"id\":\"inline\"}', 'textarea']
        ];
        const nodes = cases.map(([value], index) => designer.addNode('subprocess', { x: index * 10, y: 0 }, {
            config: { workflow: value }
        })!);
        cases.forEach(([, type], index) => {
            designer.selectNode(nodes[index].id);
            const field = buildWorkflowInspectorModel(designer, registry, 'en')
                .fields.find(item => item.key === 'workflow')!;
            expect(field.type).toBe(type);
            expect(field.reference?.kind).toBe(type === 'select' ? 'workflow' : undefined);
        });
    });

    it('derives the scale action from the legacy clamp flag', () => {
        const { designer, registry } = createDesigner();
        const node = designer.addNode('scale', { x: 0, y: 0 }, {
            config: { field: 'value', inMin: 0, inMax: 100, outMin: 0, outMax: 1, clamp: false }
        })!;
        designer.selectNode(node.id);
        const field = (key: string) => buildWorkflowInspectorModel(designer, registry, 'en')
            .fields.find(item => item.key === key)!;
        // Old documents only carry clamp: false -> the editor shows "scale".
        expect(field('action').value).toBe('scale');
        expect(field('clamp')).toBeUndefined();

        // An explicit action wins over the legacy flag.
        designer.updateNodeConfig(node.id, { action: 'wrap' });
        expect(field('action').value).toBe('wrap');
    });

    it('reuses every node and edge view while panning or zooming', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');

        designer.panBy(24, -12);
        const panned = buildWorkflowCanvasModel(designer, registry, 'en', undefined, first);
        expect(panned).not.toBe(first);
        expect(panned.pan).not.toEqual(first.pan);
        expect(panned.nodes).toEqual(first.nodes);
        expect(panned.edges).toEqual(first.edges);
        panned.nodes.forEach((node, index) => expect(node).toBe(first.nodes[index]));
        panned.edges.forEach((edge, index) => expect(edge).toBe(first.edges[index]));

        designer.setZoom(1.25);
        const zoomed = buildWorkflowCanvasModel(designer, registry, 'en', undefined, panned);
        expect(zoomed.zoom).toBe(1.25);
        zoomed.nodes.forEach((node, index) => expect(node).toBe(first.nodes[index]));
        zoomed.edges.forEach((edge, index) => expect(edge).toBe(first.edges[index]));
    });

    it('rebuilds only the moved node and its connected edges', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');

        const position = designer.nodes.find(node => node.id === 'task_1')!.position;
        designer.moveNode('task_1', { x: position.x + 40, y: position.y + 20 });
        const moved = buildWorkflowCanvasModel(designer, registry, 'en', undefined, first);

        const nodeById = (model: typeof first, id: string) => model.nodes.find(node => node.id === id);
        expect(nodeById(moved, 'task_1')).not.toBe(nodeById(first, 'task_1'));
        expect(nodeById(moved, 'task_1')!.x).toBe(position.x + 40);
        expect(nodeById(moved, 'start_1')).toBe(nodeById(first, 'start_1'));
        expect(nodeById(moved, 'condition_1')).toBe(nodeById(first, 'condition_1'));

        const edgeById = (model: typeof first, id: string) => model.edges.find(edge => edge.id === id);
        // conn_1/conn_2 touch task_1; the rest of the graph keeps its views.
        expect(edgeById(moved, 'conn_1')).not.toBe(edgeById(first, 'conn_1'));
        expect(edgeById(moved, 'conn_2')).not.toBe(edgeById(first, 'conn_2'));
        expect(edgeById(moved, 'conn_3')).toBe(edgeById(first, 'conn_3'));
        expect(edgeById(moved, 'conn_6')).toBe(edgeById(first, 'conn_6'));
    });

    it('reuses node views for config and description edits that do not paint', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');

        designer.updateNodeConfig('task_1', { action: 'changed' });
        const configChanged = buildWorkflowCanvasModel(designer, registry, 'en', undefined, first);
        configChanged.nodes.forEach((node, index) => expect(node).toBe(first.nodes[index]));

        designer.updateNode('task_1', { description: 'Visible description' });
        const described = buildWorkflowCanvasModel(designer, registry, 'en', undefined, configChanged);
        expect(described.nodes.find(node => node.id === 'task_1')!.description).toBe('Visible description');
        expect(described.nodes.find(node => node.id === 'task_1')).not.toBe(first.nodes.find(node => node.id === 'task_1'));
        expect(described.nodes.find(node => node.id === 'start_1')).toBe(first.nodes.find(node => node.id === 'start_1'));
    });

    it('rebuilds selected nodes so selection chrome updates without touching the rest', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');

        designer.selectNode('task_2');
        const selected = buildWorkflowCanvasModel(designer, registry, 'en', undefined, first);
        expect(selected.nodes.find(node => node.id === 'task_2')!.selected).toBe(true);
        expect(selected.nodes.find(node => node.id === 'task_2')).not.toBe(first.nodes.find(node => node.id === 'task_2'));
        expect(selected.nodes.find(node => node.id === 'start_1')).toBe(first.nodes.find(node => node.id === 'start_1'));
        // Selecting a node does not select (or repaint) any edge.
        selected.edges.forEach((edge, index) => expect(edge).toBe(first.edges[index]));
    });

    it('projects registry ports for definitions loaded without them', () => {
        // Regression: normalize() used to mutate the assigned definition in
        // place, so identity-keyed model caches kept the pre-normalization
        // projection and nodes rendered without ports.
        const { designer, registry } = createDesigner();
        const before = designer.definition;
        expect(designer.load({
            id: 'loaded-workflow',
            name: 'Loaded workflow',
            nodes: [{
                id: 'only_task',
                type: 'task',
                name: 'Only task',
                position: { x: 40, y: 40 },
                config: {}
            } as any],
            connections: []
        })).toBe(true);
        expect(designer.definition).not.toBe(before);

        const model = buildWorkflowCanvasModel(designer, registry, 'en');
        expect(model.nodes.length).toBe(1);
        expect(model.nodes[0].inputs.length).toBeGreaterThan(0);
        expect(model.nodes[0].outputs.length).toBeGreaterThan(0);
        // The corrected projection stays incremental afterwards.
        const again = buildWorkflowCanvasModel(designer, registry, 'en', undefined, model);
        expect(again.nodes[0]).toBe(model.nodes[0]);
    });

    it('reuses the whole projection for viewport-only changes', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');

        designer.panBy(48, -16);
        designer.setZoom(1.4);
        const viewport = buildWorkflowCanvasViewport(first, designer);

        expect(viewport).not.toBe(first);
        // Same arrays: no node/edge re-projection at all during pan/zoom.
        expect(viewport.nodes).toBe(first.nodes);
        expect(viewport.edges).toBe(first.edges);
        expect(viewport.width).toBe(first.width);
        expect(viewport.height).toBe(first.height);
        expect(viewport.pan).toEqual(designer.pan);
        expect(viewport.zoom).toBe(1.4);
        expect(viewport.gridStyle['--wf-grid-size']).toBe(`${24 * 1.4}px`);
        expect(viewport.gridStyle['--wf-grid-x']).toBe(`${designer.pan.x}px`);
        expect(viewport.gridStyle['--wf-grid-y']).toBe(`${designer.pan.y}px`);
        expect(viewport.draft).toBeUndefined();
        expect(viewport.connecting).toBe(false);
    });

    it('paints the node accent and text color from the node style', () => {
        const { designer, registry } = createDesigner();
        const node = designer.addNode('task', { x: 0, y: 0 })!;
        const first = buildWorkflowCanvasModel(designer, registry, 'en')
            .nodes.find(view => view.id === node.id)!;
        expect(first.attrs.style).toContain(`--wf-accent:${node.style?.backgroundColor}`);
        expect(first.attrs.style).toContain(`--wf-node-text:${node.style?.textColor}`);

        designer.updateNode(node.id, {
            style: { ...(node.style || {}), backgroundColor: '#112233', textColor: '#ffeedd' }
        });
        const next = buildWorkflowCanvasModel(designer, registry, 'en')
            .nodes.find(view => view.id === node.id)!;
        expect(next).not.toBe(first);
        expect(next.attrs.style).toContain('--wf-accent:#112233');
        expect(next.attrs.style).toContain('--wf-node-text:#ffeedd');
    });

    it('reprojects the wire draft from reused node ports while dragging', () => {
        const { designer, registry } = createDesigner();
        const first = buildWorkflowCanvasModel(designer, registry, 'en');
        const output = designer.nodes.find(node => node.id === 'task_1')!.outputs![0];

        expect(designer.beginConnection('task_1', output.id, { x: 240, y: 160 })).toBe(true);
        const dragging = buildWorkflowCanvasViewport(first, designer);
        expect(dragging.nodes).toBe(first.nodes);
        expect(dragging.edges).toBe(first.edges);
        expect(dragging.connecting).toBe(true);
        expect(dragging.connectingSide).toBe('output');
        expect(dragging.draft?.d).toBeTruthy();
        expect(dragging.draft?.attrs.class).toBe('workflow-edge workflow-edge-draft');

        designer.updateConnectionDraft({ x: 360, y: 220 });
        const moved = buildWorkflowCanvasViewport(dragging, designer);
        expect(moved.nodes).toBe(first.nodes);
        expect(moved.draft?.d).not.toBe(dragging.draft?.d);
    });

    it('keeps viewport reuse O(1) in node count', () => {
        const { designer, registry } = createDesigner();
        const nodes = Array.from({ length: 300 }, (_, index) => ({
            id: `n${index}`,
            type: 'task' as const,
            name: `Task ${index}`,
            position: { x: (index % 20) * 260, y: Math.floor(index / 20) * 160 },
            config: { action: 'loadInput', result: { index } }
        }));
        expect(designer.load({
            id: 'bulk',
            name: 'Bulk',
            nodes: nodes as any,
            connections: []
        })).toBe(true);

        const first = buildWorkflowCanvasModel(designer, registry, 'en');
        designer.panBy(12, 8);
        const start = Date.now();
        for (let index = 0; index < 50; index++) {
            buildWorkflowCanvasViewport(first, designer);
        }
        const elapsed = Date.now() - start;
        // The old implementation rebuilt a 300-entry key and re-projected every
        // node per frame (>1s/frame in the browser). Reuse must stay negligible.
        expect(elapsed).toBeLessThan(250);
    });
});
