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

    it('installs the shared stylesheet instead of inline styles', () => {
        const style = doc.getElementById('tsdi-workflow-designer-styles');
        expect(style).toBeTruthy();
        expect(style.textContent).toContain('.workflow-node');
        const node = root.querySelector('.workflow-node');
        expect(node.getAttribute('style') || '').not.toContain('background');
        expect(node.getAttribute('class')).toContain('workflow-node');
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

    it('shows an empty state for nodes without editable properties', async () => {
        ref.instance.designer.selectNode('start_1');
        await flush();
        expect((root.querySelector('.workflow-no-fields') as any)?.textContent).toContain('没有可编辑属性');
        expect(root.querySelector('.workflow-inspector-restore')).toBeFalsy();
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

    it('edits typed values as JSONata expressions in the expanded editor', async () => {
        const node = ref.instance.designer.addNode('switch', { x: 40, y: 40 })!;
        ref.instance.designer.updateNodeConfig(node.id, {
            field: 'value',
            rules: [{ operator: 'equals', value: 'keep' }]
        });
        ref.instance.designer.selectNode(node.id);
        await flush();

        const action = root.querySelector(
            '.workflow-field[data-field-key="rules"] .workflow-list-row [data-field-action="expression"]'
        ) as any;
        expect(action).toBeTruthy();
        action.click();
        await flush();

        expect(root.querySelector('.workflow-expression-panel')).toBeTruthy();
        const input = root.querySelector('.workflow-expression-text') as any;
        expect(input.value).toBe('keep');
        const suggestions = decodeURIComponent(input.getAttribute('data-code-suggestions') || '');
        expect(suggestions).toContain('payload');
        expect(suggestions).toContain('$sum');

        // Broken syntax is reported by the lazy JSONata validator.
        input.value = 'payload.total +';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.workflow-expression-validate') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-expression-error'));
        expect(root.querySelector('.workflow-expression-error')?.textContent || '')
            .toMatch(/position|unexpected|token/i);

        // Fixing it clears the error and Apply stores an expression reference.
        input.value = 'payload.total * 2';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.workflow-expression-validate') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-expression-ok'));
        (root.querySelector('.workflow-expression-apply') as any).click();
        await flush();

        expect(root.querySelector('.workflow-expression-panel')).toBeFalsy();
        const rules = ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules;
        expect(rules?.[0]?.value).toEqual({ type: 'expression', value: 'payload.total * 2' });
    });

    it('creates a sub workflow document and binds the node to it', async () => {
        const node = ref.instance.designer.addNode('subprocess', { x: 60, y: 60 })!;
        const parentId = ref.instance.designer.definition.id;
        const parentName = ref.instance.designer.definition.name;
        await flush();

        const canvasNode = root.querySelector(`.workflow-node[data-node-id="${node.id}"]`) as any;
        canvasNode.dispatchEvent(new (doc.defaultView as any).MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: 120,
            clientY: 120
        }));
        await flush();
        const create = root.querySelector('.workflow-node-menu-item[data-subflow="create"]') as any;
        expect(create).toBeTruthy();
        create.click();
        await waitFor(() => ref.instance.designer.definition.id !== parentId);

        const childId = ref.instance.designer.definition.id;
        expect(childId).not.toBe(parentId);
        expect(ref.instance.designer.definition.name).toContain('子流程');
        // The breadcrumb knows the parent while the child tab is active.
        expect(ref.instance.subflowTrail?.[0]?.label).toBe(parentName);

        await ref.instance.openWorkflowTab(parentId);
        await flush();
        expect(ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.workflow)
            .toBe(childId);
    });

    it('paints the node status line after a run', async () => {
        const node = ref.instance.designer.addNode('switch', { x: 40, y: 40 })!;
        // A configured rule that cannot match keeps the run valid and reports
        // the no-match warning status.
        ref.instance.designer.updateNodeConfig(node.id, {
            field: 'value',
            rules: [{ operator: 'equals', value: 'never' }]
        });
        ref.instance.designer.selectNode(node.id);
        await flush();

        await ref.instance.designer.run({});
        await flush();

        // The runtime reports `No rule matched`; the designer translates the
        // status key and paints it in the node body and the inspector.
        const desc = root.querySelector(`.workflow-node[data-node-id="${node.id}"] .workflow-node-desc`);
        expect(desc?.textContent).toBe('无规则匹配');
        const detail = root.querySelector('.workflow-inspector-detail');
        expect(detail?.textContent).toBe('无规则匹配');

        await waitFor(() => !!root.querySelector('.workflow-inspector-detail'));
        await waitFor(() => root.querySelector(`.workflow-node[data-node-id="${node.id}"] .workflow-node-desc`)?.textContent === '无规则匹配');
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
        // Typed value fields store the source explicitly instead of prefixing
        // text, so the value can never be mistaken for a literal.
        expect(rules?.[0]?.value).toEqual({ type: 'msg', path: 'payload.status' });
        expect(input.value).toBe('payload.status');

        // Switching the source back to literal stores plain text again.
        typeSelect.value = 'literal';
        typeSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        const literalRules = ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules;
        expect(literalRules?.[0]?.value).toBe('payload.status');

        // Literal classes are explicit so a number is never stored as text.
        typeSelect.value = 'num';
        typeSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        input.value = '5';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        const numericRules = ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules;
        expect(numericRules?.[0]?.value).toEqual({ type: 'literal', valueType: 'num', value: '5' });

        // Expressions keep their own stored shape and are edited as text.
        typeSelect.value = 'expression';
        typeSelect.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        input.value = 'payload.total * 2';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        const expressionRules = ref.instance.designer.nodes.find(item => item.id === node.id)?.config?.rules;
        expect(expressionRules?.[0]?.value).toEqual({ type: 'expression', value: 'payload.total * 2' });
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
        // The host list reaches the designer so publishing validates references.
        expect(ref.instance.designer.credentialNames).toEqual(['api-token']);
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
        expect(ref.instance.designer.credentialNames).toEqual(['api-token', 'new-token']);

        (root.querySelector('[data-credential-name="api-token"] .workflow-credential-remove') as any).click();
        await waitFor(() => root.querySelectorAll('.workflow-credential-row').length === 1);
        expect(removed).toEqual(['api-token']);
        expect(ref.instance.designer.credentialNames).toEqual(['new-token']);

        // A reference to a name the store does not have blocks publishing.
        const node = ref.instance.designer.addNode('mqtt-out', { x: 20, y: 20 })!;
        ref.instance.designer.updateNodeConfig(node.id, {
            topic: 'sensors/temp',
            password: '{{credential:gone}}'
        });
        expect(ref.instance.designer.validate().errors.join(' '))
            .toContain('Credential not found: gone');

        // Saving moves raw secrets out of the document into the store.
        ref.instance.designer.updateNodeConfig(node.id, {
            password: 'hunter2'
        });
        await ref.instance.designer.saveTo(store, {});
        expect(saved.some(([name, value]) => name.endsWith('.password') && value === 'hunter2')).toBe(true);
        expect(ref.instance.designer.definition.nodes.find(item => item.id === node.id)?.config?.password)
            .toContain('{{credential:');

        (root.querySelector('.workflow-credentials .workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-credentials')).toBeFalsy();
    });

    it('warns about inline secrets before publishing', async () => {
        const node = ref.instance.designer.addNode('mqtt-out', { x: 20, y: 20 })!;
        ref.instance.designer.updateNodeConfig(node.id, {
            topic: 'sensors/temp',
            password: 'hunter2'
        });
        await flush();
        (root.querySelector('.workflow-global-bar [data-menu-id="publish"]') as any).click();
        await waitFor(() => !!root.querySelector('.workflow-publish'));
        const hint = root.querySelector('.workflow-publish-hint')?.textContent || '';
        expect(hint).toContain('内联密钥');

        // Warnings never block the dialog; publishing still works.
        expect(root.querySelector('.workflow-publish-confirm')).toBeTruthy();
        (root.querySelector('.workflow-publish-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-publish')).toBeFalsy();
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

    it('lets the host take over global menu actions', async () => {
        const actions: string[] = [];
        ref.instance.menuAction = action => {
            actions.push(action);
            return action === 'plugins';
        };

        ref.instance.toolbarAction('plugins');
        await flush();
        expect(actions).toContain('plugins');
        expect(root.querySelector('.workflow-plugins')).toBeFalsy();

        // Unhandled actions still open the designer dialog.
        ref.instance.toolbarAction('settings');
        await flush();
        expect(actions).toContain('settings');
        expect(root.querySelector('.workflow-settings')).toBeTruthy();
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

        // The shared toast queue paints the release confirmation and the ✕
        // dismisses it without touching the document.
        const toast = root.querySelector('.workflow-toast .console-toast') as any;
        expect(toast).toBeTruthy();
        expect(toast.textContent).toContain(`已发布 v${versions.release?.version}`);
        (toast.querySelector('.toast-close') as any).click();
        await flush();
        expect(root.querySelector('.workflow-toast .console-toast')).toBeFalsy();
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

    it('shows an empty-canvas hint after clearing the graph', async () => {
        ref.instance.designer.clear();
        await flush();
        expect((root.querySelector('.workflow-canvas-empty') as any)?.textContent).toContain('拖入节点');
    });
});
