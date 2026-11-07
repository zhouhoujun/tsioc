import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { Before, Suite, Test } from '@tsdi/unit';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TabBarComponent, TabBarSource } from '../src';

const source: TabBarSource = {
    visible: true,
    items: [
        { id: 'a', label: ' Alpha ', active: true, showClose: true },
        { id: 'b', label: ' Beta ', active: false, showClose: false }
    ],
    showCreate: true,
    createLabel: ' + ',
    closeLabel: 'x',
    select() { },
    create() { },
    close() { }
};

@Suite('common tab bar DOM interactions')
export class TabBarDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TabBarComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                { provide: TabBarComponent, useClass: TabBarComponent },
                {
                    provide: 'TAB_BAR_DOM_TEST_SOURCE',
                    useValue: source
                },
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
    }

    @Test('clicking the close affordance closes without selecting the tab')
    async closeDoesNotSelect() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const selected: string[] = [];
        const closed: string[] = [];
        ref.instance.source = {
            ...source,
            select: id => selected.push(id),
            close: id => closed.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        root.querySelector('.tab-close').click();
        await Promise.resolve();
        expect(closed).toEqual(['a']);
        expect(selected).toEqual([]);
    }
}
