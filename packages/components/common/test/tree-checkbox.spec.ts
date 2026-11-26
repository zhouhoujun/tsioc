import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TreeComponent, TreeModule, TreeNode } from '../tree';

@Component({
    selector: 'tree-check-host',
    imports: [TreeComponent],
    template: `<ui-tree :items="items" :expandedIds="['root']" checkable multiple
        :checkedIds="checked" :checkAction="onCheck" :loadChildren="loadChildren"></ui-tree>`
})
class TreeCheckHostComponent {
    checked: string[] = [];
    checkedEvents: string[][] = [];
    items: TreeNode[] = [
        { id: 'root', label: 'Root', children: [
            { id: 'child', label: 'Child' },
            { id: 'leaf', label: 'Leaf' }
        ] },
        { id: 'lazy', label: 'Lazy', lazy: true }
    ];
    onCheck = (keys: string[]) => { this.checkedEvents.push(keys.slice()); };
    loadChildren = async (node: TreeNode) => node.id === 'lazy'
        ? [{ id: 'lazy-child', label: 'Loaded child' }]
        : [];
}

@Suite('common tree checkbox and lazy loading')
export class TreeCheckboxTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TreeCheckHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TreeModule],
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

    protected async mount(): Promise<{ root: HTMLElement; host: TreeCheckHostComponent; tree: TreeComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(TreeCheckHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TreeCheckHostComponent>;
        await ref.render();
        for (let index = 0; index < 6; index++) await Promise.resolve();
        const comp = ref.hostView.query(TreeComponent) as ComponentRef<TreeComponent>;
        return { root: comp.hostView.rootNodes[0] as HTMLElement, host: ref.instance as TreeCheckHostComponent, tree: comp.instance };
    }

    @Test('toggles checkboxes without changing roving selection')
    async checksNodes() {
        const { root, host, tree } = await this.mount();
        const checks = () => Array.from(root.querySelectorAll('.ui-tree-check')) as HTMLElement[];
        expect(root.getAttribute('aria-multiselectable')).toEqual('true');
        expect(checks().length).toEqual(4);
        checks()[1].click();
        await Promise.resolve();
        expect(host.checkedEvents[0]).toEqual(['child']);
        expect(tree.rowChecked(tree.viewItems[1])).toEqual(true);
        expect(root.querySelectorAll('.ui-tree-node')[1].getAttribute('aria-checked')).toEqual('true');
        checks()[1].click();
        expect(host.checkedEvents[host.checkedEvents.length - 1]).toEqual([]);
    }

    @Test('loads lazy children through the host callback')
    async lazyLoads() {
        const { root, tree } = await this.mount();
        const lazyRow = tree.viewItems.find(row => row.key === 'lazy');
        expect(!!lazyRow).toEqual(true);
        tree.toggle(lazyRow!, {} as any);
        for (let index = 0; index < 8; index++) await Promise.resolve();
        expect(tree.viewItems.some(row => row.key === 'lazy-child')).toEqual(true);
        expect(root.textContent).toContain('Loaded child');
    }
}
