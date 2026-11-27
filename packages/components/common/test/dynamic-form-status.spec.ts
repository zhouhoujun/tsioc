import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DynamicFormComponent } from '../dynamic-form';

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

@Suite('common dynamic form field status')
export class DynamicFormStatusTest {
    @Test('surfaces pending, valid and invalid async outcomes to widgets')
    async asyncStatus() {
        let settle!: (message: string | undefined) => void;
        const form = createForm({
            fields: [{
                key: 'name',
                type: 'text',
                label: 'Name',
                validate: () => new Promise<string | undefined>(resolve => { settle = resolve; })
            }]
        }, { name: 'demo' });
        await flush();
        const field = form.schema.fields[0];

        const run = form.validateAsync();
        await flush();
        expect(form.fieldStatus(field)).toBe('pending');
        expect(form.fieldPending(field)).toBe(true);
        expect(form.fieldValid(field)).toBe(false);

        settle('Name is taken');
        expect((await run).valid).toBe(false);
        await flush();
        expect(form.fieldStatus(field)).toBe('invalid');
        expect(form.fieldAsyncError(field)).toBe('Name is taken');

        // Editing invalidates the previous outcome instead of leaving a stale
        // "invalid" marker on an untouched value.
        form.changeText(field, { target: { value: 'other' } });
        await flush();
        expect(form.fieldStatus(field)).toBe('default');

        let settleValid!: (message: string | undefined) => void;
        (field as any).validate = () => new Promise<string | undefined>(resolve => { settleValid = resolve; });
        const second = form.validateAsync();
        await flush();
        expect(form.fieldStatus(field)).toBe('pending');
        settleValid(undefined);
        expect((await second).valid).toBe(true);
        await flush();
        expect(form.fieldStatus(field)).toBe('valid');
        expect(form.fieldValid(field)).toBe(true);
        expect(form.fieldAsyncError(field)).toBe('');
    }

    @Test('host issues override a previously valid async outcome')
    async hostIssuePrecedence() {
        const form = createForm({
            fields: [{
                key: 'ref',
                type: 'text',
                validate: async () => undefined
            }]
        }, { ref: 'x' });
        await flush();
        const field = form.schema.fields[0];
        await form.validateAsync();
        await flush();
        expect(form.fieldStatus(field)).toBe('valid');

        form.setIssues([{ key: 'ref', message: 'Missing reference' }]);
        await flush();
        expect(form.fieldStatus(field)).toBe('invalid');

        form.clearIssues(['ref']);
        await flush();
        expect(form.fieldStatus(field)).toBe('default');

        form.setIssues([{ key: 'ref', message: 'Just a warning', severity: 'warning' }]);
        await flush();
        // Warnings stay visible but do not mark the field invalid.
        expect(form.fieldStatus(field)).toBe('default');
    }
}
