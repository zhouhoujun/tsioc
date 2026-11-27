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

@Suite('common data-table async source')
export class DataTableAsyncTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useFactory: () => {
                const { JSDOM } = require('jsdom');
                return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
            } }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    private async mount(): Promise<DataTableComponent> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableComponent, { injector: this.ctx }) as ComponentRef<DataTableComponent>;
        await ref.render();
        await settle();
        return ref.instance;
    }

    @Test('loads the first page and page changes refetch with the current sort')
    async pages() {
        const calls: any[] = [];
        const table = await this.mount();
        table.columns = [{ key: 'name', label: 'Name', sortable: true }];
        table.pageSize = 2;
        table.pagination = true;
        table.source = async request => {
            calls.push(request);
            const all = [{ id: '1', name: 'a' }, { id: '2', name: 'b' }, { id: '3', name: 'c' }];
            const start = (request.page - 1) * request.pageSize;
            return { rows: all.slice(start, start + request.pageSize), total: all.length };
        };
        await table.reload();
        expect(table.tableRows.map(row => row.name)).toEqual(['a', 'b']);
        expect(table.tableTotal).toEqual(3);
        table.goToPage(2);
        await settle();
        expect(table.tableRows.map(row => row.name)).toEqual(['c']);
        table.sort({ key: 'name', label: 'Name', sortable: true } as any);
        await settle();
        expect(calls.some(call => call.sortKey === 'name')).toEqual(true);
    }

    @Test('keeps filters, sorts and selection while paging server rows')
    async serverState() {
        const calls: any[] = [];
        const table = await this.mount();
        table.columns = [{ key: 'name', label: 'Name', sortable: true }];
        table.pageSize = 2;
        table.pagination = true;
        table.selectable = true;
        table.multiSort = true;
        table.filters = { name: 'a' };
        table.selectedKeys = ['1'];
        table.sorts = [{ key: 'name', direction: 'asc' }];
        table.source = async request => {
            calls.push(request);
            return { rows: [{ id: String(request.page), name: 'a' }], total: 6 };
        };
        await table.reload();
        table.goToPage(3);
        await settle();
        const last = calls[calls.length - 1];
        expect(last.page).toEqual(3);
        expect(last.filters).toEqual({ name: 'a' });
        expect(last.sorts).toEqual([{ key: 'name', direction: 'asc' }]);
        expect(table.selectedKeys).toEqual(['1']);
    }

    @Test('surfaces source errors and retries')
    async errors() {
        const table = await this.mount();
        table.columns = [{ key: 'name', label: 'Name' }];
        let fail = true;
        table.source = async () => {
            if (fail) throw new Error('boom');
            return { rows: [{ id: '1', name: 'ok' }], total: 1 };
        };
        await table.reload();
        expect(table.asyncError).toContain('boom');
        fail = false;
        table.retry();
        await settle();
        expect(table.asyncError).toEqual('');
        expect(table.tableRows.length).toEqual(1);
    }
}
