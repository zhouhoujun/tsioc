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

    @Test('builds an opt-in error summary and focuses the chosen field')
    async errorSummary() {
        const focused: string[] = [];
        const form = createForm({
            fields: [
                { key: 'name', type: 'text', label: 'Name', required: true },
                { key: 'note', type: 'text', label: 'Note' },
                { key: 'url', type: 'url', label: 'URL' }
            ]
        }, { name: '', note: '', url: 'bad' });
        form.showErrorSummary = true;
        form.focusFieldAction = (key: string) => focused.push(key);
        await flush();

        form.submit();
        await flush();
        expect(form.errorSummary.map(item => item.key)).toEqual(['name', 'url']);
        expect(form.errorSummary[0].label).toEqual('Name');
        expect(form.errorSummary[0].message).toBeTruthy();
        focused.length = 0;
        form.focusError('url');
        expect(focused).toEqual(['url']);

        form.showErrorSummary = false;
        expect(form.errorSummary.length).toEqual(2);
    }

    @Test('captures the initial snapshot, tracks dirty/touched and guards leaving')
    async snapshotAndLeaveGuard() {
        const form = createForm({
            fields: [
                { key: 'name', type: 'text', label: 'Name' },
                { key: 'note', type: 'text', label: 'Note' }
            ]
        }, { name: 'Ada', note: '' });
        await flush();
        expect(form.isDirty).toBe(false);
        expect(form.isTouched).toBe(false);
        expect(form.initialSnapshot).toEqual({ name: 'Ada', note: '' });

        form.changeText(form.schema.fields[0], { target: { value: 'Grace' } });
        await flush();
        expect(form.isDirty).toBe(true);
        expect(form.isTouched).toBe(true);
        expect(form.touchedFields).toContain('name');

        let allow = false;
        form.beforeLeaveAction = () => allow;
        expect(await form.canLeave()).toBe(false);
        allow = true;
        expect(await form.canLeave()).toBe(true);

        form.resetToInitial();
        await flush();
        expect(form.getValue().name).toBe('Ada');
        expect(form.isDirty).toBe(false);
        expect(form.isTouched).toBe(false);
        expect(await form.canLeave()).toBe(true);
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

    @Test('stores typed values with their source and hides the prefix in the input')
    async typedValues() {
        const form = createForm({
            fields: [
                { key: 'payload', type: 'text', label: 'Payload', typed: true, defaultValue: 'payload' },
                { key: 'plain', type: 'text', label: 'Plain' }
            ],
            typedSources: [
                { value: 'literal', label: 'Literal' },
                { value: 'msg', label: 'msg' }
            ]
        }, { payload: 'payload' });
        await flush();

        const field = form.schema.fields[0];
        expect(form.typedSourceOptions.map(option => option.label)).toEqual(['Literal', 'msg']);
        expect(form.typedType(field)).toBe('literal');
        expect(form.typedText(field)).toBe('payload');

        form.changeTypedType(field, { target: { value: 'msg' } });
        await flush();
        expect(form.form!.get('payload')!.value).toBe('msg.payload');
        expect(form.typedType(field)).toBe('msg');
        // The selector owns the source, so the input shows the value only.
        expect(form.typedText(field)).toBe('payload');

        // Editing a reference keeps exactly one source prefix.
        form.changeText(field, { target: { value: 'payload.value' } });
        await flush();
        expect(form.form!.get('payload')!.value).toBe('msg.payload.value');

        // An empty value remembers the choice instead of storing `msg.`.
        form.changeText(field, { target: { value: '' } });
        await flush();
        expect(form.form!.get('payload')!.value).toBe('');
        form.changeTypedType(field, { target: { value: 'msg' } });
        expect(form.form!.get('payload')!.value).toBe('');
        expect(form.typedType(field)).toBe('msg');
        form.changeText(field, { target: { value: 'x' } });
        await flush();
        expect(form.form!.get('payload')!.value).toBe('msg.x');

        // Switching back to literal strips the source; plain fields have no selector.
        form.changeTypedType(field, { target: { value: 'literal' } });
        await flush();
        expect(form.form!.get('payload')!.value).toBe('x');
        expect(form.isTypedInput(form.schema.fields[1])).toBe(false);
    }

    @Test('edits typed fields through a host codec so references keep their shape')
    async typedCodecValues() {
        const codec = {
            decode(value: any) {
                if (value && typeof value === 'object' && typeof value.type === 'string') {
                    return { source: value.type, text: value.path || '' };
                }
                return { source: 'literal', text: value === undefined || value === null ? '' : String(value) };
            },
            encode(source: string, text: string) {
                return source === 'literal' ? text : { type: source, path: text };
            },
            isReference(value: any) {
                return !!value && typeof value === 'object';
            }
        };
        const form = createForm({
            fields: [
                {
                    key: 'to',
                    type: 'text',
                    label: 'To',
                    typed: true,
                    typedCodec: codec,
                    typedSources: [{ value: 'literal', label: 'Literal' }, { value: 'msg', label: 'msg' }]
                },
                {
                    key: 'rules',
                    type: 'list',
                    label: 'Rules',
                    itemFields: [
                        { key: 'value', type: 'text', label: 'Value', typed: true, typedCodec: codec }
                    ]
                }
            ]
        }, {
            to: { type: 'msg', path: 'payload' },
            rules: [{ value: { type: 'msg', path: 'topic' } }]
        });
        await flush();

        const field = form.schema.fields[0];
        expect(form.typedType(field)).toBe('msg');
        expect(form.typedText(field)).toBe('payload');

        form.changeTypedType(field, { target: { value: 'literal' } });
        await flush();
        expect(form.form!.get('to')!.value).toBe('payload');
        form.changeTypedType(field, { target: { value: 'msg' } });
        await flush();
        expect(form.form!.get('to')!.value).toEqual({ type: 'msg', path: 'payload' });

        // Editing keeps the reference object instead of collapsing to text.
        form.changeText(field, { target: { value: 'payload.value' } });
        await flush();
        expect(form.form!.get('to')!.value).toEqual({ type: 'msg', path: 'payload.value' });

        // List items use the same codec for display and writes.
        const list = form.schema.fields[1];
        const item = form.listItems(list)[0];
        expect(form.listItemTypedType(item, list.itemFields![0])).toBe('msg');
        expect(form.listItemValue(item, list.itemFields![0])).toBe('topic');
        form.changeListItem(list, 0, list.itemFields![0], { target: { value: 'name' } });
        await flush();
        expect(form.getValue().rules[0].value).toEqual({ type: 'msg', path: 'name' });
        form.changeListItemTypedType(list, 0, list.itemFields![0], { target: { value: 'literal' } });
        await flush();
        expect(form.getValue().rules[0].value).toBe('name');
    }

    @Test('validates typed values through the host codec and uses source input types')
    async typedCodecValidation() {
        const codec = {
            decode: (value: any) => ({ source: value?.type || 'literal', text: String(value?.value ?? '') }),
            encode: (source: string, text: string) => ({ type: source, value: text }),
            isReference: (value: any) => value?.type === 'msg',
            validate: (value: any) => value?.value === 'bad' ? 'Bad literal value' : undefined
        };
        const form = createForm({
            fields: [{
                key: 'value',
                type: 'text',
                label: 'Value',
                typed: true,
                typedCodec: codec,
                typedSources: [
                    { value: 'literal', label: 'Literal' },
                    { value: 'num', label: 'Number', input: 'number' }
                ]
            }]
        }, { value: { type: 'literal', value: 'bad' } });
        await flush();
        const field = form.schema.fields[0];
        expect(form.errorFor(field)).toBe('Bad literal value');
        expect(form.validate().valid).toBe(false);
        expect(form.validate().errors?.value?.typed).toBe('Bad literal value');
        expect(form.typedHtmlType(field)).toBe('text');

        form.value = { value: { type: 'num', value: '3' } };
        await flush();
        expect(form.typedHtmlType(field)).toBe('number');
        expect(form.errorFor(field)).toBe('');
        expect(form.validate().valid).toBe(true);
    }

    @Test('skips literal-only rules for codec references')
    async typedCodecReferencesSkipLiteralRules() {
        const codec = {
            decode: (value: any) => ({ source: 'msg', text: String(value?.path || '') }),
            encode: (source: string, text: string) => ({ type: source, path: text }),
            isReference: (value: any) => !!value && typeof value === 'object'
        };
        const field: any = {
            key: 'value',
            type: 'text',
            label: 'Value',
            typed: true,
            typedCodec: codec,
            required: true,
            pattern: '^[a-z]+$'
        };
        const reference = buildDynamicValidators(field)
            .validators
            .map(validator => validator({ value: { type: 'msg', path: 'Payload.1' } } as any))
            .filter(Boolean);
        expect(reference).toEqual([]);
        const literal = buildDynamicValidators(field)
            .validators
            .map(validator => validator({ value: 'NOPE' } as any))
            .filter(Boolean);
        expect(literal.length).toBeGreaterThan(0);
    }

    @Test('stores multi-select values as a comma separated string')
    async multiSelectValues() {
        const form = createForm({
            fields: [{
                key: 'scope',
                type: 'select',
                label: 'Scope',
                multiple: true,
                options: [
                    { label: 'Task 1', value: 'task_1' },
                    { label: 'Task 2', value: 'task_2' },
                    { label: 'task (type)', value: 'task' }
                ]
            }]
        }, { scope: 'task_1' });
        await flush();

        const field = form.schema.fields[0];
        expect(form.isMultiSelect(field)).toBe(true);
        expect(form.optionSelected(field, 'task_1')).toBe(true);
        expect(form.optionSelected(field, 'task_2')).toBe(false);

        form.changeSelect(field, { target: { selectedOptions: [{ value: 'task_1' }, { value: 'task' }] } });
        await flush();
        expect(form.form!.get('scope')!.value).toBe('task_1,task');
        expect(form.getValue().scope).toBe('task_1,task');
        expect(form.optionSelected(field, 'task')).toBe(true);
    }

    @Test('accepts host issues, keeps warnings visible but non-blocking')
    async hostIssues() {
        const form = createForm({
            fields: [{ key: 'url', type: 'text', label: 'URL' }]
        }, { url: 'https://example.com' });
        await flush();
        const field = form.schema.fields[0];

        form.setIssues([{ key: 'url', message: 'Endpoint not found' }]);
        await flush();
        expect(form.errorFor(field)).toBe('Endpoint not found');
        expect(form.validate().valid).toBe(false);
        expect(form.validate().errors?.url?.external).toBe('Endpoint not found');

        form.clearIssues(['url']);
        await flush();
        expect(form.errorFor(field)).toBe('');
        expect(form.validate().valid).toBe(true);

        form.setIssues([{ key: 'url', message: 'Heads up', severity: 'warning' }]);
        await flush();
        expect(form.errorFor(field)).toBe('Heads up');
        expect(form.validate().valid).toBe(true);
        expect(form.issueSeverity(field)).toBe('warning');
    }

    @Test('runs async field and schema validation and focuses the first error')
    async asyncValidation() {
        const focused: string[] = [];
        const form = createForm({
            fields: [
                {
                    key: 'name',
                    type: 'text',
                    label: 'Name',
                    validate: async (value: string) => value === 'taken' ? 'Name is taken' : undefined
                },
                { key: 'url', type: 'text', label: 'URL' }
            ],
            validate: async (values: Record<string, any>) =>
                values.url === 'bad' ? [{ key: 'url', message: 'URL is invalid' }] : []
        }, { name: 'taken', url: 'bad' });
        form.focusFieldAction = (key: string) => focused.push(key);
        await flush();

        const result = await form.submitAsync();
        await flush();
        expect(result.valid).toBe(false);
        expect(form.errorFor(form.schema.fields[0])).toBe('Name is taken');
        expect(form.errorFor(form.schema.fields[1])).toBe('URL is invalid');
        expect(focused[0]).toBe('name');

        form.changeText(form.schema.fields[0], { target: { value: 'free' } });
        form.changeText(form.schema.fields[1], { target: { value: 'https://ok' } });
        await flush();
        expect((await form.validateAsync()).valid).toBe(true);
        expect(form.errorFor(form.schema.fields[0])).toBe('');
        expect(form.errorFor(form.schema.fields[1])).toBe('');
    }

    @Test('moves list rows and reports a row summary')
    async listReorderAndSummary() {
        const form = createForm({
            fields: [{
                key: 'rules',
                type: 'list',
                label: 'Rules',
                reorder: true,
                rowSummary: (item: any) => `${item.field || '?'} = ${item.value || '?'}`,
                itemFields: [
                    { key: 'field', type: 'text', label: 'Field' },
                    { key: 'value', type: 'text', label: 'Value' }
                ]
            }]
        }, {
            rules: [
                { field: 'a', value: '1' },
                { field: 'b', value: '2' },
                { field: 'c', value: '3' }
            ]
        });
        await flush();
        const field = form.schema.fields[0];
        expect(form.listRowSummary(field, { field: 'a', value: '1' }, 0)).toBe('a = 1');

        form.moveListItem(field, 2, -1);
        await flush();
        expect(form.getValue().rules.map((item: any) => item.field)).toEqual(['a', 'c', 'b']);
        // Out-of-range moves are ignored.
        form.moveListItem(field, 0, -1);
        form.moveListItem(field, 2, 1);
        await flush();
        expect(form.getValue().rules.map((item: any) => item.field)).toEqual(['a', 'c', 'b']);
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
