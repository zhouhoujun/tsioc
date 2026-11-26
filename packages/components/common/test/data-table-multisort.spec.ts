import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule, DataTableSort } from '../data-table';

@Component({
    selector: 'data-table-multisort-host',
    imports: [DataTableComponent],
    template: `<ui-data-table :columns="columns" :rows="rows" rowKey="id" multiSort
        :sortsAction="onSorts"></ui-data-table>`
})
class DataTableMultiSortHostComponent {
    columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'age', label: 'Age', sortable: true }
    ];
    rows = [
        { id: 1, name: 'b', age: 2 },
        { id: 2, name: 'a', age: 3 },
        { id: 3, name: 'a', age: 1 },
        { id: 4, name: 'b', age: 1 }
    ];
    sorts: DataTableSort[][] = [];
    onSorts = (sorts: DataTableSort[]) => { this.sorts.push(sorts.map(item => ({ ...item }))); };
}

@Suite('common data table multi sort')
export class DataTableMultiSortTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableMultiSortHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, DataTableModule],
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

    protected async mount(): Promise<{ root: HTMLElement; host: DataTableMultiSortHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableMultiSortHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTableMultiSortHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        return { root: table.hostView.rootNodes[0] as HTMLElement, host: ref.instance as DataTableMultiSortHostComponent };
    }

    @Test('cycles sort priority and exposes mixed aria-sort states')
    async cyclesSorts() {
        const { root, host } = await this.mount();
        const headers = () => Array.from(root.querySelectorAll('.ui-data-table-sortable') as NodeListOf<HTMLElement>);
        const rows = () => Array.from(root.querySelectorAll('.ui-data-table-row') as NodeListOf<HTMLElement>)
            .map(row => row.getAttribute('data-row-key'));

        expect(rows()).toEqual(['1', '2', '3', '4']);
        headers()[0].click();
        await Promise.resolve();
        expect(rows()).toEqual(['2', '3', '1', '4']);
        expect(headers()[0].getAttribute('aria-sort')).toEqual('ascending');
        expect(headers()[1].getAttribute('aria-sort')).toEqual('none');

        headers()[1].click();
        await Promise.resolve();
        expect(rows()).toEqual(['3', '2', '4', '1']);
        expect(headers()[0].getAttribute('aria-sort')).toEqual('ascending');
        expect(headers()[1].getAttribute('aria-sort')).toEqual('ascending');
        expect(host.sorts[1]).toEqual([
            { key: 'name', direction: 'asc' },
            { key: 'age', direction: 'asc' }
        ]);

        headers()[0].click();
        await Promise.resolve();
        expect(rows()).toEqual(['4', '1', '3', '2']);
        expect(headers()[0].getAttribute('aria-sort')).toEqual('descending');
        expect(headers()[1].getAttribute('aria-sort')).toEqual('ascending');

        headers()[0].click();
        await Promise.resolve();
        expect(rows()).toEqual(['3', '4', '1', '2']);
        expect(headers()[0].getAttribute('aria-sort')).toEqual('none');
        expect(headers()[1].getAttribute('aria-sort')).toEqual('ascending');
        expect(host.sorts[3]).toEqual([{ key: 'age', direction: 'asc' }]);
    }
}
