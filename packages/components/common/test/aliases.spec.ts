import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { PanelComponent, PanelModule } from '../panel';
import { ListComponent, ListModule } from '../list';
import { TabsComponent, TabsModule } from '../tabs';

@Component({
    selector: 'alias-host',
    imports: [PanelComponent, ListComponent, TabsComponent],
    template: `
    <ui-panel :items="[{ text: 'row' }]"></ui-panel>
    <ui-list :items="[{ id: 'a', label: 'Alpha' }]"></ui-list>
    <ui-tabs strip-only></ui-tabs>`
})
class AliasHostComponent { }

@Suite('common ui selector aliases')
export class CommonSelectorAliasesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AliasHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, PanelModule, ListModule, TabsModule],
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

    @Test('legacy widgets resolve through their ui- aliases')
    async resolvesAliases() {
        const ref = this.ctx.get(ComponentFactory).create(AliasHostComponent, {
            injector: this.ctx
        }) as ComponentRef<AliasHostComponent>;
        await ref.render();
        await Promise.resolve();

        expect(ref.hostView.query(PanelComponent)).toBeTruthy();
        expect(ref.hostView.query(ListComponent)).toBeTruthy();
        expect(ref.hostView.query(TabsComponent)).toBeTruthy();
    }
}
