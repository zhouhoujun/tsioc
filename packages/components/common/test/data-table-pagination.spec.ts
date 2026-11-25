import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

@Component({
    selector: 'data-table-page-host',
    imports: [DataTableComponent],
    template: `
    <ui-data-table :columns="columns" :rows="rows" rowKey="id"
        pagination :pageSize="2" :page="page" :pageChangeAction="onPage"></ui-data-table>`
})
class DataTablePageHostComponent {
    page = 1;
    columns = [{ key: 'name', label: 'Name', sortable: true }];
    rows = [
        { id: 'a', name: 'alpha' },
        { id: 'b', name: 'beta' },
        { id: 'c', name: 'gamma' },
        { id: 'd', name: 'delta' },
        { id: 'e', name: 'epsilon' }
    ];
    onPage = (page: number) => { this.page = page; };
}

@Suite('common data table pagination')
export class DataTablePaginationTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTablePageHostComponent, {
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

    protected async mount(): Promise<{ ref: ComponentRef<DataTablePageHostComponent>; root: HTMLElement; table: ComponentRef<DataTableComponent>; host: DataTablePageHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTablePageHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTablePageHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        return {
            ref,
            root: table.hostView.rootNodes[0] as HTMLElement,
            table,
            host: ref.instance as DataTablePageHostComponent
        };
    }

    @Test('pages rows and dispatches page changes')
    async pagesRows() {
        const { root, host, table } = await this.mount();
        const texts = () => Array.from(root.querySelectorAll('.ui-data-table-row') as NodeListOf<HTMLElement>)
            .map(row => row.textContent || '').join('|');

        expect(texts()).toContain('alpha');
        expect(texts()).toContain('beta');
        expect(texts()).not.toContain('gamma');
        expect(table.instance.pageCount).toEqual(3);
        expect(table.instance.currentPage).toEqual(1);

        const pages = Array.from(root.querySelectorAll('.ui-pagination-page') as NodeListOf<HTMLElement>);
        const second = pages.find(page => page.textContent === '2') as HTMLElement;
        expect(second.getAttribute('aria-current')).toEqual('');
        second.click();
        await Promise.resolve();
        expect(host.page).toEqual(2);
        expect(texts()).toContain('gamma');
        expect(texts()).toContain('delta');
        expect(texts()).not.toContain('alpha');

        const steps = root.querySelectorAll('.ui-pagination-step') as NodeListOf<HTMLElement>;
        steps[1].click();
        await Promise.resolve();
        expect(host.page).toEqual(3);
        expect(texts()).toContain('epsilon');
        expect(texts()).not.toContain('gamma');

        steps[0].click();
        await Promise.resolve();
        expect(host.page).toEqual(2);
    }

    @Test('sorts the full data set before slicing pages')
    async sortsAcrossPages() {
        const { root, table } = await this.mount();
        const header = root.querySelector('.ui-data-table-sortable') as HTMLElement;
        const texts = () => Array.from(root.querySelectorAll('.ui-data-table-row') as NodeListOf<HTMLElement>)
            .map(row => row.textContent || '').join('|');

        expect(header).toBeTruthy();
        header.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        header.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(table.instance.currentPage).toEqual(1);
        expect(texts()).toContain('epsilon');
        expect(texts()).toContain('gamma');
        expect(texts()).not.toContain('alpha');
    }

    @Test('clamps the current page and disables steps on a single page')
    async singlePageAndClamp() {
        const { root, table } = await this.mount();

        table.instance.page = 9;
        await Promise.resolve();
        expect(table.instance.currentPage).toEqual(3);

        table.instance.pageSize = 10;
        table.instance.page = 1;
        await Promise.resolve();
        expect(root.querySelector('.ui-pagination')).toBeTruthy();
        expect(root.querySelectorAll('.ui-data-table-row').length).toEqual(5);
        const steps = root.querySelectorAll('.ui-pagination-step') as NodeListOf<HTMLButtonElement>;
        expect(steps[0].disabled).toEqual(true);
        expect(steps[1].disabled).toEqual(true);
    }
}
