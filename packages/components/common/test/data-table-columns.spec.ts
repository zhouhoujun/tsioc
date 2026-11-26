import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

@Component({
    selector: 'data-table-columns-host',
    imports: [DataTableComponent],
    template: `
    <ui-data-table :columns="columns" :rows="rows" rowKey="id" resizableColumns
        :columnOrder="columnOrder" :hiddenColumns="hiddenColumns"
        :columnWidths="columnWidths" :columnChangeAction="onColumns"></ui-data-table>`
})
class DataTableColumnsHostComponent {
    columns = [
        { key: 'name', label: 'Name', width: 80, fixed: 'left' },
        { key: 'team', label: 'Team', width: 60, fixed: 'left' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status', width: 70, fixed: 'right' }
    ];
    rows = [
        { id: 'a', name: 'Alpha', team: 'Core', role: 'admin', status: 'active' },
        { id: 'b', name: 'Beta', team: 'Docs', role: 'writer', status: 'idle' }
    ];
    columnOrder: string[] = [];
    hiddenColumns: string[] = [];
    columnWidths: Record<string, number> = {};
    columnState: any;
    onColumns = (state: any) => { this.columnState = state; };
}

@Suite('common data table columns')
export class DataTableColumnsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableColumnsHostComponent, {
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

    protected async mount(): Promise<{ root: HTMLElement; ref: ComponentRef<DataTableColumnsHostComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableColumnsHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTableColumnsHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        return { root: table.hostView.rootNodes[0] as HTMLElement, ref };
    }

    @Test('marks sticky columns and stacks their offsets')
    async fixedColumns() {
        const { root } = await this.mount();
        const headers = Array.from(root.querySelectorAll('.ui-data-table-head .ui-data-table-cell') as NodeListOf<HTMLElement>);
        const firstRow = root.querySelector('.ui-data-table-row') as HTMLElement;
        const cells = Array.from(firstRow.querySelectorAll('.ui-data-table-cell') as NodeListOf<HTMLElement>);

        expect(root.querySelector('.ui-data-table-scroll')).toBeTruthy();
        expect(headers[0].classList.contains('is-fixed-left')).toEqual(true);
        expect(headers[1].classList.contains('is-fixed-left')).toEqual(true);
        expect(headers[3].classList.contains('is-fixed-right')).toEqual(true);
        expect(headers[0].style.getPropertyValue('--ui-sticky-offset')).toEqual('0px');
        expect(headers[1].style.getPropertyValue('--ui-sticky-offset')).toEqual('calc(80px)');
        expect(headers[3].style.getPropertyValue('--ui-sticky-offset')).toEqual('0px');
        expect(cells[0].classList.contains('is-fixed-left')).toEqual(true);
        expect(cells[1].style.getPropertyValue('--ui-sticky-offset')).toEqual('calc(80px)');
        expect(cells[3].classList.contains('is-fixed-right')).toEqual(true);
    }

    @Test('reorders and hides columns through controlled layout inputs')
    async layoutConfig() {
        const { root, ref } = await this.mount();
        const host = ref.instance as DataTableColumnsHostComponent;
        host.columnOrder = ['status', 'name'];
        host.hiddenColumns = ['team'];
        for (let index = 0; index < 4; index++) await Promise.resolve();
        const labels = Array.from(root.querySelectorAll('.ui-data-table-head .ui-data-table-cell'))
            .map(item => item.textContent?.trim())
            .filter(Boolean);
        expect(labels.length).toEqual(3);
        expect(labels[0]).toContain('Status');
        expect(labels[1]).toContain('Name');
        expect(labels.join(' ')).not.toContain('Team');
    }

    @Test('resizes a column through the header handle')
    async resizesColumn() {
        const { root, ref } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const header = root.querySelector('.ui-data-table-head .ui-data-table-cell') as HTMLElement;
        const resizer = header.querySelector('.ui-data-table-resizer') as HTMLElement;

        expect(root.querySelectorAll('.ui-data-table-resizer').length).toEqual(4);
        resizer.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousedown', {
            bubbles: true,
            clientX: 10
        }));
        doc.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousemove', { clientX: 50 }));
        await Promise.resolve();
        expect(header.style.width).toEqual('120px');
        doc.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseup'));

        doc.dispatchEvent(new (doc.defaultView as any).MouseEvent('mousemove', { clientX: 90 }));
        await Promise.resolve();
        expect(header.style.width).toEqual('120px');

        const host = ref.instance as DataTableColumnsHostComponent;
        expect(host.columnState?.widths?.name).toEqual(120);
        expect(host.columnState?.order).toEqual(['name', 'team', 'role', 'status']);
    }

    @Test('resetColumnLayout restores the declarative layout and emits it')
    async resetLayout() {
        const { root, ref } = await this.mount();
        const host = ref.instance as DataTableColumnsHostComponent;
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        host.columnOrder = ['status', 'name'];
        host.hiddenColumns = ['team'];
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(root.querySelectorAll('.ui-data-table-head .ui-data-table-cell').length).toEqual(3);

        const state = table.instance.resetColumnLayout();
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(state).toEqual({ order: ['name', 'team', 'role', 'status'], hidden: [], widths: {} });
        expect(host.columnState).toEqual(state);
        expect(root.querySelectorAll('.ui-data-table-head .ui-data-table-cell').length).toEqual(4);
        expect(host.columnState?.order).toEqual(['name', 'team', 'role', 'status']);
    }
}
