import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TreeSelectComponent, TreeSelectModule } from '../tree-select';
import { auditA11y } from './support/a11y-audit';

@Component({
    selector: 'tree-select-host',
    imports: [TreeSelectComponent],
    template: `
    <ui-tree-select :items="tree" :expandedIds="['root']" ariaLabel="Category"
        :changeAction="onSelect"></ui-tree-select>
    <ui-tree-select :items="tree" disabled ariaLabel="Locked"></ui-tree-select>
    <ui-tree-select :items="tree" :multiple="true" :checkable="true" ariaLabel="Tags"
        :checkedIds="checked" :checkAction="onCheck" removeLabel="删除"></ui-tree-select>`
})
class TreeSelectHostComponent {
    selected = '';
    checked: string[] = ['child', 'root'];
    tree = [
        { id: 'root', label: 'Root', children: [
            { id: 'child', label: 'Child' }
        ] }
    ];
    onSelect = (node: any) => { this.selected = node.id; };
    onCheck = (keys: string[]) => { this.checked = keys; };
}

@Suite('common tree select')
export class TreeSelectTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TreeSelectHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TreeSelectModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<{
        roots: HTMLElement[];
        host: TreeSelectHostComponent;
        rootNow: (index?: number) => HTMLElement;
    }> {
        const ref = this.ctx.get(ComponentFactory).create(TreeSelectHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TreeSelectHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(TreeSelectComponent) as ComponentRef<TreeSelectComponent>[];
        return {
            roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as TreeSelectHostComponent,
            rootNow: (index = 0) => {
            const current = ref.hostView.queryAll(TreeSelectComponent) as ComponentRef<TreeSelectComponent>[];
            return current[index].hostView.rootNodes[0] as HTMLElement;
        }
        };
    }

    @Test('opens the tree, selects a node and closes the panel')
    async selectsNode() {
        const { roots, host, rootNow } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.getAttribute('role')).toEqual('combobox');
        expect(root.getAttribute('aria-expanded')).toEqual('false');
        expect(root.textContent).toContain('Select…');
        expect(root.querySelector('.ui-tree-select-panel')).toBeFalsy();

        (root.querySelector('.ui-tree-select-trigger') as HTMLElement).click();
        await Promise.resolve();
        expect(root.getAttribute('aria-expanded')).toEqual('true');
        const panel = root.querySelector('.ui-tree-select-panel') as HTMLElement;
        expect(panel).toBeTruthy();
        expect(panel.textContent).toContain('Root');

        (panel.querySelectorAll('.ui-tree-row')[1] as HTMLElement).click();
        await Promise.resolve();
        expect(host.selected).toEqual('child');
        const live = (root.ownerDocument.querySelector('[aria-label="Category"]') as HTMLElement) || rootNow();
        expect(live.textContent).toContain('Child');
        expect(live.getAttribute('aria-expanded')).toEqual('false');
        expect(live.querySelector('.ui-tree-select-panel')).toBeFalsy();

        (live.querySelector('.ui-tree-select-trigger') as HTMLElement).click();
        await Promise.resolve();
        live.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(live.getAttribute('aria-expanded')).toEqual('false');
    }

    @Test('closes the panel on an outside pointer-down')
    async outsideClose() {
        const { roots } = await this.mount();
        const root = roots[0];
        (root.querySelector('.ui-tree-select-trigger') as any).click();
        await Promise.resolve();
        expect(root.querySelector('.ui-tree-select-panel')).toBeTruthy();
        const doc = root.ownerDocument;
        doc.body.dispatchEvent(new (doc.defaultView as any).Event('pointerdown', { bubbles: true }));
        await Promise.resolve();
        expect(root.querySelector('.ui-tree-select-panel')).toBeFalsy();
        expect(root.getAttribute('aria-expanded')).toBe('false');
    }

    @Test('keeps chips usable in RTL and dismisses on touch pointer-down')
    async rtlAndTouch() {
        const { roots } = await this.mount();
        const root = roots[2];
        root.setAttribute('dir', 'rtl');
        expect(root.querySelectorAll('.ui-tree-select-chip').length).toBe(2);
        (root.querySelector('.ui-tree-select-trigger') as any).click();
        await Promise.resolve();
        expect(root.querySelector('.ui-tree-select-panel')).toBeTruthy();
        const doc = root.ownerDocument;
        const event = new (doc.defaultView as any).Event('pointerdown', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'touch' });
        doc.body.dispatchEvent(event);
        await Promise.resolve();
        expect(root.querySelector('.ui-tree-select-panel')).toBeFalsy();
    }

    @Test('keyboard opens into the tree and restores the trigger after selection')
    async keyboardFlow() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;
        doc.body.appendChild(root);
        root.focus();
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        for (let index = 0; index < 8; index++) await Promise.resolve();
        expect(root.getAttribute('aria-expanded')).toEqual('true');
        expect(root.textContent).toContain('Root');

        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        await Promise.resolve();
        expect(root.textContent).toContain('Child');

        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(host.selected).toEqual('child');
        expect(root.getAttribute('aria-expanded')).toEqual('false');
        expect(doc.activeElement === root).toEqual(true);
        root.remove();
    }

    @Test('renders multi-select chips and removes a checked value')
    async multiChips() {
        const { roots, host, rootNow } = await this.mount();
        const root = roots[2];
        const chips = root.querySelectorAll('.ui-tree-select-chip');
        expect(chips.length).toBe(2);
        expect(root.textContent).toContain('Child');
        expect(auditA11y(root, root.ownerDocument)).toEqual([]);
        const remove = root.querySelector('.ui-tree-select-chip-remove') as any;
        expect(remove.getAttribute('aria-label')).toBe('删除');
        remove.click();
        await Promise.resolve();
        expect(host.checked).toEqual(['root']);
        const liveRoot = (root.ownerDocument.querySelector('[aria-label="Tags"]') as HTMLElement) || rootNow(2);
        const live = liveRoot.querySelectorAll('.ui-tree-select-chip');
        expect(live.length).toBe(1);
        expect(liveRoot.textContent).not.toContain('Child');
    }

    @Test('disabled tree selects stay closed')
    async disabled() {
        const { roots } = await this.mount();
        const root = roots[1];
        expect(root.getAttribute('tabindex')).toEqual('-1');
        expect(root.getAttribute('aria-disabled')).toEqual('true');
        (root.querySelector('.ui-tree-select-trigger') as HTMLElement).click();
        await Promise.resolve();
        expect(root.getAttribute('aria-expanded')).toEqual('false');
        expect(root.querySelector('.ui-tree-select-panel')).toBeFalsy();
    }
}
