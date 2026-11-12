import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { DynamicFormModule } from '@tsdi/components/common/dynamic-form';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'dynamic-form-unit-host',
    imports: [BaseComponentsModule, DynamicFormModule],
    template: '<dynamic-form :schema="schema" :value="value"></dynamic-form>'
})
class DynamicFormUnitHostComponent {
    schema = {
        fields: [
            { key: 'timeout', type: 'number', label: 'Timeout', defaultValue: 0, unit: 'ms' }
        ]
    };
    value: Record<string, any> = {};
}

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('HTML dynamic form units')
export class HtmlDynamicFormUnitTest {
    ctx!: ApplicationContext;
    root: any;

    @Before()
    async init() {
        this.ctx = await Application.run(DynamicFormUnitHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, BaseComponentsModule, DynamicFormModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
        this.root = (this.ctx.runners.getRef(DynamicFormUnitHostComponent) as ComponentRef<DynamicFormUnitHostComponent>)
            .hostView.rootNodes[0] as any;
        await flush();
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }

    @Test('renders a unit suffix inside numeric controls')
    async rendersInputUnit() {
        const wrapper = this.root.querySelector('.df-field[data-field-key="timeout"] .df-input-wrap');
        expect(wrapper?.className).toContain('has-unit');
        expect(this.root.querySelector('.df-field[data-field-key="timeout"] .df-input-unit')?.textContent).toBe('ms');
    }
}
