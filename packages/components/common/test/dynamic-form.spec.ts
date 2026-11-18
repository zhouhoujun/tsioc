import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DynamicFormComponent } from '../dynamic-form';
import { buildDynamicValidators, dynamicFormMessage } from '../dynamic-form';
import { FormControl } from '@tsdi/components/forms';

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

    @Test('maps native select values back to the schema option types')
    async mapsSelectOptionTypes() {
        const form = createForm({
            fields: [
                { key: 'unit', type: 'select', options: [
                    { label: 'Milliseconds', value: 'ms' },
                    { label: 'Seconds', value: 's' }
                ] },
                { key: 'size', type: 'select', options: [
                    { label: 'One', value: 1 },
                    { label: 'Two', value: 2 }
                ] }
            ]
        }, { unit: 'ms', size: 1 });
        await flush();

        form.changeSelect(form.schema.fields[0], { target: { value: 's' } });
        form.changeSelect(form.schema.fields[1], { target: { value: '2' } });
        await flush();

        const result = form.validate();
        expect(result.valid).toBe(true);
        expect(result.value.unit).toBe('s');
        expect(result.value.size).toBe(2);
    }

    @Test('validates colors, regular expressions and list item counts')
    validateExtraRules() {
        const errors = (field: any, value: any): any[] => {
            const control = new FormControl(value);
            return buildDynamicValidators(field).validators
                .map(validator => validator(control))
                .filter(Boolean);
        };

        expect(errors({ key: 'color', type: 'color' }, '#2563eb')).toEqual([]);
        expect(errors({ key: 'color', type: 'color' }, 'blue')).toEqual([{ color: true }]);
        expect(errors({ key: 'pattern', type: 'text', rules: [{ type: 'regex' }] }, '^[a-z]+$')).toEqual([]);
        expect(errors({ key: 'pattern', type: 'text', rules: [{ type: 'regex' }] }, '[')).toEqual([{ regex: true }]);
        expect(errors({ key: 'items', type: 'list', minItems: 2 }, ['a'])).toEqual([{ minItems: { required: 2, actual: 1 } }]);
        expect(errors({ key: 'items', type: 'list', maxItems: 1 }, ['a', 'b'])).toEqual([{ maxItems: { required: 1, actual: 2 } }]);
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

    @Test('reports schema-declared field actions to the host')
    async reportsFieldActions() {
        const form = createForm({
            fields: [
                {
                    key: 'broker',
                    type: 'select',
                    label: 'Broker',
                    options: [{ label: 'prod', value: 'mqtt_1' }],
                    actions: [
                        { id: 'create', label: '＋', title: 'New broker' },
                        { id: 'edit', label: '✎' }
                    ]
                },
                {
                    key: 'locked',
                    type: 'text',
                    label: 'Locked',
                    disabled: true,
                    actions: [{ id: 'create', label: '＋' }]
                }
            ]
        });
        await flush();

        const calls: Array<[string, string]> = [];
        form.actionAction = (field, actionId) => calls.push([field.key, actionId]);

        const broker = form.schema.fields[0];
        expect(broker.actions?.map(action => action.id)).toEqual(['create', 'edit']);
        form.runFieldAction(broker, broker.actions![0]);
        form.runFieldAction(broker, broker.actions![1]);
        expect(calls).toEqual([['broker', 'create'], ['broker', 'edit']]);

        // Disabled fields must not dispatch actions.
        const locked = form.schema.fields[1];
        form.runFieldAction(locked, locked.actions![0]);
        expect(calls.length).toBe(2);
    }
}
