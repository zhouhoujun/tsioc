import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DataTableComponent, DataTableModule } from '../data-table';

async function settle(): Promise<void> {
    for (let index = 0; index < 20; index++) await Promise.resolve();
}

@Suite('common data-table virtual window')
export class DataTableVirtualTest {
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
        const table = ref.instance;
        table.columns = [{ key: 'name', label: 'Name' }];
        table.rows = Array.from({ length: 100 }, (_value, index) => ({ id: String(index), name: `row-${index}` }));
        return { ref, table };
    }

    @Test('windows rows around scrollTop and exposes spacer heights')
    async windowsRows() {
        const { ref, table } = await this.mount();
        table.virtual = true;
        table.virtualRowHeight = 20;
        table.virtualOverscan = 2;
        table.viewportHeight = 60;
        table.scrollTop = 200;
        await settle();

        expect(table.virtualWindow.start).toEqual(8);
        expect(table.virtualWindow.end).toEqual(15);
        expect(table.virtualTopHeight).toEqual(160);
        expect(table.virtualBottomHeight).toEqual(1700);
        expect(table.viewRows.length).toEqual(7);
        expect(table.viewRows[0].index).toEqual(8);
        expect(table.viewRows[6].index).toEqual(14);
        expect(table.spacerStyle(20)).toEqual({ height: '20px' });

        await ref.render();
        await settle();
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        const spacers = root.querySelectorAll('.ui-data-table-spacer');
        expect(spacers.length).toEqual(2);
        expect((spacers[0] as HTMLElement).style.height).toEqual('160px');
        ref.destroy();
    }

    @Test('onScroll updates the host contract and pagination disables windowing')
    async scrollAndPagination() {
        const { ref, table } = await this.mount();
        const ranges: Array<[number, number, number]> = [];
        table.virtual = true;
        table.virtualRowHeight = 20;
        table.virtualOverscan = 2;
        table.viewportHeight = 60;
        table.windowAction = (start, end, total) => ranges.push([start, end, total]);
        table.onScroll({ currentTarget: { scrollTop: 400, clientHeight: 60 } });
        expect(table.scrollTop).toEqual(400);
        expect(table.viewportHeight).toEqual(60);
        expect(ranges).toEqual([[18, 25, 100]]);
        expect(table.viewRows[0].index).toEqual(18);

        table.pagination = true;
        table.pageSize = 5;
        await settle();
        expect(table.viewRows.length).toEqual(5);
        expect(table.virtualTopHeight).toEqual(0);
        expect(table.virtualBottomHeight).toEqual(0);
        ref.destroy();
    }

    @Test('virtual off renders every row')
    async offByDefault() {
        const { ref, table } = await this.mount();
        expect(table.viewRows.length).toEqual(100);
        expect(table.virtualTopHeight).toEqual(0);
        ref.destroy();
    }
}
