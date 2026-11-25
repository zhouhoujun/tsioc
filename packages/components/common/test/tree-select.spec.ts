import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TreeSelectComponent, TreeSelectModule } from '../tree-select';

@Component({
    selector: 'tree-select-host',
    imports: [TreeSelectComponent],
    template: `
    <ui-tree-select :items="tree" :expandedIds="['root']" ariaLabel="Category"
        :changeAction="onSelect"></ui-tree-select>
    <ui-tree-select :items="tree" disabled ariaLabel="Locked"></ui-tree-select>`
})
class TreeSelectHostComponent {
    selected = '';
    tree = [
        { id: 'root', label: 'Root', children: [
            { id: 'child', label: 'Child' }
        ] }
    ];
    onSelect = (node: any) => { this.selected = node.id; };
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

    protected async mount(): Promise<{ roots: HTMLElement[]; host: TreeSelectHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(TreeSelectHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TreeSelectHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(TreeSelectComponent) as ComponentRef<TreeSelectComponent>[];
        return {
            roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as TreeSelectHostComponent
        };
    }

    @Test('opens the tree, selects a node and closes the panel')
    async selectsNode() {
        const { roots, host } = await this.mount();
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
        expect(root.textContent).toContain('Child');
        expect(root.getAttribute('aria-expanded')).toEqual('false');
        expect(root.querySelector('.ui-tree-select-panel')).toBeFalsy();

        (root.querySelector('.ui-tree-select-trigger') as HTMLElement).click();
        await Promise.resolve();
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(root.getAttribute('aria-expanded')).toEqual('false');
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
