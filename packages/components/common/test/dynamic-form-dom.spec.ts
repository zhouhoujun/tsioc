import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DynamicFormComponent, DynamicFormModule } from '../dynamic-form';

@Component({
    selector: 'dynamic-form-dom-host',
    imports: [DynamicFormComponent],
    template: `<dynamic-form :schema="schema" :value="value"></dynamic-form>`
})
class DynamicFormDomHostComponent {
    schema = {
        fields: [
            {
                key: 'email',
                type: 'text',
                label: 'Email',
                required: true,
                description: 'Work address'
            }
        ]
    };
    value = { email: '' };
}

@Suite('common dynamic form DOM a11y')
export class DynamicFormDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DynamicFormDomHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, DynamicFormModule],
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

    @Test('links field errors and descriptions through aria-describedby')
    async describedByErrorAndHint() {
        const ref = this.ctx.get(ComponentFactory).create(DynamicFormDomHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DynamicFormDomHostComponent>;
        await ref.render();
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        const form = ref.hostView.query(DynamicFormComponent) as ComponentRef<DynamicFormComponent>;
        const root = form.hostView.rootNodes[0] as HTMLElement;
        const field = (form.instance as any).schema.fields[0];
        const input = root.querySelector('input') as HTMLInputElement;

        // Required + blurred blank value raises the field error.
        form.instance.changeText(field, { target: { value: 'a' } });
        form.instance.changeText(field, { target: { value: '' } });
        form.instance.blurField(field);
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }

        const error = root.querySelector('.df-field-error') as HTMLElement;
        const hint = root.querySelector('.df-field-hint') as HTMLElement;
        expect(input.getAttribute('aria-invalid')).toEqual('true');
        expect(error).toBeTruthy();
        expect(error.getAttribute('role')).toEqual('alert');
        expect(hint).toBeTruthy();
        expect(error.id).toContain('-error-email');
        expect(hint.id).toContain('-hint-email');
        expect(input.getAttribute('aria-describedby')).toEqual(`${error.id} ${hint.id}`);
    }
}
