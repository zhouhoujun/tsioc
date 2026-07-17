import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule, Component } from '@tsdi/components';
import { XmlTemplateModule } from '../src';

@Component({
    selector: 'xml-vfor-scope-regression',
    template: `
    <section>
        <p class="row" v-for="item in items">{{title}} {{item.label}}</p>
    </section>
    `
})
class XmlVForScopeRegressionComponent {
    title = 'Chat';
    items = [
        { label: 'One' },
        { label: 'Two' }
    ];
}

@Suite('XML VFor Regression Test')
export class XmlVForRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(XmlVForScopeRegressionComponent, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
    }

    @Test('updates reused v-for view context values with inherited parent scope bindings')
    async updatesReusedVForViewContextValuesWithInheritedParentScope() {
        const ref = this.ctx.runners.getRef(XmlVForScopeRegressionComponent) as ComponentRef<XmlVForScopeRegressionComponent>;
        const root = ref.hostView.rootNodes[0] as any;

        const initialRows = root.querySelectorAll('.row').map((node: any) => node.textContent?.trim());
        expect(initialRows).toEqual(['Chat One', 'Chat Two']);

        ref.instance.items = [
            { label: 'One' },
            { label: 'Updated' }
        ];
        await Promise.resolve();

        const updatedRows = root.querySelectorAll('.row').map((node: any) => node.textContent?.trim());
        expect(updatedRows).toEqual(['Chat One', 'Chat Updated']);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}
