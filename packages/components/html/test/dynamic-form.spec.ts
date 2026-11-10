import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';
import { DynamicFormChange } from '../../common/src/dynamic-form.types';

@Component({
    selector: 'dynamic-form-host',
    imports: [BaseComponentsModule],
    template: `
    <div class="host">
        <dynamic-form :schema="schema" :value="value" :messages="messages"
            :changeAction="onChange" :submitAction="onSubmit"></dynamic-form>
        <pre class="host-value">{{submittedValue}}</pre>
    </div>`
})
class DynamicFormHostComponent {
    schema: any = {
        fields: [
            { key: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Demo' },
            { key: 'mode', type: 'radio', label: 'Mode', defaultValue: 'basic', options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Advanced', value: 'advanced' }
            ] },
            { key: 'target', type: 'text', label: 'Target', visibleWhen: { key: 'mode', equals: 'advanced' } },
            { key: 'retries', type: 'number', label: 'Retries', defaultValue: 1, min: 0, max: 5 },
            { key: 'body', type: 'json', label: 'Body', defaultValue: { ok: true } },
            { key: 'code', type: 'code', label: 'Code', defaultValue: 'return 1;' },
            { key: 'enabled', type: 'checkbox', label: 'Enabled', defaultValue: false }
        ]
    };
    value: Record<string, any> = { name: '' };
    messages = { required: 'Name required' };
    submittedValue = '';
    lastChange?: DynamicFormChange;

    onChange = (change: DynamicFormChange): void => {
        this.lastChange = change;
    };

    onSubmit = (result: any): void => {
        this.submittedValue = JSON.stringify(result.value);
    };
}

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('HTML dynamic form')
export class HtmlDynamicFormTest {
    ctx!: ApplicationContext;
    ref!: ComponentRef<DynamicFormHostComponent>;
    root: any;
    doc: any;

    @Before()
    async init() {
        this.ctx = await Application.run(DynamicFormHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, BaseComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
        this.ref = this.ctx.runners.getRef(DynamicFormHostComponent) as ComponentRef<DynamicFormHostComponent>;
        this.root = this.ref.hostView.rootNodes[0] as any;
        this.doc = this.ctx.get(DOCUMENT);
        await flush();
    }

    @Test('paints groups, placeholders, options and code fields from JSON config')
    async paintsSchema() {
        const name = this.root.querySelector('.df-field[data-field-key="name"] input') as any;
        expect(name).toBeTruthy();
        expect(name.getAttribute('placeholder')).toBe('Demo');
        expect(this.root.querySelector('.df-field[data-field-key="name"] .df-field-required')).toBeTruthy();

        const options = this.root.querySelectorAll('.df-field[data-field-key="mode"] .df-option');
        expect(options.length).toBe(2);
        expect(options[0].getAttribute('data-option-value')).toBe('basic');
        expect(options[0].className).toContain('is-selected');

        const code = this.root.querySelector('.df-field[data-field-key="code"] textarea') as any;
        expect(code).toBeTruthy();
        expect(code.getAttribute('data-dynamic-code')).toBe('javascript');
        expect(code.className).toContain('df-code-editor');
    }

    @Test('validates fields and toggles conditional visibility')
    async validatesAndTogglesVisibility() {
        const name = this.root.querySelector('.df-field[data-field-key="name"] input') as any;
        name.value = '';
        name.dispatchEvent(new (this.doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();

        const error = this.root.querySelector('.df-field[data-field-key="name"] .df-field-error');
        expect(error?.textContent).toContain('Name required');
        expect(this.root.querySelector('.df-field[data-field-key="name"] input')?.getAttribute('aria-invalid')).toBe('true');

        expect(this.root.querySelector('.df-field[data-field-key="target"]')).toBeFalsy();
        const advanced = this.root.querySelector('.df-field[data-field-key="mode"] [data-option-value="advanced"] input') as any;
        advanced.checked = true;
        advanced.dispatchEvent(new (this.doc.defaultView as any).Event('change', { bubbles: true }));
        await flush();
        expect(this.root.querySelector('.df-field[data-field-key="target"]')).toBeTruthy();

        const target = this.root.querySelector('.df-field[data-field-key="target"] input') as any;
        target.value = 'input.value';
        target.dispatchEvent(new (this.doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(this.ref.instance.lastChange?.key).toBe('target');
        expect(this.ref.instance.lastChange?.field.type).toBe('text');
    }

    @Test('resets a field to its configured default')
    async resetsField() {
        const retries = this.root.querySelector('.df-field[data-field-key="retries"] input') as any;
        retries.value = '5';
        retries.dispatchEvent(new (this.doc.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        expect(this.ref.instance.lastChange?.value).toBe(5);

        (this.root.querySelector('.df-field[data-field-key="retries"] .df-field-reset') as any).click();
        await flush();
        expect(this.root.querySelector('.df-field[data-field-key="retries"] input')?.value).toBe('1');
        expect(this.ref.instance.lastChange?.value).toBe(1);
    }

    @Test('accepts a JSON string schema and reports invalid JSON')
    async parsesJsonSchema() {
        this.ref.instance.schema = JSON.stringify({ fields: [{ key: 'plain', type: 'text', label: 'Plain' }] });
        await flush();
        expect(this.root.querySelector('.df-field[data-field-key="plain"]')).toBeTruthy();

        this.ref.instance.schema = '{ broken';
        await flush();
        const error = this.root.querySelector('.df-schema-error');
        expect(error?.textContent).toContain('Invalid form schema');
        expect(this.root.querySelector('.df-field[data-field-key="plain"]')).toBeFalsy();
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
