import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

async function settle(): Promise<void> {
    for (let index = 0; index < 40; index++) await Promise.resolve();
}

@Suite('common data-table filters and render')
export class DataTableFilterTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
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

    private async mount(): Promise<{ ref: ComponentRef<DataTableComponent>; table: DataTableComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableComponent, { injector: this.ctx }) as ComponentRef<DataTableComponent>;
        await ref.render();
        await settle();
        return { ref, table: ref.instance };
    }

    @Test('local filters narrow rows, drive totals and use render callbacks')
    async localFilters() {
        const { ref, table } = await this.mount();
        let reported: Record<string, string> = {};
        table.columns = [{ key: 'name', label: 'Name', filterable: true, render: value => String(value ?? '').toUpperCase() }];
        table.rows = [{ id: '1', name: 'build' }, { id: '2', name: 'test' }, { id: '3', name: 'bundle' }];
        table.pagination = true;
        table.pageSize = 1;
        table.filterAction = filters => { reported = { ...filters }; };
        table.setFilter('name', 'bu');
        await settle();
        expect(reported).toEqual({ name: 'bu' });
        expect(table.tableTotal).toEqual(2);
        expect(table.currentPage).toEqual(1);
        expect(table.viewRows.length).toEqual(1);
        expect(table.viewRows[0].cells.map(cell => cell.text)).toEqual(['BUILD']);
        expect(table.viewRows[0].index).toEqual(0);

        table.clearFilters();
        await settle();
        expect(table.tableTotal).toEqual(3);
        expect(table.viewRows[0].cells.map(cell => cell.text)).toEqual(['BUILD']);
        ref.destroy();
    }

    @Test('async sources receive the active filters and reload on change')
    async asyncFilters() {
        const { ref, table } = await this.mount();
        const calls: any[] = [];
        table.columns = [{ key: 'name', label: 'Name', filterable: true, sortable: true }];
        table.pageSize = 2;
        table.pagination = true;
        table.source = async request => {
            calls.push(request);
            const rows = [
                { id: '1', name: 'build' },
                { id: '2', name: 'test' },
                { id: '3', name: 'bundle' }
            ].filter(row => !request.filters?.name || row.name.includes(request.filters.name));
            return { rows: rows.slice(0, request.pageSize), total: rows.length };
        };
        await table.reload();
        expect(calls[calls.length - 1].filters).toBeUndefined();

        table.setFilter('name', 'bu');
        await settle();
        expect(calls[calls.length - 1].filters).toEqual({ name: 'bu' });
        expect(table.tableRows.map(row => row.name)).toEqual(['build', 'bundle']);
        expect(table.tableTotal).toEqual(2);
        ref.destroy();
    }
}
