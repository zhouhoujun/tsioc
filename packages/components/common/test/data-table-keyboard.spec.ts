import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

@Component({
    selector: 'data-table-keyboard-host',
    imports: [DataTableComponent],
    template: `
    <ui-data-table :columns="columns" :rows="rows" rowKey="id" keyboardNavigation
        selectable :selectionAction="onSelection" :rowAction="onRow"></ui-data-table>`
})
class DataTableKeyboardHostComponent {
    columns = [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' }
    ];
    rows = [
        { id: 'a', name: 'Alpha', role: 'admin' },
        { id: 'b', name: 'Beta', role: 'writer' }
    ];
    picked = '';
    selection: string[] = [];
    onRow = (row: any) => { this.picked = row.id; };
    onSelection = (keys: string[]) => { this.selection = keys.slice(); };
}

@Suite('common data table keyboard')
export class DataTableKeyboardTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableKeyboardHostComponent, {
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

    protected async mount(): Promise<{ root: HTMLElement; host: DataTableKeyboardHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableKeyboardHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTableKeyboardHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        return { root: table.hostView.rootNodes[0] as HTMLElement, host: ref.instance as DataTableKeyboardHostComponent };
    }

    @Test('roves data cells, activates and selects rows')
    async rovesCells() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const cells = () => Array.from(root.querySelectorAll('.is-data-cell') as NodeListOf<HTMLElement>);
        const key = async (cell: HTMLElement, name: string) => {
            cell.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
            await Promise.resolve();
        };

        expect(cells().length).toEqual(4);
        expect(cells()[0].getAttribute('tabindex')).toEqual('0');
        expect(cells()[1].getAttribute('tabindex')).toEqual('-1');

        await key(cells()[0], 'ArrowRight');
        expect(cells()[1].getAttribute('tabindex')).toEqual('0');
        expect(cells()[0].getAttribute('tabindex')).toEqual('-1');
        await key(cells()[1], 'ArrowDown');
        expect(cells()[3].getAttribute('tabindex')).toEqual('0');
        await key(cells()[3], 'Home');
        expect(cells()[2].getAttribute('tabindex')).toEqual('0');
        await key(cells()[2], 'End');
        expect(cells()[3].getAttribute('tabindex')).toEqual('0');
        await key(cells()[3], 'ArrowUp');
        expect(cells()[1].getAttribute('tabindex')).toEqual('0');

        await key(cells()[0], 'Enter');
        expect(host.picked).toEqual('a');
        await key(cells()[0], ' ');
        expect(host.selection).toEqual(['a']);
        expect(cells()[0].closest('.ui-data-table-row')?.classList.contains('is-selected')).toEqual(true);
    }
}
