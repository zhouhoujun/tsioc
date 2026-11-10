import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DynamicFormComponent } from '../src/dynamic-form';
import { buildDynamicValidators, dynamicFormMessage } from '../src/dynamic-form.validation';

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

function createForm(schema: any, value?: Record<string, any>): DynamicFormComponent {
    const form = new DynamicFormComponent();
    form.schema = schema;
    form.value = value || {};
    return form;
}

@Suite('common dynamic form')
export class DynamicFormTest {
    @Test('builds controls from a JSON schema and validates required fields')
    async buildsFromJsonSchema() {
        const form = createForm(JSON.stringify({
            fields: [
                { key: 'name', type: 'text', label: 'Name', required: true },
                { key: 'retries', type: 'number', label: 'Retries', defaultValue: 0, min: 0, max: 5 },
                { key: 'config', type: 'json', label: 'Config', defaultValue: {} },
                { key: 'enabled', type: 'checkbox', label: 'Enabled', defaultValue: false }
            ]
        }), { name: '' });
        await flush();

        expect(form.validate().valid).toBe(false);
        expect(form.validate().errors?.name).toEqual({ required: true });

        form.changeText((form.schema.fields[0]), { target: { value: 'demo' } });
        form.changeText((form.schema.fields[1]), { target: { value: '9' } });
        await flush();

        expect(form.validate().valid).toBe(false);
        expect(form.validate().errors?.retries).toBeTruthy();

        form.changeText((form.schema.fields[1]), { target: { value: '3' } });
        form.changeText((form.schema.fields[2]), { target: { value: '{ "ok": true }' } });
        form.changeBoolean((form.schema.fields[3]), { target: { checked: true } });
        await flush();

        const result = form.validate();
        expect(result.valid).toBe(true);
        expect(result.value).toEqual({
            name: 'demo',
            retries: 3,
            config: { ok: true },
            enabled: true
        });
    }

    @Test('applies validation messages from rules, fields and the form config')
    async resolvesValidationMessages() {
        const form = createForm({
            fields: [
                {
                    key: 'name',
                    type: 'text',
                    label: 'Name',
                    required: true,
                    errorMessages: { required: 'Need a name' }
                },
                {
                    key: 'code',
                    type: 'text',
                    label: 'Code',
                    rules: [{ type: 'pattern', value: '^[A-Z]+$', message: 'Uppercase only' }]
                }
            ],
            messages: { pattern: 'Fallback format message' }
        });
        await flush();

        const nameField = form.schema.fields[0];
        form.changeText(nameField, { target: { value: '' } });
        expect(form.errorFor(nameField)).toBe('Need a name');

        const codeField = form.schema.fields[1];
        form.changeText(codeField, { target: { value: 'abc' } });
        expect(form.errorFor(codeField)).toBe('Uppercase only');

        const built = buildDynamicValidators({ key: 'x', type: 'text', pattern: '^a$' });
        const message = dynamicFormMessage({ key: 'x', type: 'text' }, { pattern: true }, built.messages, { pattern: 'global pattern' });
        expect(message).toBe('global pattern');
    }

    @Test('shows fields based on visibleWhen conditions')
    async evaluatesVisibility() {
        const form = createForm({
            fields: [
                { key: 'mode', type: 'radio', label: 'Mode', defaultValue: 'basic', options: [
                    { label: 'Basic', value: 'basic' },
                    { label: 'Advanced', value: 'advanced' }
                ] },
                { key: 'target', type: 'text', label: 'Target', visibleWhen: { key: 'mode', equals: 'advanced' } }
            ]
        });
        await flush();

        const visibleKeys = () => form.visibleGroups.flatMap(group => group.fields.map(field => field.key));
        expect(visibleKeys()).toEqual(['mode']);

        form.chooseOption(form.schema.fields[0], 'advanced');
        await flush();
        expect(visibleKeys()).toEqual(['mode', 'target']);
        expect(form.validate().valid).toBe(true);

        form.chooseOption(form.schema.fields[0], 'basic');
        await flush();
        expect(visibleKeys()).toEqual(['mode']);
    }

    @Test('resets single fields and the whole form to schema defaults')
    async resetsToDefaults() {
        const form = createForm({
            fields: [
                { key: 'name', type: 'text', label: 'Name', defaultValue: 'starter' },
                { key: 'retries', type: 'number', label: 'Retries', defaultValue: 1, min: 0 },
                { key: 'enabled', type: 'switch', label: 'Enabled', defaultValue: true },
                { key: 'note', type: 'text', label: 'Note' }
            ]
        }, { name: 'typed', retries: 7, enabled: false, note: 'keep me' });
        await flush();

        form.resetField(form.schema.fields[1]);
        expect(form.getValue().retries).toBe(1);
        expect(form.getValue().name).toBe('typed');

        form.reset();
        // reset() restores the schema defaults, not the initial bound value.
        expect(form.getValue()).toEqual({ name: 'starter', retries: 1, enabled: true, note: 'keep me' });

        form.patchValue({ name: 'patched', retries: 3 });
        await flush();
        expect(form.getValue().name).toBe('patched');
        expect(form.getValue().retries).toBe(3);
    }

    @Test('reports invalid schema JSON without throwing')
    async reportsInvalidSchema() {
        const form = new DynamicFormComponent();
        form.schema = '{ not json';
        await flush();
        expect((form as any).schemaError).toContain('Invalid form schema');
        expect(form.visibleGroups.length).toBe(0);
    }

    @Test('marks all fields touched on submit and emits the typed value')
    async submitsTypedValue() {
        const form = createForm({
            fields: [
                { key: 'host', type: 'url', label: 'Host' },
                { key: 'body', type: 'json', label: 'Body', defaultValue: {} }
            ]
        }, { host: 'https://example.com', body: '{"ok":true}' });
        await flush();

        let submitted: any;
        form.submitAction = result => submitted = result;
        const result = form.submit();
        expect(result.valid).toBe(true);
        expect(submitted.value).toEqual({ host: 'https://example.com', body: { ok: true } });

        form.changeText(form.schema.fields[0], { target: { value: 'not a url' } });
        const invalid = form.submit();
        expect(invalid.valid).toBe(false);
        expect(invalid.errors?.host).toBeTruthy();
    }
}
