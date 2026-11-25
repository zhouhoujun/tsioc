import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

@Component({
    selector: 'data-table-host',
    imports: [DataTableComponent],
    template: `
    <ui-data-table :columns="columns" :rows="rows"
        :sortAction="onSort" :rowAction="onRow"
        rowKey="id" selectedKey="b" caption="Users"
        stickyHeader dense></ui-data-table>`
})
class DataTableHostComponent {
    columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'role', label: 'Role' }
    ];
    rows = [
        { id: 'b', name: 'beta', role: 'writer' },
        { id: 'a', name: 'alpha', role: 'reader' }
    ];
    sorted = '';
    picked = '';
    onSort = (key: string, direction: string) => { this.sorted = `${key}:${direction}`; };
    onRow = (row: any) => { this.picked = row.id; };
}

@Suite('common data table')
export class DataTableTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableHostComponent, {
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

    protected async mount(): Promise<ComponentRef<DataTableHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTableHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('sorts rows through sortable headers and exposes aria-sort')
    async sortsRows() {
        const ref = await this.mount();
        const host = ref.instance as DataTableHostComponent;
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const root = table.hostView.rootNodes[0] as HTMLElement;
        const rowNames = () => Array.from(root.querySelectorAll('.ui-data-table-row') as NodeListOf<HTMLElement>)
            .map(row => row.textContent?.trim());

        expect(root.textContent).toContain('Users');
        expect(root.classList.contains('is-sticky')).toBe(true);
        expect(root.classList.contains('is-dense')).toBe(true);
        expect(rowNames()[0]).toContain('beta');
        expect(root.querySelector('.ui-data-table-row.is-selected')?.textContent).toContain('beta');

        const header = root.querySelector('.ui-data-table-sortable') as HTMLElement;
        expect(header).toBeTruthy();
        header.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(host.sorted).toBe('name:asc');
        expect(header.getAttribute('aria-sort')).toBe('ascending');
        expect(rowNames()[0]).toContain('alpha');

        header.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(host.sorted).toBe('name:desc');
        expect(header.getAttribute('aria-sort')).toBe('descending');
        expect(rowNames()[0]).toContain('beta');

        (root.querySelector('.ui-data-table-row') as HTMLElement).click();
        expect(host.picked).toBe('b');
    }

    @Test('shows loading state instead of empty state')
    async loadingState() {
        const ref = await this.mount();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const root = table.hostView.rootNodes[0] as HTMLElement;

        table.instance.rows = [];
        table.instance.loading = true;
        await Promise.resolve();

        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(root.querySelector('.ui-data-table-loading')?.textContent).toContain('Loading');
        expect(root.querySelector('.ui-data-table-empty')).toBeFalsy();
    }
}
