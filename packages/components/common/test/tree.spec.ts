import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TreeComponent, TreeModule } from '../tree';

@Component({
    selector: 'tree-host',
    imports: [TreeComponent],
    template: `<ui-tree :items="items" :expandedIds="['root']" :selectAction="onSelect"></ui-tree>`
})
class TreeHostComponent {
    selected = '';
    items = [
        { id: 'root', label: 'Root', children: [
            { id: 'child', label: 'Child' },
            { id: 'leaf', label: 'Leaf' }
        ] }
    ];
    onSelect = (node: any) => { this.selected = node.id; };
}

@Suite('common tree')
export class TreeTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TreeHostComponent, {
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

    protected async mount(): Promise<{ tree: TreeComponent; host: TreeHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(TreeHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TreeHostComponent>;
        await ref.render();
        const tree = (ref.hostView.query(TreeComponent) as ComponentRef<TreeComponent>).instance;
        return { tree, host: ref.instance as TreeHostComponent };
    }

    @Test('windows very large trees around the active row')
    async windowsRows() {
        const { tree } = await this.mount();
        tree.maxVisible = 2;
        await Promise.resolve();
        expect(tree.visibleRows.length).toEqual(2);
        tree.onKeydown(tree.viewItems[0], { key: 'End', preventDefault() { } });
        await Promise.resolve();
        expect(tree.visibleRows.length).toEqual(2);
        expect(tree.visibleRows.some(row => row.key === tree.activeRow()?.key)).toBe(true);
    }

    @Test('reorders visible tree rows by drag and Alt+Arrow')
    async reordersRows() {
        const { tree } = await this.mount();
        tree.draggable = true;
        let order: string[] = [];
        tree.reorderAction = ids => { order = ids; };
        tree.dragStart(tree.viewItems[0], { dataTransfer: { setData() { } } });
        tree.dropOn(tree.viewItems[1], { preventDefault() { } });
        tree.onKeydown(tree.viewItems[1], { key: 'ArrowDown', altKey: true, preventDefault() { } });
        expect(order.length).toBeGreaterThan(0);
        expect(order).toContain('root');
    }

    @Test('type-ahead moves selection to the next matching label')
    async typeahead() {
        const { tree } = await this.mount();
        tree.onKeydown(tree.viewItems[0], { key: 'l', preventDefault() { } });
        await Promise.resolve();
        expect(tree.selectedId).toEqual('leaf');
        tree.onKeydown(tree.viewItems[2], { key: 'c', preventDefault() { } });
        await Promise.resolve();
        expect(tree.selectedId).toEqual('child');
    }

    @Test('filters rows while keeping ancestor paths visible')
    async filtersRows() {
        const { tree } = await this.mount();
        tree.filter = 'leaf';
        await Promise.resolve();
        expect(tree.viewItems.map(row => row.key)).toEqual(['root', 'leaf']);
        tree.filter = 'missing';
        await Promise.resolve();
        expect(tree.viewItems).toEqual([]);
    }

    @Test('selection follows focus by default')
    async followsFocus() {
        const { tree, host } = await this.mount();
        const root = tree.viewItems[0];
        tree.onKeydown(root, { key: 'ArrowDown', preventDefault() { } });
        await Promise.resolve();
        expect(tree.selectedId).toEqual('child');
        expect(host.selected).toEqual('child');
        expect(tree.viewItems[1].selected).toEqual(true);
    }

    @Test('pickers can rove focus without committing until activation')
    async activateOnly() {
        const { tree, host } = await this.mount();
        tree.selectionFollowsFocus = false;
        tree.onKeydown(tree.viewItems[0], { key: 'ArrowDown', preventDefault() { } });
        await Promise.resolve();
        expect(tree.selectedId).toEqual('');
        expect(host.selected).toEqual('');
        expect(tree.viewItems[1].active).toEqual(true);

        tree.onKeydown(tree.viewItems[1], { key: 'Enter', preventDefault() { } });
        await Promise.resolve();
        expect(tree.selectedId).toEqual('child');
        expect(host.selected).toEqual('child');
    }
}
