import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AvatarComponent, AvatarModule } from '../avatar';
import { PaginationComponent, PaginationModule } from '../pagination';
import { DataTableComponent, DataTableModule } from '../data-table';
import { TreeComponent, TreeModule, TreeNode } from '../tree';

@Component({
    selector: 'p2-ui-host',
    imports: [AvatarComponent, PaginationComponent, DataTableComponent, TreeComponent],
    template: `
    <ui-avatar label="Ada Lovelace" size="lg" status="online"></ui-avatar>
    <ui-avatar label="Bob" shape="square" tone="accent"></ui-avatar>
    <ui-pagination :total="100" :pageSize="10" :page="5" :changeAction="onPage"></ui-pagination>
    <ui-data-table :columns="columns" :rows="rows" rowKey="id"
        emptyLabel="No rows" :rowAction="onRow"></ui-data-table>
    <ui-tree :items="tree" :expandedIds="expanded"
        :selectAction="onNode" :toggleAction="onToggle"></ui-tree>`
})
class P2UiHostComponent {
    page = 5;
    selectedRow = '';
    selectedNode = '';
    toggled = '';
    columns = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value', align: 'right' }
    ];
    rows = [
        { id: 'a', name: 'Alpha', value: 1 },
        { id: 'b', name: 'Beta', value: 2 }
    ];
    tree: TreeNode[] = [
        { id: 'root', label: 'Root', children: [
            { id: 'child', label: 'Child' }
        ] }
    ];
    expanded = ['root'];
    onPage = (page: number) => { this.page = page; };
    onRow = (row: { id: string }) => { this.selectedRow = row.id; };
    onNode = (node: TreeNode) => { this.selectedNode = String(node.id); };
    onToggle = (node: TreeNode, expanded: boolean) => { this.toggled = `${node.id}:${expanded}`; };
}

@Suite('common P2 UI widgets')
export class P2UiWidgetsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(P2UiHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                AvatarModule,
                PaginationModule,
                DataTableModule,
                TreeModule
            ],
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

    protected async mount(): Promise<ComponentRef<P2UiHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(P2UiHostComponent, {
            injector: this.ctx
        }) as ComponentRef<P2UiHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('avatar derives initials, shape and status classes')
    async avatar() {
        const ref = await this.mount();
        const avatars = ref.hostView.queryAll(AvatarComponent) as ComponentRef<AvatarComponent>[];
        const first = avatars[0].hostView.rootNodes[0] as HTMLElement;
        const second = avatars[1].hostView.rootNodes[0] as HTMLElement;

        expect(avatars[0].instance.initials).toEqual('AL');
        expect(first.textContent).toContain('AL');
        expect(first.className).toContain('is-circle');
        expect(first.className).toContain('is-online');
        expect(first.querySelector('.ui-avatar-status')).toBeTruthy();

        expect(second.textContent).toContain('BO');
        expect(second.className).toContain('is-square');
        expect(second.getAttribute('data-tone')).toEqual('accent');
    }

    @Test('pagination derives pages and dispatches the selected page')
    async pagination() {
        const ref = await this.mount();
        const host = ref.instance as P2UiHostComponent;
        const pagination = ref.hostView.query(PaginationComponent) as ComponentRef<PaginationComponent>;
        const root = pagination.hostView.rootNodes[0] as HTMLElement;

        expect(pagination.instance.totalPages).toEqual(10);
        expect(pagination.instance.currentPage).toEqual(5);
        expect(root.querySelector('.ui-pagination-page.is-current')?.textContent).toEqual('5');

        const pages = root.querySelectorAll('.ui-pagination-page') as NodeListOf<HTMLButtonElement>;
        const six = Array.from(pages).find(button => button.textContent === '6') as HTMLButtonElement;
        six.click();
        expect(host.page).toEqual(6);
    }

    @Test('data table renders headers/cells and dispatches a row')
    async dataTable() {
        const ref = await this.mount();
        const host = ref.instance as P2UiHostComponent;
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const root = table.hostView.rootNodes[0] as HTMLElement;

        expect(root.querySelectorAll('[role="columnheader"]').length).toEqual(2);
        expect(root.textContent).toContain('Alpha');
        expect(root.textContent).toContain('Beta');
        expect(root.querySelectorAll('.ui-data-table-row').length).toEqual(2);
        expect(root.querySelector('.ui-data-table-row .ui-data-table-cell.is-right')?.textContent).toEqual('1');

        (root.querySelectorAll('.ui-data-table-row')[1] as HTMLElement).click();
        expect(host.selectedRow).toEqual('b');
    }

    @Test('tree flattens expanded children and toggles expansion')
    async tree() {
        const ref = await this.mount();
        const host = ref.instance as P2UiHostComponent;
        const tree = ref.hostView.query(TreeComponent) as ComponentRef<TreeComponent>;
        const root = tree.hostView.rootNodes[0] as HTMLElement;

        expect(root.querySelectorAll('.ui-tree-node').length).toEqual(2);
        expect(root.textContent).toContain('Root');
        expect(root.textContent).toContain('Child');
        expect(root.querySelector('.ui-tree-node.is-selected')).toBeFalsy();

        (root.querySelectorAll('.ui-tree-row')[1] as HTMLElement).click();
        expect(host.selectedNode).toEqual('child');

        const toggle = root.querySelector('.ui-tree-toggle:not(.is-leaf)') as HTMLElement;
        toggle.click();
        expect(host.toggled).toEqual('root:false');
        await Promise.resolve();
        expect(root.querySelectorAll('.ui-tree-node').length).toEqual(1);
    }
}
