import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

@Component({
    selector: 'data-table-expand-host',
    imports: [DataTableComponent],
    template: `
    <ui-data-table :columns="columns" :rows="rows" rowKey="id" expandable
        :expandedKeys="expanded" :expandAction="onExpand" :detailLines="details"
        :rowAction="onRow"></ui-data-table>`
})
class DataTableExpandHostComponent {
    columns = [{ key: 'name', label: 'Name' }];
    rows = [
        { id: 'a', name: 'alpha' },
        { id: 'b', name: 'beta' }
    ];
    expanded: string[] = [];
    picked = '';
    onExpand = (key: string, expanded: boolean) => {
        this.expanded = expanded
            ? [...this.expanded, key]
            : this.expanded.filter(entry => entry !== key);
    };
    onRow = (row: any) => { this.picked = row.id; };
    details = (row: any) => [`detail ${row.name}`, 'second line'];
}

@Suite('common data table expandable rows')
export class DataTableExpandTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DataTableExpandHostComponent, {
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

    protected async mount(): Promise<{ ref: ComponentRef<DataTableExpandHostComponent>; root: HTMLElement; host: DataTableExpandHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DataTableExpandHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DataTableExpandHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        return {
            ref,
            root: table.hostView.rootNodes[0] as HTMLElement,
            host: ref.instance as DataTableExpandHostComponent
        };
    }

    @Test('expands a row with host detail lines and toggles it back')
    async expandsRow() {
        const { root, host } = await this.mount();
        const expanders = () => Array.from(root.querySelectorAll('.ui-data-table-expander') as NodeListOf<HTMLElement>);
        const details = () => Array.from(root.querySelectorAll('.ui-data-table-detail-row') as NodeListOf<HTMLElement>);

        expect(expanders().length).toEqual(2);
        expect(expanders()[0].getAttribute('aria-expanded')).toEqual('false');
        expect(expanders()[0].getAttribute('aria-label')).toEqual('Expand row');

        expanders()[0].click();
        await Promise.resolve();
        expect(host.expanded).toEqual(['a']);
        expect(expanders()[0].getAttribute('aria-expanded')).toEqual('true');
        expect(expanders()[0].getAttribute('aria-label')).toEqual('Collapse row');
        expect(details().length).toEqual(1);
        expect(details()[0].textContent).toContain('detail alpha');
        expect(details()[0].textContent).toContain('second line');
        // Toggling the expander must not also run the row action.
        expect(host.picked).toEqual('');

        expanders()[0].click();
        await Promise.resolve();
        expect(host.expanded).toEqual([]);
        expect(details().length).toEqual(0);
    }

    @Test('keyboard toggles the expander and row clicks still dispatch')
    async keyboardAndRow() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const expanders = () => Array.from(root.querySelectorAll('.ui-data-table-expander') as NodeListOf<HTMLElement>);

        expanders()[1].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        await Promise.resolve();
        expect(host.expanded).toEqual(['b']);
        expect(root.querySelectorAll('.ui-data-table-detail-row').length).toEqual(1);

        (root.querySelector('.ui-data-table-row') as HTMLElement).click();
        expect(host.picked).toEqual('a');
    }
}
