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
        :sortAction="onSort" :rowAction="onRow" :selectionAction="onSelection"
        rowKey="id" selectedKey="b" caption="Users" selectable
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
    selection: string[] = [];
    onSort = (key: string, direction: string) => { this.sorted = `${key}:${direction}`; };
    onRow = (row: any) => { this.picked = row.id; };
    onSelection = (keys: string[]) => { this.selection = keys.slice(); };
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
        const content = root.querySelector('.ui-data-table-content') as HTMLElement;

        table.instance.rows = [];
        table.instance.loading = true;
        await Promise.resolve();

        expect(content.getAttribute('aria-busy')).toBe('true');
        expect(content.getAttribute('role')).toEqual('table');
        expect(root.querySelector('.ui-data-table-loading')?.textContent).toContain('Loading');
        expect(root.querySelector('.ui-data-table-empty')).toBeFalsy();
    }

    @Test('filters rows through filterable column inputs')
    async columnFilters() {
        const ref = await this.mount();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        table.instance.columns = [
            { key: 'name', label: 'Name', filterable: true },
            { key: 'role', label: 'Role', filterable: true }
        ];
        table.instance.rows = [
            { id: 'b', name: 'beta', role: 'writer' },
            { id: 'a', name: 'alpha', role: 'reader' },
            { id: 'c', name: 'alpine', role: 'writer' }
        ];
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        const filters = Array.from(root.querySelectorAll('.ui-data-table-filter')) as HTMLInputElement[];
        expect(filters.length).toBe(2);

        filters[0].value = 'alp';
        filters[0].dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.Event('input', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        expect(root.querySelectorAll('.ui-data-table-row').length).toBe(2);

        filters[1].value = 'reader';
        filters[1].dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.Event('input', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        expect(root.querySelectorAll('.ui-data-table-row').length).toBe(1);
        expect(root.textContent).toContain('alpha');

        const clear = root.querySelector('.ui-data-table-filter-clear') as HTMLElement;
        expect(clear).toBeTruthy();
        clear.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(table.instance.filters).toEqual({});
        expect(root.querySelectorAll('.ui-data-table-row').length).toBe(3);
    }

    @Test('multi-select toggles rows and reports the tri-state select-all')
    async multiSelect() {
        const ref = await this.mount();
        const host = ref.instance as DataTableHostComponent;
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const root = table.hostView.rootNodes[0] as HTMLElement;
        const header = root.querySelector('.ui-data-table-head .ui-data-table-check') as HTMLElement;
        const rowChecks = () => Array.from(root.querySelectorAll('.ui-data-table-row .ui-data-table-check')) as HTMLElement[];

        expect(header.getAttribute('role')).toEqual('checkbox');
        expect(header.getAttribute('aria-label')).toEqual('Select all rows');
        expect(header.getAttribute('aria-checked')).toEqual('false');
        expect(rowChecks()[0].getAttribute('aria-label')).toEqual('Select row 1');

        rowChecks()[0].click();
        await Promise.resolve();
        expect(host.selection).toEqual(['b']);
        // Toggling the checkbox must not also fire the row action.
        expect(host.picked).toEqual('');
        expect(rowChecks()[0].getAttribute('aria-checked')).toEqual('true');
        expect(header.getAttribute('aria-checked')).toEqual('mixed');

        header.click();
        await Promise.resolve();
        expect(host.selection.sort()).toEqual(['a', 'b']);
        expect(header.getAttribute('aria-checked')).toEqual('true');
        expect(rowChecks().every(check => check.getAttribute('aria-checked') === 'true')).toEqual(true);

        header.click();
        await Promise.resolve();
        expect(host.selection).toEqual([]);
        expect(header.getAttribute('aria-checked')).toEqual('false');
    }
}
