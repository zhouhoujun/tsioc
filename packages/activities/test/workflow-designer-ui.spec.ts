import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowDesignerComponent } from '../src/visual/components/workflow-designer.component';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';
import { createDefaultWorkflowDefinition } from '../src/visual/workflow-designer';

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
        await ctx?.close();
    });

    it('renders palette, canvas, edges, inspector and status bar', () => {
        expect(root.matches('.workflow-designer')).toBe(true);
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(35);
        expect(root.querySelectorAll('.workflow-node').length).toBe(6);
        expect(root.querySelectorAll('.workflow-edge').length).toBe(6);
        expect(root.querySelector('.workflow-inspector')).toBeTruthy();
        expect(root.querySelector('.workflow-statusbar')).toBeTruthy();
        expect(root.querySelector('.workflow-toolbar').textContent).toContain('运行');
        expect(root.querySelector('.workspace-layout-left workflow-palette')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-center workflow-canvas')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-right workflow-inspector')).toBeTruthy();
        expect(root.querySelector('.workspace-layout-bottom .workflow-statusbar')).toBeTruthy();
        expect(root.querySelectorAll('.workspace-pane').length).toBe(4);
        expect(root.querySelectorAll('.workspace-splitter').length).toBe(3);
    });

    it('installs the shared stylesheet instead of inline styles', () => {
        const style = doc.getElementById('tsdi-workflow-designer-styles');
        expect(style).toBeTruthy();
        expect(style.textContent).toContain('.workflow-node');
        const node = root.querySelector('.workflow-node');
        expect(node.getAttribute('style') || '').not.toContain('background');
        expect(node.getAttribute('class')).toContain('workflow-node');
    });

    it('filters palette components by search query', async () => {
        const input = root.querySelector('.workflow-palette-search-input') as any;
        expect(input).toBeTruthy();
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(35);

        input.value = 'http';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        const filtered = Array.from(root.querySelectorAll('.workflow-palette-item')) as any[];
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.length).toBeLessThan(35);
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
        expect(root.querySelectorAll('.workflow-palette-item').length).toBe(35);
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
        expect(root.querySelector('.workflow-field[data-field-key="operator"] .workflow-options')).toBeTruthy();
        expect(root.querySelector('.workflow-field[data-field-key="value"]')).toBeFalsy();

        const equals = root.querySelector('.workflow-field[data-field-key="operator"] [data-option-value="equals"] input') as any;
        equals.checked = true;
        equals.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(root.querySelector('.workflow-field[data-field-key="value"]')).toBeTruthy();
        expect(ref.instance.designer.nodes.find(node => node.id === 'condition_1')?.config?.operator).toBe('equals');

        const truthy = root.querySelector('.workflow-field[data-field-key="operator"] [data-option-value="truthy"] input') as any;
        truthy.checked = true;
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
        await flush();
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

    it('refreshes property values when switching nodes of the same type', async () => {
        const second = ref.instance.designer.addNode('task', { x: 40, y: 40 })!;
        await flush();
        let input = root.querySelector('.workflow-inspector-name') as any;
        expect(input.value).toBe(second.name);

        input.value = 'Second task';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
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
        await flush();
        expect(ref.instance.designer.nodes.find(node => node.id === 'task_1')?.name).toBe('重命名任务');
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
        const rows = root.querySelectorAll('.workflow-run-log-row');
        expect(rows.length).toBeGreaterThan(0);
        expect(root.querySelector('.workflow-run-log').textContent).toContain('task_1');
        expect(root.querySelector('.workflow-run-log').textContent).toContain('执行日志');
        ref.instance.toolbarAction('toggle-logs');
        await flush();
        const logPanel = root.querySelector('.workflow-run-log');
        expect(logPanel.hasAttribute('hidden') || logPanel.classList.contains('is-hidden')).toBe(true);
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

    it('debounces code edits so typing does not rebuild the workflow per keystroke', async () => {
        const node = ref.instance.designer.addNode('function', { x: 120, y: 120 });
        expect(node).toBeTruthy();
        const nodeId = node!.id;
        const code = () => ref.instance.designer.nodes.find(item => item.id === nodeId)?.config?.code;
        await flush();

        const textarea = root.querySelector('.workflow-code-editor') as any;
        expect(textarea).toBeTruthy();
        expect(code()).toBe('return input;');

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

        await waitFor(() => ref.instance.saveState === 'saved', 2000);
        const saved = await store.get(ref.instance.designer.definition.id);
        expect(saved?.nodes.find(node => node.id === 'task_1')?.name).toBe('Autosaved task');
        expect(ref.instance.saveStateLabel).toContain('已保存');
    });

    it('opens keyboard shortcuts and saves with Ctrl+S', async () => {
        const key = (value: string, options: any = {}) => doc.dispatchEvent(
            new (doc.defaultView as any).KeyboardEvent('keydown', { key: value, bubbles: true, ...options })
        );
        key('?');
        await flush();
        expect(root.querySelector('.workflow-shortcuts-panel')).toBeTruthy();
        key('Escape');
        await flush();
        expect(root.querySelector('.workflow-shortcuts-panel')).toBeFalsy();

        const store = new InMemoryWorkflowDefinitionStore();
        ref.instance.store = store;
        ref.instance.designer.renameNode('task_1', 'Keyboard save');
        key('s', { ctrlKey: true });
        await new Promise(resolve => setTimeout(resolve, 30));
        const saved = await store.get(ref.instance.designer.definition.id);
        expect(saved?.nodes.find(node => node.id === 'task_1')?.name).toBe('Keyboard save');
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
