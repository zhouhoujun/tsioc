import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { ComponentRef, ComponentsModule, Component } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'html-vfor-scope-regression',
    template: `
    <section>
        <p class="row" v-for="item in items">{{title}} {{item.label}}</p>
    </section>
    `
})
class HtmlVForScopeRegressionComponent {
    title = 'Chat';
    items = [
        { label: 'One' },
        { label: 'Two' }
    ];
}

@Suite('HTML VFor Regression Test')
export class HtmlVForRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(HtmlVForScopeRegressionComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
            ]
        });
    }

    @Test('updates reused v-for view context values with inherited parent scope bindings')
    async updatesReusedVForViewContextValuesWithInheritedParentScope() {
        const ref = this.ctx.runners.getRef(HtmlVForScopeRegressionComponent) as ComponentRef<HtmlVForScopeRegressionComponent>;
        const root = ref.hostView.rootNodes[0] as any;

        const initialRows = Array.from(root.querySelectorAll('.row')).map((node: any) => node.textContent?.trim());
        expect(initialRows).toEqual(['Chat One', 'Chat Two']);

        ref.instance.items = [
            { label: 'One' },
            { label: 'Updated' }
        ];
        await Promise.resolve();

        const updatedRows = Array.from(root.querySelectorAll('.row')).map((node: any) => node.textContent?.trim());
        expect(updatedRows).toEqual(['Chat One', 'Chat Updated']);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}
