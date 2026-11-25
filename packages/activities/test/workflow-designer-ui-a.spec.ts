import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowDesignerComponent } from '../src/visual/components/workflow-designer.component';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';
import { createDefaultWorkflowDefinition } from '../src/visual/workflow-designer';
import { workflowNodeFrame } from '../src/visual/workflow-geometry';
import { WORKFLOW_ACTION_BUS } from '../src/visual/workflow-action-bus';
/** Minimal host so the shared application boots without rendering a designer. */
@Component({
    selector: 'designer-ui-host',
    template: '<div></div>'
})
class DesignerUiHost { }

import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';

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
    let factory: ComponentFactory;
    let service: VisualWorkflowService;
    let ref: ComponentRef<WorkflowDesignerComponent>;
    let root: any;
    let doc: any;
    let dom: any;

    before(async () => {
        const { JSDOM } = require('jsdom');
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        doc = dom.window.document;
        ctx = await Application.run(DesignerUiHost, {
            deps: [HtmlTemplateModule, WorkflowModule],
            providers: [{ provide: DOCUMENT, useValue: doc }]
        });
        factory = ctx.get(ComponentFactory);
        service = ctx.get(VisualWorkflowService);
    });

    beforeEach(async () => {
        service.clearNodeRuntimeState();
        const executions = (service as any).executions;
        if (executions?.clear) {
            executions.clear();
        }
        Object.keys(service.getGlobalContext()).forEach(key => {
            delete (service.getGlobalContext() as any)[key];
        });
        ref = factory.create(WorkflowDesignerComponent, { injector: ctx }) as ComponentRef<WorkflowDesignerComponent>;
        await ref.render();
        root = ref.hostView.rootNodes[0] as any;
        await flush();
    });

    afterEach(async () => {
        await ref?.destroy?.();
        await flush();
    });

    after(async () => {
        try {
            (dom?.window as any)?.close?.();
        } catch {
            // already closed
        }
        await ctx?.close();
    });

    it('renders palette, canvas, edges, inspector and status bar', () => {
        expect(root.matches('.workflow-designer')).toBe(true);
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(71);
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

    it('adds a node by clicking a palette component', async () => {
        const item = root.querySelector('.workflow-palette-item[data-node-type="log"]');
        expect(item).toBeTruthy();
        item.click();
        await flush();
        expect(ref.instance.designer.nodes.length).toBe(7);
        expect(root.querySelectorAll('.workflow-node').length).toBe(7);
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
        // The canvas node must repaint from the same style, not only the panel.
        const canvasNode = root.querySelector('.workflow-node[data-node-id="task_1"]') as any;
        expect(canvasNode?.style.getPropertyValue('--wf-accent')).toBe('#112233');
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

    it('runs through the toolbar action', async () => {
        ref.instance.toolbarAction('run');
        await waitFor(() => ref.instance.designer.running === false && !!ref.instance.designer.execution);
        await flush();
        expect(ref.instance.designer.execution?.status).toBe('completed');
        expect(root.querySelector('.workflow-node[data-node-id="task_2"]')?.getAttribute('data-status')).toBe('success');
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

    it('opens the generated workflow JSON panel', async () => {
        ref.instance.toggleJson();
        await flush();
        expect(root.querySelector('.workflow-json-panel')).toBeTruthy();
        expect(ref.instance.jsonText).toContain('workflow_demo');
        expect(ref.instance.jsonText).toContain('"connections"');
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

    it('releases the shared action bus subscription on destroy', async () => {
        const before = WORKFLOW_ACTION_BUS.size;
        (ref.instance as any).onDestroy();
        expect(WORKFLOW_ACTION_BUS.size).toBe(before - 1);
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

    it('offers workflow-aware code completion paths', async () => {
        const suggestions = ref.instance.codeSuggestions;
        expect(suggestions).toContain('context.actions.loadInput');
        expect(suggestions).toContain('context.variables');
        expect(suggestions).toContain('input');
    });

    it('never reports a saved state while the document is dirty', async () => {
        ref.instance.saveState = 'saved';
        ref.instance.designer.renameNode('task_1', 'Unsaved rename');
        await flush();
        expect(ref.instance.designer.dirty).toBe(true);
        expect(ref.instance.saveStateLabel).toContain('未保存');
        expect(ref.instance.preview?.saveStateClass).toContain('is-dirty');
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
