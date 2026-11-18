import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowDesignerComponent } from '../src/visual/components/workflow-designer.component';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';
import { createDefaultWorkflowDefinition } from '../src/visual/workflow-designer';
import { workflowNodeFrame } from '../src/visual/workflow-geometry';
import { WORKFLOW_ACTION_BUS } from '../src/visual/workflow-action-bus';

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
    const started = Date.now();
    while (!check() && Date.now() - started < timeoutMs) {
        await flush();
    }
}

describe('Workflow Designer UI', () => {
    let ctx: ApplicationContext;
    let ref: ComponentRef<WorkflowDesignerComponent>;
    let root: any;
    let doc: any;

    beforeEach(async () => {
        ctx = await Application.run(WorkflowDesignerComponent, {
            deps: [HtmlTemplateModule, WorkflowModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document;
                }
            }]
        });
        ref = ctx.runners.getRef(WorkflowDesignerComponent) as ComponentRef<WorkflowDesignerComponent>;
        root = ref.hostView.rootNodes[0] as any;
        doc = ctx.get(DOCUMENT);
        await flush();
    });

    afterEach(async () => {
        // Release the JSDOM window (timers/listeners) before dropping the app.
        try {
            (doc?.defaultView as any)?.close?.();
        } catch {
            // already closed
        }
        await ctx?.close();
    });

    it('renders palette, canvas, edges, inspector and status bar', () => {
        expect(root.matches('.workflow-designer')).toBe(true);
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(64);
        expect(root.querySelectorAll('.workflow-node').length).toBe(6);
        expect(root.querySelectorAll('.workflow-edge').length).toBe(6);
        expect(root.querySelector('.workflow-inspector')).toBeTruthy();
        expect(root.querySelector('.workflow-statusbar')).toBeTruthy();
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('运行');
        expect(root.querySelector('.workspace-layout-left workflow-palette')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-center workflow-canvas')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-right workflow-inspector')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-bottom .workflow-statusbar')).toBeFalsy();
        expect(root.querySelector('.workflow-statusbar')?.parentElement?.className).toContain('workflow-designer-preview');
        expect(root.querySelector('.workspace-layout-bottom')?.hasAttribute('hidden')).toBe(true);
        expect(root.querySelectorAll('.workspace-pane').length).toBe(4);
        expect(root.querySelectorAll('.workspace-splitter').length).toBe(3);
    });

    it('creates a broker from the inspector picker and guards deletion of referenced config', async () => {
        const out = ref.instance.designer.addNode('mqtt-out', { x: 320, y: 120 }, {
            config: { topic: 'sensors/temp' }
        })!;
        ref.instance.designer.selectNode(out.id);
        await flush();

        const field = root.querySelector('[data-field-key="mqtt"]');
        expect(field).toBeTruthy();
        const create = field.querySelector('[data-field-action="create"]') as any;
        expect(create).toBeTruthy();
        create.click();
        await flush();

        const dialog = ref.instance.preview!.configDialog!;
        expect(dialog).toBeTruthy();
        expect(dialog.showConfigDialog).toBe(true);
        expect(dialog.configType).toBe('mqtt');
        expect(root.querySelector('.workflow-config-dialog')).toBeTruthy();

        dialog.name = 'prod';
        dialog.values = { url: 'mqtt://prod:1883' };
        dialog.save();
        await flush();

        expect(dialog.showConfigDialog).toBe(false);
        const broker = ref.instance.designer.nodes.find(node => node.type === 'mqtt')!;
        expect(broker).toBeTruthy();
        expect(broker.name).toBe('prod');
        expect(broker.config?.url).toBe('mqtt://prod:1883');
        expect(ref.instance.designer.nodes.find(node => node.id === out.id)?.config?.mqtt).toBe(broker.id);

        // One undo removes both the broker and the binding.
        ref.instance.designer.undo();
        await flush();
        expect(ref.instance.designer.nodes.some(node => node.type === 'mqtt')).toBe(false);
        expect(ref.instance.designer.nodes.find(node => node.id === out.id)?.config?.mqtt).toBeFalsy();

        // Re-create it through the same dialog and check the delete guard.
        dialog.open({ type: 'mqtt', bindTo: { nodeId: out.id, key: 'mqtt' } });
        await flush();
        dialog.name = 'prod';
        dialog.values = { url: 'mqtt://prod:1883' };
        dialog.save();
        await flush();
        const created = ref.instance.designer.nodes.find(node => node.type === 'mqtt')!;

        ref.instance.designer.selectNode(created.id);
        await flush();
        ref.instance.preview!.requestDeleteNodes([created.id]);
        await flush();
        expect(dialog.showDeleteConfirm).toBe(true);
        expect(dialog.deleteConfirmRefs).toEqual([{ id: created.id, name: 'prod', count: 1 }]);
        expect(root.querySelector('.workflow-delete-confirm')).toBeTruthy();
        // Nothing is deleted until the confirmation is accepted.
        expect(ref.instance.designer.nodes.some(node => node.id === created.id)).toBe(true);

        dialog.confirmDelete();
        await flush();
        expect(dialog.showDeleteConfirm).toBe(false);
        expect(ref.instance.designer.nodes.some(node => node.id === created.id)).toBe(false);
        expect(ref.instance.designer.nodes.find(node => node.id === out.id)?.config?.mqtt).toBe(created.id);
        expect(ref.instance.designer.validate().errors.join(' ')).toContain(created.id);
    });

    it('installs the shared stylesheet instead of inline styles', () => {
        const style = doc.getElementById('tsdi-workflow-designer-styles');
        expect(style).toBeTruthy();
        expect(style.textContent).toContain('.workflow-node');
        const node = root.querySelector('.workflow-node');
        expect(node.getAttribute('style') || '').not.toContain('background');
        expect(node.getAttribute('class')).toContain('workflow-node');
    });

    it('pans the grid without restyling the node tree', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        const grid = root.querySelector('.workflow-canvas-grid') as any;
        expect(grid).toBeTruthy();
        // The grid lives on its own layer: restyling the canvas root background
        // would repaint the whole node subtree, and inherited `--wf-grid-*`
        // custom properties would recalc style for every node on each frame.
        expect(canvas.getAttribute('style') || '').not.toContain('--wf-grid');
        expect(canvas.getAttribute('style') || '').not.toContain('background');
        const before = grid.getAttribute('style') || '';
        expect(before).toContain('background-size');
        expect(before).toContain('background-position');

        canvas.dispatchEvent(new (doc.defaultView as any).WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: 24,
            clientX: 10,
            clientY: 10
        }));
        await flush();

        expect(grid.getAttribute('style') || '').not.toBe(before);
        expect(grid.getAttribute('style') || '').toContain('background-position');
        // The node subtree must not be touched by a viewport-only pan.
        const node = root.querySelector('.workflow-node') as any;
        expect(node.getAttribute('style') || '').toContain('left:');
    });

    it('filters palette components by search query', async () => {
        const input = root.querySelector('.workflow-palette-search-input') as any;
        expect(input).toBeTruthy();
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(64);

        input.value = 'http';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        const filtered = Array.from(root.querySelectorAll('.workflow-palette-item')) as any[];
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.length).toBeLessThan(54);
        expect(filtered.every(item => {
            const text = `${item.getAttribute('data-node-type')} ${item.textContent}`.toLowerCase();
            return text.includes('http');
        })).toBe(true);

        input.value = 'zzzz-no-node';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(0);
        expect(root.querySelector('.workflow-palette-empty')?.textContent).toContain('没有匹配');

        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(64);
    });

    it('disables selection actions until something is selected', async () => {
        ref.instance.designer.clearSelection();
        await flush();
        let remove = root.querySelector('.workflow-toolbar .workflow-btn-danger') as any;
        expect(remove.disabled || remove.hasAttribute('disabled')).toBe(true);

        ref.instance.designer.selectNode('task_1');
        await flush();
        remove = root.querySelector('.workflow-toolbar .workflow-btn-danger') as any;
        expect(remove.disabled || remove.hasAttribute('disabled')).toBe(false);
    });

    it('adds a node by clicking a palette component', async () => {
        const item = root.querySelector('.workflow-palette-item[data-node-type="log"]');
        expect(item).toBeTruthy();
        item.click();
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(7);
        expect(root.querySelectorAll('.workflow-node').length).toBe(7);
    });

    it('renders registry ports for a workflow loaded after mount', async () => {
        // Regression: normalization used to mutate the assigned definition in
        // place, so view-model caches keyed on definition identity kept serving
        // the pre-normalization projection. Nodes then rendered without ports
        // until the next interaction recreated the canvas model.
        const loaded = ref.instance.designer.load({
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
        });
        expect(loaded).toBe(true);
        await flush();
        await flush();

        const node = ref.instance.designer.nodes[0];
        expect(node.inputs?.length).toBeGreaterThan(0);
        expect(node.outputs?.length).toBeGreaterThan(0);

        const rendered = root.querySelectorAll('.workflow-node') as any[];
        expect(rendered.length).toBe(1);
        expect(rendered[0].querySelectorAll('.workflow-node-port').length).toBeGreaterThan(0);
    });

    it('renders field placeholders, required markers and grouped sections', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        expect(root.querySelector('workflow-inspector dynamic-form')).toBeTruthy();

        const action = root.querySelector('.workflow-field[data-field-key="action"] input') as any;
        expect(action.getAttribute('placeholder')).toBe('actions.fetch');
        expect((root.querySelector('.workflow-field[data-field-key="action"] .workflow-field-hint') as any)?.textContent)
            .toContain('context.actions');

        const groupTitles = Array.from(root.querySelectorAll('.workflow-field-group-title')).map((item: any) => item.textContent);
        expect(groupTitles).toContain('可靠性');

        ref.instance.designer.addNode('function', { x: 40, y: 40 });
        await flush();
        ref.instance.designer.selectNode('function_1');
        await flush();
        expect(root.querySelector('.workflow-field[data-field-key="code"] .workflow-field-required')).toBeTruthy();
    });

    it('shows conditional fields based on the current operator', async () => {
        ref.instance.designer.selectNode('condition_1');
        await flush();
        const operator = root.querySelector('.workflow-field[data-field-key="operator"] select.workflow-select') as any;
        expect(operator).toBeTruthy();
        expect(operator.value).toBe('truthy');
        expect(operator.querySelectorAll('option').length).toBe(8);
        expect(root.querySelector('.workflow-field[data-field-key="value"]')).toBeFalsy();

        operator.value = 'equals';
        operator.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(root.querySelector('.workflow-field[data-field-key="value"]')).toBeTruthy();
        expect(ref.instance.designer.nodes.find(node => node.id === 'condition_1')?.config?.operator).toBe('equals');

        const truthy = root.querySelector('.workflow-field[data-field-key="operator"] select.workflow-select') as any;
        expect(truthy.value).toBe('equals');
        truthy.value = 'truthy';
        truthy.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'condition_1')?.config?.operator).toBe('truthy');
        expect(root.querySelector('.workflow-field[data-field-key="value"]')).toBeFalsy();
    });

    it('resets a single field and restores all node defaults', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();

        const retry = root.querySelector('.workflow-field[data-field-key="retry"] input') as any;
        retry.value = '7';
        retry.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.retry).toBe(7);

        (root.querySelector('.workflow-field[data-field-key="retry"] .workflow-field-reset') as any).click();
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.retry).toBe(0);

        const action = root.querySelector('.workflow-field[data-field-key="action"] input') as any;
        action.value = 'actions.custom';
        action.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.action === 'actions.custom');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.action).toBe('actions.custom');

        (root.querySelector('.workflow-inspector-restore') as any).click();
        await flush();
        const config = ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config || {};
        expect(config.action).toBeUndefined();
        expect(config.retry).toBe(0);
        expect(config.fail).toBe(false);
        expect((root.querySelector('.workflow-inspector-name') as any).value).toBe('读取输入');
    });

    it('shows an empty state for nodes without editable properties', async () => {
        ref.instance.designer.selectNode('start_1');
        await flush();
        expect((root.querySelector('.workflow-no-fields') as any)?.textContent).toContain('没有可编辑属性');
        expect(root.querySelector('.workflow-inspector-restore')).toBeFalsy();
    });

    it('suggests runtime bindings and host environment variables to function code', async () => {
        const preview = ref.instance.preview!;
        preview.runContext = {
            variables: { orderId: 'A-1', total: 3 },
            services: {},
            featureFlag: true
        };
        await flush();
        const suggestions = preview.codeSuggestions;
        // Runtime bindings available to the async function body.
        expect(suggestions).toContain('context');
        expect(suggestions).toContain('input');
        expect(suggestions).toContain('msg');
        expect(suggestions).toContain('context.inbound');
        expect(suggestions).toContain('context.services');
        expect(suggestions).toContain('context.workflowStatus');
        expect(suggestions).toContain('process.env');
        // Host environment (runContext) variables complete under context.
        expect(suggestions).toContain('context.featureFlag');
        expect(suggestions).toContain('context.variables.orderId');
        expect(suggestions).toContain('context.variables.total');
        expect(suggestions).toContain('input.variables.orderId');
    });

    it('refreshes property values when switching nodes of the same type', async () => {
        const second = ref.instance.designer.addNode('task', { x: 40, y: 40 })!;
        await flush();
        let input = root.querySelector('.workflow-inspector-name') as any;
        expect(input.value).toBe(second.name);

        input.value = 'Second task';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        // Text edits are committed after a short burst, not per keystroke.
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === second.id)?.name === 'Second task');
        expect(ref.instance.designer.nodes.find(node => node.id === second.id)?.name).toBe('Second task');

        ref.instance.designer.selectNode('task_1');
        await flush();
        input = root.querySelector('.workflow-inspector-name') as any;
        expect(input.value).toBe('读取输入');

        ref.instance.designer.selectNode(second.id);
        await flush();
        input = root.querySelector('.workflow-inspector-name') as any;
        expect(input.value).toBe('Second task');
    });

    it('keeps inspector edits mounted across viewport-only renders', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const input = root.querySelector('.workflow-inspector-name') as any;
        expect(input).toBeTruthy();
        input.value = 'Edited while panning';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === 'Edited while panning');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('Edited while panning');

        ref.instance.designer.panBy(24, 12);
        await flush();
        const after = root.querySelector('.workflow-inspector-name') as any;
        expect(after).toBe(input);
        expect(after.value).toBe('Edited while panning');
    });

    it('places palette nodes without overlapping existing nodes', async () => {
        for (let index = 0; index < 4; index++) {
            (root.querySelector('.workflow-palette-item[data-node-type="log"]') as any).click();
            await flush();
        }
        const nodes = ref.instance.designer.nodes;
        expect(nodes.length).toBe(10);
        for (let a = 0; a < nodes.length; a++) {
            for (let b = a + 1; b < nodes.length; b++) {
                const dx = Math.abs(nodes[a].position.x - nodes[b].position.x);
                const dy = Math.abs(nodes[a].position.y - nodes[b].position.y);
                expect(dx >= 184 || dy >= 64).toBe(true);
            }
        }
    });

    it('fits the view and falls back to the origin without a measurable canvas', async () => {
        ref.instance.designer.setZoom(2);
        ref.instance.designer.pan = { x: 200, y: 120 };
        ref.instance.fitView();
        await flush();
        expect(ref.instance.designer.zoom).toBe(1);
        expect(ref.instance.designer.pan).toEqual({ x: 0, y: 0 });
    });

    it('selects a node and edits it through the inspector', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const input = root.querySelector('.workflow-inspector-name');
        expect(input).toBeTruthy();
        expect(input.value).toBe('读取输入');

        input.value = '重命名任务';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === '重命名任务');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('重命名任务');
    });

    it('edits node icon and color through the inspector appearance section', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();

        const icon = root.querySelector('.workflow-inspector-icon') as HTMLInputElement;
        const color = root.querySelector('.workflow-inspector-color') as HTMLInputElement;
        expect(icon).toBeTruthy();
        expect(color).toBeTruthy();

        icon.value = '★';
        icon.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        color.value = '#112233';
        color.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        // The color is a discrete field: it flushes the pending icon text burst.
        await waitFor(() => ref.instance.designer.nodes.find(item => item.id === 'task_1')?.style?.icon === '★');

        const node = ref.instance.designer.nodes.find(item => item.id === 'task_1');
        expect(node?.style?.icon).toBe('★');
        expect(node?.style?.backgroundColor).toBe('#112233');
    });

    it('edits typed value references from the inspector', async () => {
        const node = ref.instance.designer.addNode('http-request', { x: 40, y: 40 })!;
        ref.instance.designer.selectNode(node.id);
        await flush();

        let field = root.querySelector('.workflow-field[data-field-key="url"]') as any;
        const typeSelect = field.querySelector('.workflow-field-value-type') as any;
        expect(typeSelect).toBeTruthy();
        typeSelect.value = 'msg';
        typeSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();

        field = root.querySelector('.workflow-field[data-field-key="url"]') as any;
        const input = field.querySelector('input') as any;
        expect(input.value).toBe('msg.');
        input.value = 'payload.endpoint';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 420));

        const updated = ref.instance.designer.nodes.find(item => item.id === node.id)!;
        expect(updated.config?.url).toBe('msg.payload.endpoint');
        expect(root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-error')).toBeFalsy();

        const literalSelect = root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-value-type') as any;
        literalSelect.value = 'literal';
        literalSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        const literalInput = root.querySelector('.workflow-field[data-field-key="url"] input') as any;
        literalInput.value = 'https://example.com/api';
        literalInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 420));
        expect(ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.url)
            .toBe('https://example.com/api');
    });

    it('disables a node from the inspector and marks it on the canvas', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();

        let enabled = root.querySelector('.workflow-field[data-field-key="enabled"] input') as any;
        expect(enabled.checked).toBe(true);
        enabled.checked = false;
        enabled.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();

        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(true);
        expect(root.querySelector('.workflow-node[data-node-id="task_1"]')?.classList.contains('is-disabled')).toBe(true);

        enabled = root.querySelector('.workflow-field[data-field-key="enabled"] input') as any;
        expect(enabled.checked).toBe(false);
        enabled.checked = true;
        enabled.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();

        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(false);
        expect(root.querySelector('.workflow-node[data-node-id="task_1"]')?.classList.contains('is-disabled')).toBe(false);
    });

    it('inserts a quick-added node onto an existing wire', async () => {
        const edge = root.querySelector('.workflow-edge-hit[data-edge-id="conn_2"]') as any;
        edge.dispatchEvent(new (doc.defaultView as any).MouseEvent('dblclick', {
            bubbles: true, cancelable: true
        }));
        await flush();
        expect(root.querySelector('.workflow-quick-add')).toBeTruthy();

        const input = root.querySelector('.workflow-quick-add-input') as any;
        input.value = 'log';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true
        }));
        await flush();

        const nodes = ref.instance.designer.nodes;
        const connections = ref.instance.designer.connections;
        const log = nodes.find(node => node.type === 'log')!;
        expect(nodes.length).toBe(7);
        expect(connections.length).toBe(7);
        expect(connections.some(item => item.id === 'conn_2')).toBe(false);
        expect(connections.some(item =>
            item.sourceNodeId === 'task_1' && item.targetNodeId === log.id
        )).toBe(true);
        expect(connections.some(item =>
            item.sourceNodeId === log.id && item.targetNodeId === 'condition_1'
        )).toBe(true);
    });

    it('quick-adds a node through the search overlay', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'k', ctrlKey: true, bubbles: true
        }));
        await flush();
        expect(root.querySelector('.workflow-quick-add')).toBeTruthy();

        const input = root.querySelector('.workflow-quick-add-input') as any;
        input.value = 'log';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(root.querySelector('.workflow-quick-add-item[data-node-type="log"]')).toBeTruthy();

        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true
        }));
        await flush();

        expect(root.querySelector('.workflow-quick-add')).toBeFalsy();
        expect(ref.instance.designer.nodes.some(node => node.type === 'log')).toBe(true);
    });

    it('shows the webhook URL for HTTP in nodes', async () => {
        const node = ref.instance.designer.addNode('http-in', { x: 40, y: 40 })!;
        ref.instance.designer.updateNodeConfig(node.id, { path: '/orders' });
        ref.instance.designer.selectNode(node.id);
        await flush();

        const url = root.querySelector('.workflow-inspector-webhook-url') as any;
        expect(url?.textContent).toContain('/api/workflows/');
        expect(url?.textContent).toContain('/hook/orders');
        const label = root.querySelector('.workflow-inspector-webhook-label') as any;
        expect(label?.textContent).toContain('Webhook');

        ref.instance.designer.selectNode('task_1');
        await flush();
        expect(root.querySelector('.workflow-inspector-webhook')).toBeFalsy();
    });

    it('opens a node context menu for enable, duplicate and delete', async () => {
        const openMenu = async () => {
            const canvasNode = root.querySelector('.workflow-node[data-node-id="task_1"]') as any;
            canvasNode.dispatchEvent(new (doc.defaultView as any).MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 160,
                clientY: 120
            }));
            await flush();
        };

        await openMenu();
        expect(root.querySelector('.workflow-node-menu')).toBeTruthy();
        let items = root.querySelectorAll('.workflow-node-menu-item');
        expect(items.length).toBe(3);
        expect((items[0] as any).textContent).toContain('禁用节点');

        (items[0] as any).click();
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(true);
        expect(root.querySelector('.workflow-node-menu')).toBeFalsy();

        await openMenu();
        items = root.querySelectorAll('.workflow-node-menu-item');
        expect((items[0] as any).textContent).toContain('启用节点');
        (items[0] as any).click();
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(false);

        const beforeDuplicate = ref.instance.designer.nodes.length;
        await openMenu();
        (root.querySelectorAll('.workflow-node-menu-item')[1] as any).click();
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(beforeDuplicate + 1);

        await openMenu();
        const opened = root.querySelectorAll('.workflow-node-menu-item')[2] as any;
        opened.click();
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')).toBeFalsy();
        expect(root.querySelector('.workflow-node-menu')).toBeFalsy();

    });

    it('toggles node state with Ctrl+E and closes the context menu with Escape', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        ref.instance.designer.selectNode('task_1');
        await flush();

        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'e', ctrlKey: true, bubbles: true
        }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(true);

        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'e', ctrlKey: true, bubbles: true
        }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(false);

        const canvasNode = root.querySelector('.workflow-node[data-node-id="task_1"]') as any;
        canvasNode.dispatchEvent(new (doc.defaultView as any).MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, clientX: 120, clientY: 90
        }));
        await flush();
        expect(root.querySelector('.workflow-node-menu')).toBeTruthy();

        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Escape', bubbles: true
        }));
        await flush();
        expect(root.querySelector('.workflow-node-menu')).toBeFalsy();
    });

    it('copies and pastes nodes with Ctrl+C, Ctrl+X and Ctrl+V', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        ref.instance.designer.selectNode('task_1');
        await flush();
        const before = ref.instance.designer.nodes.length;

        const shortcut = (key: string) => canvas.dispatchEvent(
            new (doc.defaultView as any).KeyboardEvent('keydown', {
                key, ctrlKey: true, bubbles: true
            })
        );

        shortcut('c');
        shortcut('v');
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(before + 1);
        expect(ref.instance.designer.selectedNode?.id).not.toBe('task_1');

        shortcut('x');
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(before);

        shortcut('v');
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(before + 1);
    });

    it('selects multiple nodes with shift-click and applies bulk operations', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();

        const second = root.querySelector('.workflow-node[data-node-id="task_2"]') as any;
        second.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousedown', {
            bubbles: true, shiftKey: true, clientX: 900, clientY: 150
        }));
        second.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseup', {
            bubbles: true, clientX: 900, clientY: 150
        }));
        await flush();

        expect(ref.instance.designer.selectedNodeIds.sort()).toEqual(['task_1', 'task_2']);
        expect(root.querySelectorAll('.workflow-node.is-selected').length).toBe(2);
        expect(root.querySelector('.workflow-status-selected')?.textContent).toContain('已选择 2 个节点');

        const canvas = root.querySelector('.workflow-canvas') as any;
        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'e', ctrlKey: true, bubbles: true
        }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.disabled).toBe(true);
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_2')?.disabled).toBe(true);
        expect(root.querySelectorAll('.workflow-node.is-disabled').length).toBe(2);

        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Delete', bubbles: true
        }));
        await flush();
        expect(ref.instance.designer.nodes.some(node => node.id === 'task_1')).toBe(false);
        expect(ref.instance.designer.nodes.some(node => node.id === 'task_2')).toBe(false);
        expect(ref.instance.designer.selectionCount).toBe(0);
    });

    it('collapses and expands node groups', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        ref.instance.designer.selectNodes(['task_1', 'task_2']);
        await flush();
        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'g', ctrlKey: true, bubbles: true
        }));
        await flush();

        const group = root.querySelector('.workflow-group[data-group-id]') as any;
        expect(group).toBeTruthy();
        const before = root.querySelectorAll('.workflow-canvas-nodes .workflow-node').length;
        (group.querySelector('.workflow-group-toggle') as any).click();
        await flush();
        expect(root.querySelector('.workflow-group')?.classList.contains('is-collapsed')).toBe(true);
        expect(root.querySelectorAll('.workflow-canvas-nodes .workflow-node').length).toBe(before - 2);

        (root.querySelector('.workflow-group-toggle') as any).click();
        await flush();
        expect(root.querySelector('.workflow-group')?.classList.contains('is-collapsed')).toBe(false);
        expect(root.querySelectorAll('.workflow-canvas-nodes .workflow-node').length).toBe(before);
    });

    it('renames and recolors a group from its settings dialog', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        ref.instance.designer.selectNodes(['task_1', 'task_2']);
        await flush();
        canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'g', ctrlKey: true, bubbles: true
        }));
        await flush();

        const title = root.querySelector('.workflow-group-title') as any;
        title.dispatchEvent(new (doc.defaultView as any).MouseEvent('dblclick', { bubbles: true }));
        await flush();
        expect(root.querySelector('.workflow-group-settings')).toBeTruthy();

        const nameInput = root.querySelector('.workflow-group-name-input') as any;
        nameInput.value = 'Review';
        nameInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        const colorInput = root.querySelector('.workflow-group-color-input') as any;
        colorInput.value = '#ef4444';
        colorInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        (root.querySelector('.workflow-group-save') as any).click();
        await flush();

        const group = ref.instance.designer.groups[0];
        expect(group.name).toBe('Review');
        expect(group.color).toBe('#ef4444');
        expect(root.querySelector('.workflow-group-title')?.textContent).toContain('Review');
        expect((root.querySelector('.workflow-group') as any).getAttribute('style')).toContain('#ef4444');
        expect(root.querySelector('.workflow-group-settings')).toBeFalsy();
    });

    it('inserts a dropped node on an existing wire', async () => {
        const beforeNodes = ref.instance.designer.nodes.length;
        const beforeConnections = ref.instance.designer.connections.length;
        // conn_2 runs from task_1's output (330+184, 263) to condition_1's input (590, 263).
        ref.instance.handleCanvas({ type: 'drop', nodeType: 'log', world: { x: 552, y: 263 } } as any);
        await flush();

        expect(ref.instance.designer.nodes.length).toBe(beforeNodes + 1);
        expect(ref.instance.designer.connections.length).toBe(beforeConnections + 1);
        const inserted = ref.instance.designer.nodes.find(node => node.type === 'log')!;
        expect(ref.instance.designer.connections.some(connection =>
            connection.sourceNodeId === inserted.id && connection.targetNodeId === 'condition_1'
        )).toBe(true);
        expect(ref.instance.designer.connections.some(connection =>
            connection.sourceNodeId === 'task_1' && connection.targetNodeId === inserted.id
        )).toBe(true);

        ref.instance.handleCanvas({ type: 'drop', nodeType: 'log', world: { x: 1200, y: 640 } } as any);
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(beforeNodes + 2);
        expect(ref.instance.designer.connections.length).toBe(beforeConnections + 1);
    });

    it('creates, moves and removes node groups', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        const keydown = (key: string, shiftKey = false) => canvas.dispatchEvent(
            new (doc.defaultView as any).KeyboardEvent('keydown', {
                key, ctrlKey: true, shiftKey, bubbles: true
            })
        );

        ref.instance.designer.selectNodes(['task_1', 'task_2']);
        await flush();
        keydown('g');
        await flush();

        let group = root.querySelector('.workflow-group[data-group-id]') as any;
        expect(group).toBeTruthy();
        expect(group.textContent).toContain('Group 1');

        const beforeTask2 = ref.instance.designer.nodes.find(node => node.id === 'task_2')!.position.x;
        const title = group.querySelector('.workflow-group-title') as any;
        title.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousedown', {
            bubbles: true, clientX: 100, clientY: 100
        }));
        canvas.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousemove', {
            bubbles: true, clientX: 140, clientY: 130
        }));
        canvas.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseup', {
            bubbles: true, clientX: 140, clientY: 130
        }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_2')!.position.x)
            .toBeGreaterThan(beforeTask2);

        keydown('G', true);
        await flush();
        expect(root.querySelector('.workflow-group')).toBeFalsy();
        expect(ref.instance.designer.nodes.some(node => node.id === 'task_1')).toBe(true);

        ref.instance.designer.selectNodes(['task_1', 'task_2']);
        keydown('g');
        await flush();
        group = root.querySelector('.workflow-group[data-group-id]') as any;
        (group.querySelector('.workflow-group-remove') as any).click();
        await flush();
        expect(root.querySelector('.workflow-group')).toBeFalsy();
        expect(ref.instance.designer.nodes.some(node => node.id === 'task_2')).toBe(true);
    });

    it('shows an alignment bar for multi-selection and aligns nodes', async () => {
        ref.instance.designer.selectNodes(['task_1', 'task_2', 'task_3']);
        await flush();

        const bar = root.querySelector('.workflow-align-bar') as any;
        expect(bar).toBeTruthy();
        expect(bar.querySelectorAll('.workflow-align-button').length).toBe(8);

        (bar.querySelector('[data-align="left"]') as any).click();
        await flush();
        const positions = ['task_1', 'task_2', 'task_3'].map(id =>
            ref.instance.designer.nodes.find(node => node.id === id)!.position.x
        );
        expect(new Set(positions).size).toBe(1);

        ref.instance.designer.selectNode('task_1');
        await flush();
        expect(root.querySelector('.workflow-align-bar')).toBeFalsy();
    });

    it('box-selects nodes with shift+drag', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        canvas.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousedown', {
            bubbles: true, cancelable: true, shiftKey: true, clientX: 70, clientY: 200
        }));
        canvas.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousemove', {
            bubbles: true, clientX: 500, clientY: 300
        }));
        await flush();
        expect(root.querySelector('.workflow-selection-box')).toBeTruthy();

        canvas.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseup', {
            bubbles: true, clientX: 500, clientY: 300
        }));
        await flush();

        expect(ref.instance.designer.selectedNodeIds.sort()).toEqual(['start_1', 'task_1']);
        expect(root.querySelector('.workflow-selection-box')).toBeFalsy();
        expect(root.querySelectorAll('.workflow-node.is-selected').length).toBe(2);
    });

    it('loads persisted run history when opening a saved workflow', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const saved = createDefaultWorkflowDefinition(ref.instance.designer.registry, 'en');
        saved.id = 'history-flow';
        saved.name = 'History flow';
        await store.save(saved);
        const snapshot = {
            executionId: 'exec_history_1',
            workflowId: 'history-flow',
            status: 'completed',
            startTime: Date.now() - 5000,
            endTime: Date.now() - 4800,
            nodeStates: {},
            edgeStates: {},
            activeNodeIds: [],
            logs: []
        };
        (store as any).listExecutions = async (workflowId: string) =>
            workflowId === 'history-flow' ? [snapshot] : [];
        ref.instance.store = store;

        expect(await ref.instance.openWorkflowTab('history-flow')).toBe(true);
        await waitFor(() => ref.instance.designer.executionHistory.length === 1);

        expect(ref.instance.designer.executionHistory[0].executionId).toBe('exec_history_1');
        const chip = root.querySelector('.workflow-run-chip[data-execution-id="exec_history_1"]') as any;
        expect(chip).toBeTruthy();

        chip.click();
        await flush();
        expect(ref.instance.designer.selectedExecutionId).toBe('exec_history_1');
    });

    it('validates inspector input through the forms module before applying it', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const input = root.querySelector('.workflow-inspector-name') as any;
        expect(input.value).toBe('读取输入');

        input.value = '';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 0));
        await waitFor(() => !!root.querySelector('.workflow-field-error'));

        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('读取输入');
        const invalidInput = root.querySelector('.workflow-inspector-name') as any;
        expect(invalidInput.getAttribute('aria-invalid')).toBe('true');
        expect(root.querySelector('.workflow-field-error')?.textContent).toContain('必填');

        invalidInput.value = '校验后的名称';
        invalidInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === '校验后的名称');

        expect((root.querySelector('.workflow-inspector-name') as any).getAttribute('aria-invalid')).toBe('false');
        expect(root.querySelector('.workflow-field-error')).toBeFalsy();
    });

    it('builds node config validation into the dynamic form', async () => {
        const node = ref.instance.designer.addNode('http-request', { x: 40, y: 40 })!;
        await flush();
        ref.instance.designer.selectNode(node.id);
        await flush();

        const urlInput = root.querySelector('.workflow-field[data-field-key="url"] input') as any;
        expect(urlInput.type).toBe('url');
        expect(root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-required')).toBeTruthy();

        urlInput.value = '';
        urlInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 0));
        await waitFor(() => !!root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-error'));
        expect(root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-error')?.textContent).toContain('必填');

        const invalid = root.querySelector('.workflow-field[data-field-key="url"] input') as any;
        invalid.value = 'not a url';
        invalid.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 0));
        await waitFor(() => {
            const error = root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-error')?.textContent || '';
            return error.length > 0 && !error.includes('必填');
        });

        const valid = root.querySelector('.workflow-field[data-field-key="url"] input') as any;
        valid.value = 'https://example.com/api';
        valid.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() =>
            ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.url === 'https://example.com/api'
        );
        expect(root.querySelector('.workflow-field[data-field-key="url"] .workflow-field-error')).toBeFalsy();
    });

    it('edits list fields declared by node metadata', async () => {
        const node = ref.instance.designer.addNode('change', { x: 40, y: 40 })!;
        await flush();
        ref.instance.designer.selectNode(node.id);
        await flush();

        expect(root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list')).toBeTruthy();
        (root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-add') as any).click();
        await flush();
        expect(root.querySelectorAll('.workflow-field[data-field-key="rules"] .workflow-list-row').length).toBe(1);

        const field = root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-row [data-field-key="field"] input') as any;
        expect(field).toBeTruthy();
        field.value = 'variables.name';
        field.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules?.[0]?.field === 'variables.name');
        expect(ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules?.[0]?.field).toBe('variables.name');

        const action = root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-row [data-field-key="action"] select.workflow-select') as any;
        expect(action).toBeTruthy();
        expect(action.value).toBe('set');
        expect(action.querySelectorAll('option').length).toBe(3);
        action.value = 'append';
        action.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules?.[0]?.action).toBe('append');
    });

    it('edits typed values inside list fields', async () => {
        const node = ref.instance.designer.addNode('switch', { x: 40, y: 40 })!;
        ref.instance.designer.selectNode(node.id);
        await flush();

        (root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-add') as any).click();
        await flush();
        const row = root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-row') as any;
        const typeSelect = row.querySelector('[data-field-key="value"] .workflow-field-value-type') as any;
        expect(typeSelect).toBeTruthy();
        typeSelect.value = 'msg';
        typeSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();

        const input = root.querySelector('.workflow-field[data-field-key="rules"] .workflow-list-row [data-field-key="value"] input') as any;
        input.value = 'payload.status';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();

        const rules = ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules;
        expect(rules?.[0]?.value).toBe('msg.payload.status');
    });

    it('renders unit suffixes from node field metadata', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const unit = root.querySelector('.workflow-field[data-field-key="timeout"] .workflow-input-unit');
        expect(unit?.textContent).toBe('ms');
        expect(root.querySelector('.workflow-field[data-field-key="timeout"] .workflow-input-wrap')?.className)
            .toContain('has-unit');
        expect(root.querySelector('.workflow-fields')).toBeTruthy();
        expect(root.querySelector('.workflow-field[data-field-key="timeout"]')?.className).toContain('is-full');
        expect(root.querySelector('.workflow-field[data-field-key="action"]')?.className).toContain('is-full');
    });

    it('edits JSON node config through key/value rows', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const field = root.querySelector('.workflow-field[data-field-key="result"]') as any;
        expect(field.querySelectorAll('.workflow-keyvalue-row').length).toBe(1);
        const valueInput = field.querySelector('.workflow-keyvalue-value') as any;
        valueInput.value = 'false';
        valueInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => JSON.stringify(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.result) === '{"approved":false}');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.config?.result).toEqual({ approved: false });

        (field.querySelector('.workflow-field-mode') as any).click();
        await flush();
        expect(root.querySelector('.workflow-field[data-field-key="result"] textarea')).toBeTruthy();
    });


    it('shows execution state on nodes and edges after running', async () => {
        const result = await ref.instance.designer.run({ context: { approved: true } });
        expect(result.success).toBe(true);
        await flush();

        const approve = root.querySelector('.workflow-node[data-node-id="task_2"]');
        const reject = root.querySelector('.workflow-node[data-node-id="task_3"]');
        expect(approve?.getAttribute('data-status')).toBe('success');
        expect(reject?.getAttribute('data-status')).toBe('skipped');
        expect(root.querySelectorAll('.workflow-edge[data-status="traversed"]').length).toBeGreaterThanOrEqual(4);
        expect(root.querySelectorAll('.workflow-edge[data-status="skipped"]').length).toBeGreaterThanOrEqual(1);
        expect(root.querySelector('.workflow-statusbar').textContent).toContain('已完成');
    });

    it('runs through the toolbar action', async () => {
        ref.instance.toolbarAction('run');
        await waitFor(() => ref.instance.designer.running === false && !!ref.instance.designer.execution);
        await flush();
        expect(ref.instance.designer.execution?.status).toBe('completed');
        expect(root.querySelector('.workflow-node[data-node-id="task_2"]')?.getAttribute('data-status')).toBe('success');
    });

    it('switches labels through the @tsdi/i18n translator', async () => {
        ref.instance.locale = 'en';
        await flush();
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('Run');
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('nodes');
    });

    it('switches visible themes from the menu selection API', async () => {
        const designer = root.matches?.('.workflow-designer') ? root : root.querySelector('.workflow-designer');
        expect(designer.getAttribute('data-theme')).toBe('light');
        ref.instance.setTheme('dark');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('dark');
        expect(ref.instance.themeName).toBe('dark');
        ref.instance.setTheme('solarized');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('solarized');
        ref.instance.setTheme('high-contrast');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('high-contrast');
        ref.instance.setTheme('light');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('light');
    });

    it('applies theme and language selected through the menu action bus', async () => {
        const designer = root.matches?.('.workflow-designer') ? root : root.querySelector('.workflow-designer');
        WORKFLOW_ACTION_BUS.emit('theme:dark');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('dark');
        expect(ref.instance.themeName).toBe('dark');

        WORKFLOW_ACTION_BUS.emit('theme:high-contrast');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('high-contrast');

        WORKFLOW_ACTION_BUS.emit('language:en');
        await flush();
        expect(ref.instance.locale).toBe('en');

        WORKFLOW_ACTION_BUS.emit('theme:light');
        await flush();
        expect(designer.getAttribute('data-theme')).toBe('light');
    });

    it('opens saved workflows as tabs and creates/closes documents from the tab bar', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const first = createDefaultWorkflowDefinition(ref.instance.designer.registry, 'en');
        first.id = 'flow-a';
        first.name = 'Flow A';
        const second = createDefaultWorkflowDefinition(ref.instance.designer.registry, 'en');
        second.id = 'flow-b';
        second.name = 'Flow B';
        await store.save(first);
        await store.save(second);
        ref.instance.store = store;

        const changes: Array<{ openIds: string[]; activeId?: string }> = [];
        ref.instance.tabChangeAction = state => changes.push(state);

        expect(await ref.instance.restoreWorkflowTabs(['flow-a', 'flow-b'], 'flow-b')).toBe(true);
        await flush();
        expect(ref.instance.openWorkflowCount).toBe(2);
        expect(ref.instance.designer.definition.id).toBe('flow-b');
        const tabs = Array.from(root.querySelectorAll('.workflow-tabs .tab')) as any[];
        expect(tabs.length).toBe(2);
        expect(tabs.map(tab => tab.textContent).join(' ')).toContain('Flow A');
        expect(tabs.map(tab => tab.textContent).join(' ')).toContain('Flow B');
        expect(tabs.find(tab => tab.getAttribute('aria-selected') === 'true')?.textContent).toContain('Flow B');
        expect(root.querySelector('.workflow-tabs .tab-new')).toBeTruthy();

        (tabs[0] as any).click();
        await flush();
        expect(ref.instance.designer.definition.id).toBe('flow-a');
        expect(ref.instance.workflowTabSource.items.find(item => item.active)?.label).toBe('Flow A');

        (root.querySelector('.workflow-tabs .tab-new') as any).click();
        await flush();
        expect(ref.instance.openWorkflowCount).toBe(3);
        expect(ref.instance.designer.definition.id.startsWith('workflow_')).toBe(true);
        expect(ref.instance.designer.nodes.length).toBe(0);
        expect(ref.instance.designer.connections.length).toBe(0);
        expect(root.querySelector('.workflow-canvas-empty')).toBeTruthy();

        const activeTab = (Array.from(root.querySelectorAll('.workflow-tabs .tab')) as any[])
            .find(tab => tab.getAttribute('aria-selected') === 'true') as any;
        (activeTab.querySelector('.tab-close') as any).click();
        await flush();
        expect(ref.instance.openWorkflowCount).toBe(2);
        expect(ref.instance.designer.definition.id).toBe('flow-b');
        expect(changes.some(state => state.openIds.length === 2 && state.activeId === 'flow-b')).toBe(true);
    });

    it('renames the active workflow from the menu action and updates its tab', async () => {
        ref.instance.toolbarAction('rename');
        await flush();
        expect(root.querySelector('.workflow-rename')).toBeTruthy();
        const input = root.querySelector('.workflow-rename-input') as any;
        expect(input.value).toBe(ref.instance.designer.definition.name);

        input.value = '   ';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.workflow-rename .workflow-btn-primary') as any).click();
        await flush();
        expect(root.querySelector('.workflow-rename-error')?.textContent).toContain('名称');
        expect(root.querySelector('.workflow-rename')).toBeTruthy();

        input.value = 'Renamed Flow';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.workflow-rename .workflow-btn-primary') as any).click();
        await flush();
        expect(ref.instance.designer.definition.name).toBe('Renamed Flow');
        expect(ref.instance.designer.dirty).toBe(true);
        expect(root.querySelector('.workflow-rename')).toBeFalsy();
        expect(ref.instance.workflowTabSource.items[0].label).toBe('Renamed Flow');
        expect(root.querySelector('.workflow-tabs .tab')?.textContent).toContain('Renamed Flow');

        ref.instance.toolbarAction('rename');
        await flush();
        (root.querySelector('.workflow-rename .workflow-rename-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-rename')).toBeFalsy();
        expect(ref.instance.designer.definition.name).toBe('Renamed Flow');
    });

    it('themes the rename dialog from the designer theme tokens', async () => {
        ref.instance.toolbarAction('rename');
        await flush();
        const panel = root.querySelector('.workflow-rename-panel') as any;
        expect(panel).toBeTruthy();

        const css = doc.getElementById('tsdi-workflow-designer-styles').textContent;
        // The dialog must not keep the light-only literals it was born with:
        // surface/border/text/input/focus/error all come from theme tokens.
        expect(css).toMatch(/\.workflow-rename-panel\s*{[^}]*var\(--wf-theme-surface/);
        expect(css).toMatch(/\.workflow-rename-panel\s*{[^}]*var\(--wf-theme-border/);
        expect(css).toMatch(/\.workflow-rename-title\s*{[^}]*var\(--wf-theme-text/);
        expect(css).toMatch(/\.workflow-rename-input\s*{[^}]*var\(--wf-theme-input/);
        expect(css).toMatch(/\.workflow-rename-input\s*{[^}]*var\(--wf-theme-text/);
        expect(css).toMatch(/\.workflow-rename-input:focus\s*{[^}]*var\(--wf-theme-focus-ring/);
        expect(css).toMatch(/\.workflow-rename-error\s*{[^}]*var\(--wf-theme-danger/);
        // Every non-light theme overrides the dialog surface/scrim tokens.
        ['dark', 'solarized', 'high-contrast'].forEach(theme => {
            expect(css).toMatch(
                new RegExp(`\\[data-theme="${theme}"\\]\\s*{[^}]*--wf-theme-overlay`));
            expect(css).toMatch(
                new RegExp(`\\[data-theme="${theme}"\\]\\s*{[^}]*--wf-theme-shadow`));
        });
    });

    it('renders a uniform shared icon on every toolbar action', () => {
        const toolbar = root.querySelector('.workflow-toolbar');
        const run = toolbar.querySelector('.workflow-btn-primary') as any;
        const runIcon = run.querySelector('icon.workflow-btn-icon') as any;
        expect(runIcon).toBeTruthy();
        expect(runIcon.getAttribute('data-icon')).toBe('run');
        expect(runIcon.querySelector('svg').getAttribute('viewBox')).toBe('0 0 16 16');
        expect(run.textContent).toContain('运行');
        const iconButtons = Array.from(toolbar.querySelectorAll('.workflow-btn')) as any[];
        expect(iconButtons.filter(button => button.querySelector('icon.workflow-btn-icon')).length)
            .toBe(iconButtons.length);
        const viewBoxes = iconButtons.map(button =>
            button.querySelector('icon.workflow-btn-icon svg').getAttribute('viewBox'));
        expect(Array.from(new Set(viewBoxes))).toEqual(['0 0 16 16']);
        // The shared stylesheet gives every icon the same rendered size.
        expect(doc.getElementById('tsdi-workflow-designer-styles').textContent)
            .toContain('.workflow-btn-icon');
        expect(doc.getElementById('tsdi-workflow-designer-styles').textContent)
            .toContain('width: 13px');
        expect(doc.getElementById('tsdi-icon-styles')).toBeTruthy();
    });

    it('renders node and palette icons through the shared icon directive', () => {
        const paletteIcon = root.querySelector('.workflow-palette-item[data-node-type="task"] .workflow-palette-icon icon') as any;
        expect(paletteIcon).toBeTruthy();
        expect(paletteIcon.getAttribute('data-icon')).toBe('task');
        expect(paletteIcon.querySelector('svg')).toBeTruthy();

        const nodeIcon = root.querySelector('.workflow-node[data-node-type="start"] .workflow-node-icon icon') as any;
        expect(nodeIcon).toBeTruthy();
        expect(nodeIcon.getAttribute('data-icon')).toBe('start');
        expect(nodeIcon.querySelector('svg path').getAttribute('fill')).toBe('currentColor');
    });

    it('opens the generated workflow JSON panel', async () => {
        ref.instance.toggleJson();
        await flush();
        expect(root.querySelector('.workflow-json-panel')).toBeTruthy();
        expect(ref.instance.jsonText).toContain('workflow_demo');
        expect(ref.instance.jsonText).toContain('"connections"');
    });

    it('keeps run history chips and replays an older execution', async () => {
        const first = await ref.instance.designer.run({ context: { approved: true } });
        await flush();
        const firstId = first.data?.executionId as string;
        await ref.instance.designer.run({ context: { approved: true } });
        await flush();

        const chips = root.querySelectorAll('.workflow-run-chip');
        expect(chips.length).toBe(2);
        chips[chips.length - 1].click();
        await flush();
        expect(ref.instance.designer.selectedExecutionId).toBe(firstId);
        expect(ref.instance.designer.execution?.executionId).toBe(firstId);
    });

    it('selects edges by clicking the visual path', async () => {
        const result = await ref.instance.designer.run({ context: { approved: true } });
        expect(result.success).toBe(true);
        await flush();
        const edge = root.querySelector('.workflow-edge-hit[data-edge-id="conn_3"]');
        expect(edge).toBeTruthy();
        edge.dispatchEvent(new (doc.defaultView as any).MouseEvent('click', { bubbles: true }));
        await flush();
        expect(ref.instance.designer.selection.connectionId).toBe('conn_3');
        expect(root.querySelector('.workflow-edge[data-edge-id="conn_3"]').getAttribute('class')).toContain('is-selected');
    });

    it('shows execution logs for the selected run', async () => {
        const result = await ref.instance.designer.run({ context: { approved: true } });
        expect(result.success).toBe(true);
        ref.instance.toolbarAction('toggle-logs');
        await flush();
        expect(root.querySelector('.workspace-layout-bottom')?.hasAttribute('hidden')).toBe(false);
        const rows = root.querySelectorAll('.workflow-run-log-row');
        expect(rows.length).toBeGreaterThan(0);
        expect(root.querySelector('.workflow-run-log').textContent).toContain('task_1');
        expect(root.querySelector('.workflow-run-log').textContent).toContain('执行日志');
        ref.instance.toolbarAction('toggle-logs');
        await flush();
        const logPanel = root.querySelector('.workflow-run-log');
        expect(logPanel.hasAttribute('hidden') || logPanel.classList.contains('is-hidden')).toBe(true);
    });

    it('inspects per-node messages in the debug panel', async () => {
        const result = await ref.instance.designer.run({ context: { approved: true } });
        expect(result.success).toBe(true);
        ref.instance.toolbarAction('toggle-logs');
        await flush();

        (root.querySelector('.workflow-run-log-tab[data-mode="messages"]') as any).click();
        await flush();
        expect(root.querySelector('.workflow-debug-clear')).toBeTruthy();
        const items = root.querySelectorAll('.workflow-debug-item');
        expect(items.length).toBeGreaterThan(0);

        (items[0].querySelector('.workflow-debug-summary') as any).click();
        await flush();
        const payload = root.querySelector('.workflow-debug-item .workflow-debug-payload');
        expect(payload?.textContent).toContain('nodeId');

        const search = root.querySelector('.workflow-debug-search') as any;
        search.value = '读取输入';
        search.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.workflow-debug-item').length).toBe(1);
        expect(root.querySelector('.workflow-debug-item')?.textContent).toContain('读取输入');
    });

    it('installs and uninstalls plugins from the palette manager', async () => {
        const manifest = {
            id: 'demo',
            name: 'Demo plugin',
            version: '1.0.0',
            description: 'Adds a demo node',
            nodes: [{
                type: 'demo-node',
                label: 'Demo node',
                category: 'action',
                icon: 'D',
                color: '#0f766e',
                textColor: '#ffffff',
                inputs: [{ id: 'in', name: 'in', type: 'input' }],
                outputs: [{ id: 'out', name: 'out', type: 'output' }],
                fields: []
            }]
        };
        let installed = false;
        ref.instance.pluginManager = {
            list: async () => ({
                installed: installed ? [manifest] : [],
                available: [manifest]
            }),
            install: async () => {
                installed = true;
                return { installed: true, plugin: manifest };
            },
            uninstall: async () => {
                installed = false;
                return true;
            }
        } as any;

        expect(root.querySelector('.workflow-global-bar [data-menu-id="plugins"]')).toBeTruthy();
        ref.instance.toolbarAction('plugins');
        await flush();
        expect(root.querySelector('.workflow-plugins')).toBeTruthy();
        await waitFor(() => !!root.querySelector('.workflow-plugin-row[data-plugin-id="demo"]'));

        let row = root.querySelector('.workflow-plugin-row[data-plugin-id="demo"]') as any;
        expect(row.textContent).toContain('Demo plugin');
        expect(row.textContent).toContain('1 个节点');

        (row.querySelector('.workflow-btn') as any).click();
        await waitFor(() => ref.instance.designer.registry.has('demo-node'));
        expect(ref.instance.designer.registry.has('demo-node')).toBe(true);

        await waitFor(() => String(root.querySelector('.workflow-plugin-row[data-plugin-id="demo"]')?.textContent || '').includes('已安装'));
        row = root.querySelector('.workflow-plugin-row[data-plugin-id="demo"]') as any;
        expect(row.textContent).toContain('已安装');
        expect(row.querySelector('.ui-badge')?.textContent).toContain('已安装');
        (row.querySelector('.workflow-btn') as any).click();
        await waitFor(() => !ref.instance.designer.registry.has('demo-node'));
        expect(ref.instance.designer.registry.has('demo-node')).toBe(false);

        (root.querySelector('.workflow-plugins .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-plugins')).toBeFalsy();
    });

    it('releases the shared action bus subscription on destroy', async () => {
        const before = WORKFLOW_ACTION_BUS.size;
        (ref.instance as any).onDestroy();
        expect(WORKFLOW_ACTION_BUS.size).toBe(before - 1);
    });

    it('opens a referenced sub-workflow from the node menu', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const child = createDefaultWorkflowDefinition(ref.instance.designer.registry, 'en');
        child.id = 'child-flow';
        child.name = 'Child flow';
        await store.save(child);
        ref.instance.store = store;

        const parentId = ref.instance.designer.definition.id;
        const node = ref.instance.designer.addNode('subprocess', { x: 80, y: 80 })!;
        ref.instance.designer.updateNodeConfig(node.id, { workflow: 'child-flow' });
        ref.instance.designer.selectNode(node.id);
        await flush();

        const element = root.querySelector('.workflow-node[data-node-id="' + node.id + '"]') as any;
        element.dispatchEvent(new (doc.defaultView as any).MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, clientX: 200, clientY: 150
        }));
        await flush();
        const open = root.querySelector('.workflow-node-menu-item[data-subflow]') as any;
        expect(open).toBeTruthy();
        open.click();
        await waitFor(() => ref.instance.designer.definition.id === 'child-flow');

        expect(ref.instance.designer.definition.id).toBe('child-flow');
        expect(ref.instance.openWorkflowCount).toBe(2);

        const back = root.querySelector('.workflow-global-bar [data-menu-id="back-subflow"]') as any;
        expect(back).toBeTruthy();

        // The global bar shows the parent › child trail; clicking the parent
        // returns without opening the menu.
        const breadcrumb = root.querySelector('.workflow-breadcrumb') as any;
        expect(breadcrumb).toBeTruthy();
        expect(breadcrumb.textContent).toContain('审批流程示例');
        expect(breadcrumb.textContent).toContain('Child flow');
        (breadcrumb.querySelector('.ui-breadcrumb-item[role="link"]') as any).click();
        await waitFor(() => ref.instance.designer.definition.id === parentId);
        expect(ref.instance.designer.definition.id).toBe(parentId);
        expect(root.querySelector('.workflow-breadcrumb')).toBeFalsy();
    });

    it('saves and reopens definitions through the workflow library', async () => {
        ref.instance.store = new InMemoryWorkflowDefinitionStore();
        await ref.instance.saveWorkflow();
        await ref.instance.openLibrary();
        await flush();

        expect(root.querySelector('.workflow-library-panel')).toBeTruthy();
        const rows = root.querySelectorAll('.workflow-library-row');
        expect(rows.length).toBe(1);
        expect(rows[0].textContent).toContain('审批流程示例');

        ref.instance.designer.clear();
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(0);

        const openButton = root.querySelector('.workflow-library-row .workflow-btn');
        openButton.click();
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(6);
        expect(root.querySelectorAll('.workflow-node').length).toBe(6);
        expect(ref.instance.showLibrary).toBe(false);
    });

    it('supports click-to-connect from an output port to an input port', async () => {
        const outPort = root.querySelector('.workflow-node[data-node-id="task_2"] .workflow-node-port-output[data-port-id="out"]') as any;
        const inPort = root.querySelector('.workflow-node[data-node-id="task_3"] .workflow-node-port-input[data-port-id="in"]') as any;
        expect(outPort).toBeTruthy();
        expect(inPort).toBeTruthy();
        const MouseEventCtor = doc.defaultView.MouseEvent;

        outPort.dispatchEvent(new MouseEventCtor('mousedown', { bubbles: true, clientX: 400, clientY: 300 }));
        outPort.dispatchEvent(new MouseEventCtor('mouseup', { bubbles: true, clientX: 400, clientY: 300 }));
        await flush();
        expect(ref.instance.designer.connectionDraft).toBeTruthy();
        expect(root.querySelector('.workflow-canvas').getAttribute('data-connecting')).toBe('true');

        inPort.dispatchEvent(new MouseEventCtor('mousedown', { bubbles: true, clientX: 700, clientY: 400 }));
        await flush();
        expect(ref.instance.designer.connectionDraft).toBeUndefined();
        expect(root.querySelector('.workflow-canvas').getAttribute('data-connecting')).toBe('false');
        expect(ref.instance.designer.connections.some(connection =>
            connection.sourceNodeId === 'task_2' && connection.targetNodeId === 'task_3'
        )).toBe(true);
    });

    it('completes a wire when released anywhere on the target node', async () => {
        const log = ref.instance.designer.addNode('log', { x: 1100, y: 620 })!;
        await flush();
        const outPort = root.querySelector('.workflow-node[data-node-id="task_2"] .workflow-node-port-output[data-port-id="out"]') as any;
        const targetNode = root.querySelector(`.workflow-node[data-node-id="${log.id}"]`) as any;
        expect(outPort).toBeTruthy();
        expect(targetNode).toBeTruthy();
        const MouseEventCtor = doc.defaultView.MouseEvent;

        outPort.dispatchEvent(new MouseEventCtor('mousedown', { bubbles: true, clientX: 400, clientY: 300 }));
        targetNode.dispatchEvent(new MouseEventCtor('mouseup', { bubbles: true, clientX: 900, clientY: 500 }));
        await flush();
        expect(ref.instance.designer.connectionDraft).toBeUndefined();
        expect(ref.instance.designer.connections.some(connection =>
            connection.sourceNodeId === 'task_2' && connection.targetNodeId === log.id
        )).toBe(true);
    });

    it('reuses derived models so one change cannot feed a render cascade', async () => {
        const canvas = ref.instance.canvasModel;
        const toolbar = ref.instance.toolbarModel;
        const status = ref.instance.statusModel;
        expect(ref.instance.canvasModel).toBe(canvas);
        expect(ref.instance.toolbarModel).toBe(toolbar);
        expect(ref.instance.statusModel).toBe(status);

        ref.instance.designer.panBy(12, 8);
        await flush();
        expect(ref.instance.canvasModel).not.toBe(canvas);
        // Panning does not affect toolbar or status content.
        expect(ref.instance.toolbarModel).toBe(toolbar);
        expect(ref.instance.statusModel).toBe(status);
        const panned = ref.instance.canvasModel;

        ref.instance.designer.selectNode('task_1');
        await flush();
        const inspector = ref.instance.inspectorModel;
        expect(ref.instance.inspectorModel).toBe(inspector);

        const position = ref.instance.designer.nodes.find(node => node.id === 'task_1')!.position;
        ref.instance.designer.moveNode('task_1', { x: position.x + 20, y: position.y + 10 });
        await flush();
        // Node position repaints the canvas but not the inspector/config panel.
        expect(ref.instance.canvasModel).not.toBe(panned);
        expect(ref.instance.inspectorModel).toBe(inspector);

        ref.instance.designer.updateNodeConfig('task_1', { action: 'changed' });
        await flush();
        expect(ref.instance.inspectorModel).not.toBe(inspector);
    });

    it('opens the node-red style menu and dispatches toolbar actions', async () => {
        const trigger = root.querySelector('.workflow-global-bar .menu-bar-trigger') as any;
        expect(trigger).toBeTruthy();
        const popup = root.querySelector('.workflow-global-bar .menu-bar-popup') as any;
        expect(popup.hasAttribute('hidden')).toBe(true);

        trigger.click();
        await flush();
        expect(popup.hasAttribute('hidden')).toBe(false);

        const logs = root.querySelector('.workflow-global-bar [data-menu-id="toggle-logs"]') as any;
        expect(logs).toBeTruthy();
        logs.click();
        await flush();
        expect(ref.instance.showLogs).toBe(true);
        expect(popup.hasAttribute('hidden')).toBe(true);
    });

    it('shows run size on history chips and clears persisted history', async () => {
        await ref.instance.designer.run({ context: {} });
        await waitFor(() => ref.instance.designer.executionHistory.length > 0);
        await flush();
        const chips = root.querySelectorAll('.workflow-run-chip');
        expect(chips.length).toBeGreaterThan(0);
        const size = ((chips[0].querySelector('.workflow-run-chip-size') as any)?.textContent || '').trim();
        expect(size).toMatch(/^(\d+ B|\d+\.\d KB|\d+\.\d MB)$/);

        let cleared: string | undefined = 'unset';
        const store = new InMemoryWorkflowDefinitionStore();
        (store as any).clearExecutions = async (workflowId?: string) => { cleared = workflowId; };
        ref.instance.store = store;
        (root.querySelector('.workflow-run-clear') as any).click();
        await flush();
        expect(cleared).toBe(ref.instance.designer.definition.id);
        expect(ref.instance.designer.executionHistory.length).toBe(0);
    });

    it('manages stored credentials from the designer', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const names = ['api-token'];
        const saved: Array<[string, string]> = [];
        const removed: string[] = [];
        (store as any).listCredentials = async () => [...names];
        (store as any).setCredential = async (name: string, value: string) => {
            saved.push([name, value]);
            if (!names.includes(name)) {
                names.push(name);
            }
        };
        (store as any).removeCredential = async (name: string) => {
            removed.push(name);
            const index = names.indexOf(name);
            if (index >= 0) {
                names.splice(index, 1);
            }
            return true;
        };
        ref.instance.store = store;

        (root.querySelector('.workflow-global-bar [data-menu-id="credentials"]') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-credential-row'));
        expect(root.querySelectorAll('.workflow-credential-row').length).toBe(1);
        expect(root.querySelector('.workflow-credential-row')?.getAttribute('data-credential-name')).toBe('api-token');
        // Secrets are never rendered, only names.
        expect(root.querySelector('.workflow-credentials')?.textContent || '').not.toContain('super-secret');

        // Labels come from bindings, so a locale change re-renders them.
        ref.instance.locale = 'en';
        await flush();
        expect(root.querySelector('.workflow-credentials .workflow-publish-title')?.textContent)
            .toContain('Credentials');
        ref.instance.locale = 'zh-CN';
        await flush();
        expect(root.querySelector('.workflow-credentials .workflow-publish-title')?.textContent)
            .toContain('凭据');

        const nameInput = root.querySelector('.workflow-credential-name-input') as any;
        const valueInput = root.querySelector('.workflow-credential-value-input') as any;
        nameInput.value = 'new-token';
        nameInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        valueInput.value = 'super-secret';
        valueInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.workflow-credential-save') as any).click();
        await waitFor(() => root.querySelectorAll('.workflow-credential-row').length === 2);
        expect(saved).toEqual([['new-token', 'super-secret']]);

        (root.querySelector('[data-credential-name="api-token"] .workflow-credential-remove') as any).click();
        await waitFor(() => root.querySelectorAll('.workflow-credential-row').length === 1);
        expect(removed).toEqual(['api-token']);

        (root.querySelector('.workflow-credentials .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-credentials')).toBeFalsy();
    });

    it('shows audit entries for the active workflow', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const now = Date.now();
        (store as any).listAudit = async (filter: any) => ([
            { id: 'a1', at: now, action: 'publish', workflowId: filter?.workflowId },
            { id: 'a2', at: now - 1000, action: 'save', workflowId: filter?.workflowId }
        ]);
        ref.instance.store = store;

        (root.querySelector('.workflow-global-bar [data-menu-id="audit"]') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-audit .ui-data-table-row'));

        // Entries render through the shared data table (row = one audit entry).
        expect(root.querySelectorAll('.workflow-audit .ui-data-table-row').length).toBe(2);
        const text = root.querySelector('.workflow-audit')?.textContent || '';
        expect(text).toContain('publish');
        expect(text).toContain('save');
        expect(text).toContain(ref.instance.designer.definition.id);

        (root.querySelector('.workflow-audit .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-audit')).toBeFalsy();
    });

    it('lists and stops hosted deployments', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        let deployments = [{
            workflowId: 'flow-a',
            running: true,
            startedAt: Date.now(),
            runs: 3
        }];
        let stoppedAll = false;
        (store as any).listDeployments = async () => deployments;
        (store as any).startDeployments = async () => deployments;
        (store as any).stopDeployments = async () => {
            stoppedAll = true;
            deployments = deployments.map(item => ({ ...item, running: false }));
            return 1;
        };
        ref.instance.store = store;

        (root.querySelector('.workflow-global-bar [data-menu-id="deployments"]') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-deployment-row[data-workflow-id="flow-a"]'));
        expect(root.querySelector('.workflow-deployments')?.textContent).toContain('flow-a');
        expect(root.querySelector('.workflow-deployment-row')?.textContent).toContain('运行中');

        (root.querySelectorAll('.workflow-deployments-actions .workflow-btn')[1] as any).click();
        await waitFor(() => stoppedAll && String(root.querySelector('.workflow-deployment-row')?.textContent || '').includes('已停止'));
        expect(root.querySelector('.workflow-deployment-row .ui-badge')?.textContent).toContain('已停止');
        expect(stoppedAll).toBe(true);

        (root.querySelector('.workflow-deployments .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-deployments')).toBeFalsy();
    });

    it('finds nodes by name, id or type and centres the match', async () => {
        const canvas = root.querySelector('.workflow-canvas') as any;
        // JSDOM has no layout, so give the canvas a viewport for centring.
        canvas.getBoundingClientRect = () => ({
            x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600,
            width: 900, height: 600,
            toJSON: () => ({})
        });
        const press = (key: string, options: Record<string, any> = {}) =>
            canvas.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
                key, bubbles: true, cancelable: true, ...options
            }));

        press('f', { ctrlKey: true });
        await waitFor(() => !!root.querySelector('.workflow-find'));
        expect(root.querySelectorAll('.workflow-find-item').length).toBe(6);

        const input = root.querySelector('.workflow-find-input') as any;
        input.value = 'task';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.workflow-find-item').length).toBe(3);

        input.value = 'task_3';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        const items = Array.from(root.querySelectorAll('.workflow-find-item')) as any[];
        expect(items.length).toBe(1);
        expect(items[0].getAttribute('data-find-node')).toBe('task_3');

        const node = ref.instance.designer.nodes.find(entry => entry.id === 'task_3')!;
        const before = { ...ref.instance.designer.pan };
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true, cancelable: true
        }));
        await waitFor(() => !root.querySelector('.workflow-find'));

        expect(ref.instance.designer.selectedNodeIds).toEqual(['task_3']);
        expect(ref.instance.designer.pan).not.toEqual(before);
        // The centred node sits in the middle of the 900x600 viewport.
        const frame = workflowNodeFrame(node);
        expect(ref.instance.designer.pan.x)
            .toBe(Math.round(450 - (node.position.x + frame.width / 2) * ref.instance.designer.zoom));
        expect(ref.instance.designer.pan.y)
            .toBe(Math.round(300 - (node.position.y + frame.height / 2) * ref.instance.designer.zoom));
        await flush();
        expect(root.querySelector('.workflow-node[data-node-id="task_3"]')?.getAttribute('class') || '')
            .toContain('is-selected');

        // Escape closes without changing the selection.
        press('f', { ctrlKey: true });
        await waitFor(() => !!root.querySelector('.workflow-find'));
        input.value = 'zzzz';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.workflow-find-item').length).toBe(0);
        (root.querySelector('.workflow-find-input') as any).dispatchEvent(
            new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        );
        await waitFor(() => !root.querySelector('.workflow-find'));
        expect(ref.instance.designer.selectedNodeIds).toEqual(['task_3']);
    });

    it('shows execution metrics and a windowed trend for the active workflow', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const now = Date.now();
        const queries: any[] = [];
        (store as any).getMetrics = async (workflowId: string, query: any) => {
            queries.push(query);
            return {
                workflowId,
                runs: 4,
                running: 0,
                succeeded: 3,
                failed: 1,
                cancelled: 0,
                avgDurationMs: 125,
                lastRunAt: now,
                lastStatus: 'completed',
                windowMs: query?.windowMs,
                nodes: [
                    { nodeId: 'start_1', runs: 4, failed: 0, avgDurationMs: 2 },
                    { nodeId: 'task_1', runs: 4, failed: 1, avgDurationMs: 120 }
                ],
                trend: [
                    { start: now - 3600000, end: now - 1800000, runs: 3, failed: 0, avgDurationMs: 100 },
                    { start: now - 1800000, end: now, runs: 1, failed: 1, avgDurationMs: 200 }
                ]
            };
        };
        ref.instance.store = store;

        (root.querySelector('.workflow-global-bar [data-menu-id="metrics"]') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-metrics-nodes'));

        const text = root.querySelector('.workflow-metrics')?.textContent || '';
        expect(text).toContain('4');
        expect(text).toContain('75%');
        // Metric tiles come from the shared ui-stat widget.
        expect(root.querySelectorAll('.workflow-metrics .ui-stat').length).toBe(4);
        expect(text).toContain('start_1');
        expect(text).toContain('task_1');

        // Trend bars scale against the busiest bucket in the window.
        const rows = Array.from(root.querySelectorAll('.workflow-metrics-trend-row')) as any[];
        expect(rows.length).toBe(2);
        expect(rows[0].querySelector('.workflow-metrics-trend-fill').getAttribute('style')).toContain('width:100%');
        expect(rows[1].querySelector('.workflow-metrics-trend-fill').getAttribute('style')).toContain('width:33%');
        expect(rows[1].textContent).toContain('1 failed');
        expect(queries[0].windowMs).toBe(86400000);

        // Switching the window refetches with the new window and marks it active.
        const windows = Array.from(root.querySelectorAll('.workflow-metrics-window')) as any[];
        expect(windows[1].getAttribute('class') || '').toContain('is-active');
        windows[0].click();
        await waitFor(() => queries.length > 1);
        await flush();
        expect(queries[1].windowMs).toBe(3600000);
        const afterSwitch = Array.from(root.querySelectorAll('.workflow-metrics-window')) as any[];
        expect(afterSwitch[0].getAttribute('class') || '').toContain('is-active');
        expect(afterSwitch[1].getAttribute('class') || '').not.toContain('is-active');

        (root.querySelector('.workflow-metrics .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-metrics')).toBeFalsy();
    });

    it('edits workflow description and run timeout from settings', async () => {
        (root.querySelector('.workflow-global-bar [data-menu-id="settings"]') as any).click();
        await flush();
        expect(root.querySelector('.workflow-settings')).toBeTruthy();

        const description = root.querySelector('.workflow-settings-description') as any;
        description.value = 'Nightly approval flow';
        description.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        const timeout = root.querySelector('.workflow-settings-timeout') as any;
        timeout.value = '1500';
        timeout.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        (root.querySelector('.workflow-settings-save') as any).click();
        await flush();

        expect(ref.instance.designer.definition.description).toBe('Nightly approval flow');
        expect((ref.instance.designer.definition.metadata as any).timeout).toBe(1500);
        expect(root.querySelector('.workflow-settings')).toBeFalsy();
    });

    it('publishes the active workflow from the menu and records a release', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;
        ref.instance.designer.renameNode('task_1', 'Publish me');
        await flush();

        const trigger = root.querySelector('.workflow-global-bar .menu-bar-trigger') as any;
        trigger.click();
        await flush();
        const publish = root.querySelector('.workflow-global-bar [data-menu-id="publish"]') as any;
        expect(publish).toBeTruthy();
        publish.click();
        await flush();

        // Publishing changes what production entry points run: it asks first.
        const dialog = root.querySelector('.workflow-publish') as any;
        expect(dialog).toBeTruthy();
        expect(dialog.textContent).toContain('发布工作流');
        expect(dialog.textContent).toContain('6 个节点');
        (dialog.querySelector('.workflow-publish-confirm') as any).click();
        await waitFor(() => ref.instance.saveState === 'saved');
        const versions = await store.listVersions(ref.instance.designer.definition.id);
        expect(versions.items.length).toBe(1);
        expect(versions.items[0].kind).toBe('publish');
        expect(versions.release?.version).toBe(versions.items[0].version);
        expect(ref.instance.designer.message).toBe('workflow.message.published');
        expect(ref.instance.saveStateLabel).toContain('已保存');
    });

    it('cancels publishing without recording a release', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;
        ref.instance.designer.renameNode('task_1', 'draft only');
        await flush();

        (root.querySelector('.workflow-global-bar .menu-bar-trigger') as any).click();
        await flush();
        (root.querySelector('.workflow-global-bar [data-menu-id="publish"]') as any).click();
        await flush();
        const dialog = root.querySelector('.workflow-publish') as any;
        expect(dialog).toBeTruthy();
        dialog.querySelector('.workflow-publish-close').click();
        await flush();
        expect(root.querySelector('.workflow-publish')).toBeFalsy();

        const versions = await store.listVersions(ref.instance.designer.definition.id);
        expect(versions.items.length).toBe(0);
        expect(versions.release).toBeFalsy();
        expect(ref.instance.showPublish).toBe(false);

        // Escape dismisses the dialog and keeps the document untouched.
        await ref.instance.openPublish();
        await flush();
        expect(root.querySelector('.workflow-publish')).toBeTruthy();
        const name = ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name;
        doc.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe(name);
        doc.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await flush();
        expect(root.querySelector('.workflow-publish')).toBeFalsy();
    });

    it('lists saved and published versions and restores one into the draft', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;

        ref.instance.designer.renameNode('task_1', 'first version');
        await store.saveVersion(ref.instance.designer.definition);
        ref.instance.designer.renameNode('task_1', 'second version');
        await store.publish(ref.instance.designer.definition);
        await flush();

        const trigger = root.querySelector('.workflow-global-bar .menu-bar-trigger') as any;
        trigger.click();
        await flush();
        const versions = root.querySelector('.workflow-global-bar [data-menu-id="versions"]') as any;
        expect(versions).toBeTruthy();
        versions.click();
        await flush();

        const panel = root.querySelector('.workflow-version-panel') as any;
        expect(panel).toBeTruthy();
        await waitFor(() => panel.querySelectorAll('.workflow-version-row').length === 2);
        const rows = Array.from(panel.querySelectorAll('.workflow-version-row')) as any[];
        expect(rows.length).toBe(2);
        expect(rows[0].classList.contains('is-published')).toBe(true);
        expect(rows[0].textContent).toContain('v2');
        expect(panel.querySelector('.workflow-version-release')?.textContent).toContain('v2');

        // Comparing a snapshot with the draft shows the structural diff.
        (rows[1].querySelectorAll('button')[0] as any).click();
        await waitFor(() => !!root.querySelector('.workflow-version-diff'));
        const diff = root.querySelector('.workflow-version-diff') as any;
        expect(diff.textContent).toContain('与当前草稿的差异');
        expect(diff.textContent).toContain('name');
        expect(diff.querySelectorAll('.workflow-version-diff-row').length).toBeGreaterThan(0);

        // Rolling back: promote v1 to the release without touching the draft.
        const releaseButton = Array.from(rows[1].querySelectorAll('button')) as any[];
        const releaseAction = releaseButton.find(button => /发布此版本/.test(button.textContent || '')) as any;
        expect(releaseAction).toBeTruthy();
        releaseAction.click();
        await waitFor(() => ref.instance.versionRelease?.version === 1);
        expect(ref.instance.versionRelease?.version).toBe(1);
        expect(ref.instance.versionItems.find(item => item.version === 1)?.kind).toBe('publish');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('second version');

        const currentButtons = Array.from(rows[1].querySelectorAll('button')) as any[];
        const restore = currentButtons.find(button => /恢复/.test(button.textContent || '')) as any;
        expect(restore).toBeTruthy();
        restore.click();
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === 'first version');
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('first version');
        expect(root.querySelector('.workflow-version-panel')).toBeFalsy();

        // Explicit saves record the signed-in author provided by the host.
        ref.instance.designer.author = '张三';
        ref.instance.designer.renameNode('task_1', 'authored');
        await ref.instance.saveWorkflow();
        await ref.instance.openVersions();
        await flush();
        const metas = Array.from(root.querySelectorAll('.workflow-version-meta')) as any[];
        expect(metas.some(meta => (meta.textContent || '').includes('由 张三'))).toBe(true);
    });

    it('debounces code edits so typing does not rebuild the workflow per keystroke', async () => {
        const node = ref.instance.designer.addNode('function', { x: 120, y: 120 });
        expect(node).toBeTruthy();
        const nodeId = node!.id;
        const code = () => ref.instance.designer.nodes.find(item => item.id === nodeId)?.config?.code;
        await flush();

        const textarea = root.querySelector('.workflow-code-editor') as any;
        expect(textarea).toBeTruthy();
        expect(code()).toBe('return input;');
        // Function exposes a single code editor (no initialize/finalize hooks).
        expect(root.querySelectorAll('.workflow-field[data-field-key="code"] .workflow-code-editor').length).toBe(1);
        expect(root.querySelector('.workflow-field[data-field-key="initialize"]')).toBeFalsy();
        expect(root.querySelector('.workflow-field[data-field-key="finalize"]')).toBeFalsy();

        textarea.value = 'return 42;';
        textarea.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(code()).toBe('return input;');

        textarea.value = 'return 43;';
        textarea.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(code()).toBe('return input;');

        await waitFor(() => code() === 'return 43;', 1500);
        expect(code()).toBe('return 43;');

        // Blur commits immediately so Run/Save can never use stale code.
        textarea.value = 'return 44;';
        textarea.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        textarea.dispatchEvent(new (doc.defaultView as any).Event('blur'));
        await flush();
        expect(code()).toBe('return 44;');
    });

    it('offers workflow-aware code completion paths', async () => {
        const suggestions = ref.instance.codeSuggestions;
        expect(suggestions).toContain('context.actions.loadInput');
        expect(suggestions).toContain('context.variables');
        expect(suggestions).toContain('input');
    });

    it('autosaves edits through the configured store', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;
        ref.instance.autosave = true;
        ref.instance.autosaveDelay = 5;

        ref.instance.designer.selectNode('task_1');
        await flush();
        const input = root.querySelector('.workflow-inspector-name') as any;
        input.value = 'Autosaved task';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();

        // Text edits land after the burst delay; wait for the commit before
        // waiting for the save, otherwise `saveState` is still the old value.
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === 'Autosaved task');
        await waitFor(() => ref.instance.saveState === 'saved', 3000);
        const saved = await store.get(ref.instance.designer.definition.id);
        expect(saved?.nodes.find(node => node.id === 'task_1')?.name).toBe('Autosaved task');
        expect(ref.instance.saveStateLabel).toContain('已保存');
        // Autosave only rewrites the draft; versions belong to explicit saves.
        expect((await store.listVersions(ref.instance.designer.definition.id)).items.length).toBe(0);
    });

    it('coalesces a slow typing burst into a single autosave', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        let writes = 0;
        ref.instance.store = {
            list: () => store.list(),
            get: (id: string) => store.get(id),
            remove: (id: string) => store.remove(id),
            clear: () => store.clear(),
            save: (definition: any) => {
                writes += 1;
                return store.save(definition);
            }
        } as any;
        ref.instance.autosave = true;
        ref.instance.autosaveDelay = 5;
        // Wide windows: the assertion is about coalescing, not about how fast
        // the test machine schedules timers.
        ref.instance.autosaveMinInterval = 2000;
        ref.instance.autosaveMaxDelay = 6000;

        ref.instance.designer.renameNode('task_1', 'First edit');
        ref.instance.scheduleAutosave();
        await waitFor(() => writes === 1, 2000);
        expect(writes).toBe(1);

        // Typing slowly (one edit every ~50ms) used to write the whole document
        // once per keystroke; the minimum interval must hold the writes back.
        for (let index = 0; index < 3; index++) {
            ref.instance.designer.renameNode('task_1', `Slow edit ${index}`);
            ref.instance.scheduleAutosave();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        expect(writes).toBe(1);

        await waitFor(() => writes === 2, 5000);
        expect(writes).toBe(2);
        expect((await store.get(ref.instance.designer.definition.id))?.nodes
            .find(node => node.id === 'task_1')?.name).toBe('Slow edit 2');
    });

    it('never reports a saved state while the document is dirty', async () => {
        ref.instance.saveState = 'saved';
        ref.instance.designer.renameNode('task_1', 'Unsaved rename');
        await flush();
        expect(ref.instance.designer.dirty).toBe(true);
        expect(ref.instance.saveStateLabel).toContain('未保存');
        expect(ref.instance.preview?.saveStateClass).toContain('is-dirty');
    });

    it('keeps the inspector schema stable while typing values', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const inspector = (ref.instance.preview as any)?.inspector;
        expect(inspector).toBeTruthy();
        const before = inspector.formSchema;
        expect(before.fields.length).toBeGreaterThan(0);

        const input = root.querySelector('.workflow-inspector-name') as any;
        input.value = 'Schema stable';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === 'Schema stable');
        await flush();

        // A value edit must reuse the schema object; a new one made
        // `dynamic-form` re-sign and rebuild every control per keystroke.
        expect(inspector.formSchema).toBe(before);
    });

    it('commits a typing burst once instead of once per keystroke', async () => {
        ref.instance.designer.selectNode('task_1');
        await flush();
        const inspector = (ref.instance.preview as any)?.inspector;
        // Keep the burst window generous so the assertion is not timing-luck.
        inspector.textChangeDelay = 800;
        const before = ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name;

        const input = root.querySelector('.workflow-inspector-name') as any;
        for (const value of ['B', 'Bu', 'Bur']) {
            input.value = value;
            input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 60));
        }
        // Mid-burst the document is untouched: no canvas/inspector rebuild.
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe(before);

        await waitFor(() => ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name === 'Bur', 3000);
        // One burst == one undo step.
        ref.instance.designer.undo();
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe(before);
    });

    it('opens keyboard shortcuts and saves with Ctrl+S', async () => {
        const key = (value: string, options: any = {}) => doc.dispatchEvent(
            new (doc.defaultView as any).KeyboardEvent('keydown', { key: value, bubbles: true, ...options })
        );
        key('?');
        await flush();
        expect(root.querySelector('.workflow-shortcuts-panel')).toBeTruthy();
        // Shortcut help renders through the shared keymap widget.
        expect(root.querySelectorAll('.workflow-shortcuts-panel .keymap-row').length)
            .toBe((ref.instance.preview as any).shortcutItems.length);
        key('Escape');
        await flush();
        expect(root.querySelector('.workflow-shortcuts-panel')).toBeFalsy();

        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;
        ref.instance.designer.renameNode('task_1', 'Keyboard save');
        key('s', { ctrlKey: true });
        const workflowId = ref.instance.designer.definition.id;
        let versions = await store.listVersions(workflowId);
        for (let attempt = 0; attempt < 40 && versions.items.length === 0; attempt++) {
            await flush();
            versions = await store.listVersions(workflowId);
        }
        const saved = await store.get(workflowId);
        expect(saved?.nodes.find(node => node.id === 'task_1')?.name).toBe('Keyboard save');
        // An explicit save also records an immutable version.
        expect(versions.items.length).toBe(1);
        expect(versions.items[0].kind).toBe('save');
    });

    it('zooms with Ctrl+wheel and pans with a plain wheel', async () => {
        const zoomBefore = ref.instance.designer.zoom;
        ref.instance.handleCanvas({ type: 'wheel', ctrlKey: true, deltaY: -120, clientX: 100, clientY: 100 });
        await flush();
        expect(ref.instance.designer.zoom).toBeGreaterThan(zoomBefore);

        const panBefore = ref.instance.designer.pan.y;
        ref.instance.handleCanvas({ type: 'wheel', deltaY: 120, clientX: 100, clientY: 100 });
        await flush();
        expect(ref.instance.designer.pan.y).not.toBe(panBefore);
    });

    it('shows an empty-canvas hint after clearing the graph', async () => {
        ref.instance.designer.clear();
        await flush();
        expect((root.querySelector('.workflow-canvas-empty') as any)?.textContent).toContain('拖入节点');
    });

    it('offers resume after a cancelled run and completes from the checkpoint', async () => {
        const first = await ref.instance.designer.run({
            context: { approved: true },
            onCheckpoint: snapshot => {
                if (snapshot.nodeStates.task_1?.status === 'success'
                    && snapshot.nodeStates.condition_1?.status === 'pending') {
                    void ref.instance.designer.cancel();
                }
            }
        });
        expect(first.success).toBe(false);
        await flush();
        expect(ref.instance.toolbarModel.canResume).toBe(true);

        ref.instance.toolbarAction('resume');
        await waitFor(() => ref.instance.designer.running === false && ref.instance.designer.execution?.status === 'completed');
        await flush();
        expect(ref.instance.designer.execution?.nodeStates.task_2.status).toBe('success');
        expect(ref.instance.toolbarModel.canResume).toBe(false);
    });

});
