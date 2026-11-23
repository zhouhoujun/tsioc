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
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
/** Minimal host so the shared application boots without rendering a designer. */
@Component({
    selector: 'designer-ui-host',
    template: '<div></div>'
})
class DesignerUiHost { }


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

        // The configuration-node index lists shared records with usage counts.
        (root.querySelector('.workflow-btn-config-nodes') as any).click();
        await flush();
        const panel = ref.instance.preview!.configNodes!;
        expect(panel.visible).toBe(true);
        const brokerRow = root.querySelector(`.workflow-config-nodes [data-config-id="${created.id}"]`) as any;
        expect(brokerRow).toBeTruthy();
        expect(brokerRow.querySelector('.workflow-config-node-name').textContent).toBe('prod');
        expect(brokerRow.querySelector('.workflow-config-node-summary').textContent).toBe('mqtt://prod:1883');
        expect(brokerRow.querySelector('.workflow-config-node-usage').textContent).toContain('1');
        expect(root.querySelectorAll('[data-config-group="tls"] [data-config-id]').length).toBe(0);

        // A group's create button adds a record without leaving the index.
        (root.querySelector('[data-config-add="tls"]') as any).click();
        await flush();
        expect(root.querySelectorAll('[data-config-group="tls"] [data-config-id]').length).toBe(1);

        // The pencil edits the record in place; the row follows the rename.
        (root.querySelector(`[data-config-edit="${created.id}"]`) as any).click();
        await flush();
        expect(dialog.showConfigDialog).toBe(true);
        expect(dialog.configId).toBe(created.id);
        dialog.name = 'prod-2';
        dialog.values = { ...dialog.values, url: 'mqtt://prod-2:1883' };
        dialog.save();
        await flush();
        const renamed = root.querySelector(`.workflow-config-nodes [data-config-id="${created.id}"]`) as any;
        expect(renamed.querySelector('.workflow-config-node-name').textContent).toBe('prod-2');
        expect(renamed.querySelector('.workflow-config-node-summary').textContent).toBe('mqtt://prod-2:1883');

        // The row body reveals the config node on the canvas and closes the panel.
        (renamed.querySelector('.workflow-config-node-main') as any).click();
        await flush();
        expect(panel.visible).toBe(false);
        expect(ref.instance.designer.selection?.nodeId).toBe(created.id);

        ref.instance.designer.selectNode(created.id);
        await flush();
        ref.instance.preview!.requestDeleteNodes([created.id]);
        await flush();
        expect(dialog.showDeleteConfirm).toBe(true);
        expect(dialog.deleteConfirmRefs).toEqual([{ id: created.id, name: 'prod-2', count: 1 }]);
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

    it('filters palette components by search query', async () => {
        const input = root.querySelector('.workflow-palette-search-input') as any;
        expect(input).toBeTruthy();
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(71);

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
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(71);
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

    it('fits the view and falls back to the origin without a measurable canvas', async () => {
        ref.instance.designer.setZoom(2);
        ref.instance.designer.pan = { x: 200, y: 120 };
        ref.instance.fitView();
        await flush();
        expect(ref.instance.designer.zoom).toBe(1);
        expect(ref.instance.designer.pan).toEqual({ x: 0, y: 0 });
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
        // The selector owns the source: an empty field stays empty instead of
        // storing a dangling `msg.`, and the choice survives until typing.
        expect(input.value).toBe('');
        expect((field.querySelector('.workflow-field-value-type') as any).value).toBe('msg');
        input.value = 'payload.endpoint';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 420));

        const updated = ref.instance.designer.nodes.find(item => item.id === node.id)!;
        expect(updated.config?.url).toBe('msg.payload.endpoint');
        // The stored prefix is not repeated inside the input.
        expect((root.querySelector('.workflow-field[data-field-key="url"] input') as any).value).toBe('payload.endpoint');
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
        expect(action.querySelectorAll('option').length).toBe(5);
        action.value = 'append';
        action.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules?.[0]?.action).toBe('append');
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

    it('switches labels through the @tsdi/i18n translator', async () => {
        ref.instance.locale = 'en';
        await flush();
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('Run');
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('nodes');
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

    it('lists and stops hosted deployments', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        let deployments = [{
            workflowId: 'flow-a',
            running: true,
            startedAt: Date.now(),
            runs: 3,
            ports: [3001]
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
        expect(root.querySelector('.workflow-deployment-row .workflow-deployment-ports')?.textContent).toContain('3001');

        (root.querySelectorAll('.workflow-deployments-actions .workflow-btn')[1] as any).click();
        await waitFor(() => stoppedAll && String(root.querySelector('.workflow-deployment-row')?.textContent || '').includes('已停止'));
        expect(root.querySelector('.workflow-deployment-row .ui-badge')?.textContent).toContain('已停止');
        expect(stoppedAll).toBe(true);
        await waitFor(() => String(root.querySelector('.workflow-toast .console-toast')?.textContent || '')
            .includes('已停止全部部署'));

        (root.querySelector('.workflow-deployments .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-deployments')).toBeFalsy();
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
});
