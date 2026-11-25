import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Attribute, Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DynamicFormComponent, DynamicFormModule } from '../dynamic-form';

@Component({
    selector: 'dynamic-form-test-widget',
    template: `<textarea class="test-widget" [value]="value"
        @input="input($event)"></textarea>`
})
class DynamicFormTestWidgetComponent {
    @Attribute() value: any = '';
    @Attribute() changeAction?: (value: any) => void;
    input(event: any): void {
        this.changeAction?.(event?.target?.value);
    }
}

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

    @Test('renders a registered field widget and falls back for unknown types')
    async fieldWidgets() {
        const ref = this.ctx.get(ComponentFactory).create(DynamicFormDomHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DynamicFormDomHostComponent>;
        await ref.render();
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        const form = ref.hostView.query(DynamicFormComponent) as ComponentRef<DynamicFormComponent>;
        form.instance.schema = {
            fields: [
                { key: 'custom', type: 'widget', widget: 'test', label: 'Custom' },
                { key: 'unknown', type: 'widget', widget: 'missing', label: 'Unknown' }
            ],
            widgets: [{ type: 'test', component: DynamicFormTestWidgetComponent }]
        };
        form.instance.value = { custom: 'initial', unknown: 'fallback' };
        for (let index = 0; index < 20; index++) {
            await Promise.resolve();
        }
        await new Promise(resolve => setTimeout(resolve, 0));

        const root = form.hostView.rootNodes[0] as HTMLElement;
        const widget = root.querySelector('.test-widget') as HTMLTextAreaElement;
        expect(widget).toBeTruthy();
        expect(widget.value).toBe('initial');
        widget.value = 'typed';
        widget.dispatchEvent(new ((this.ctx.get(DOCUMENT) as any).defaultView as any).Event('input', { bubbles: true }));
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        expect(form.instance.getValue().custom).toBe('typed');

        // A missing widget degrades to a text input instead of rendering nothing.
        const fallback = root.querySelector('[data-field-key="unknown"] input') as HTMLInputElement;
        expect(fallback).toBeTruthy();
        expect(fallback.value).toBe('fallback');
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
        expect(input.getAttribute('aria-describedby')).toEqual(`${hint.id} ${error.id}`);
    }
}
