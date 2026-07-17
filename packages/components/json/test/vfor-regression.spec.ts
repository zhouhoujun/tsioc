import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule, Component } from '@tsdi/components';
import { JsonTemplateModule } from '../src';

@Component({
    selector: 'json-vfor-scope-regression',
    template: {
        section: {
            p: {
                'v-for': 'item in items',
                '#text': '{{title}} {{item.label}}'
            }
        }
    }
})
class JsonVForScopeRegressionComponent {
    title = 'Chat';
    items = [
        { label: 'One' },
        { label: 'Two' }
    ];
}

@Suite('JSON VFor Regression Test')
export class JsonVForRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(JsonVForScopeRegressionComponent, {
            deps: [JsonTemplateModule, ComponentsModule]
        });
    }

    @Test('updates reused v-for view context values with inherited parent scope bindings')
    async updatesReusedVForViewContextValuesWithInheritedParentScope() {
        const ref = this.ctx.runners.getRef(JsonVForScopeRegressionComponent) as ComponentRef<JsonVForScopeRegressionComponent>;
        const root = ref.hostView.rootNodes[0] as any;

        const initialRows = root.querySelectorAll('p').map((node: any) => node.textContent?.trim());
        expect(initialRows).toEqual(['Chat One', 'Chat Two']);

        ref.instance.items = [
            { label: 'One' },
            { label: 'Updated' }
        ];
        await Promise.resolve();

        const updatedRows = root.querySelectorAll('p').map((node: any) => node.textContent?.trim());
        expect(updatedRows).toEqual(['Chat One', 'Chat Updated']);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}
