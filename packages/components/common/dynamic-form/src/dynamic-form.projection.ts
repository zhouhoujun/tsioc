import { FormControl, FormGroup } from '@tsdi/components/forms';
import { noReact } from '@tsdi/components';
import type { DynamicFormField, DynamicFormSchema } from './dynamic-form.types';
import { buildDynamicValidators } from './dynamic-form.validation';
import * as fields from './dynamic-form.fields';

/**
 * Form-control projection: schema fields → `FormGroup`, then value/error sync.
 * Extracted from the component so schema-driven projection and validation
 * controllers can evolve without growing `dynamic-form.ts`.
 */
export interface DynamicFormProjectionHost {
    _schema: DynamicFormSchema;
    form?: FormGroup;
    schemaSignature: string;
    formSignature: string;
    valueVersion: number;
    validationErrors: Record<string, Record<string, any> | null>;
    ruleMessages: Record<string, Record<string, string>>;
}

export function formSchemaFields(host: DynamicFormProjectionHost): DynamicFormField[] {
    return host._schema?.fields || [];
}

export function refreshFormErrors(host: DynamicFormProjectionHost): void {
    const next: Record<string, Record<string, any> | null> = {};
    formSchemaFields(host).forEach(field => {
        next[field.key] = host.form?.get(field.key)?.errors || null;
    });
    host.validationErrors = next;
}

export function syncFormValues(host: DynamicFormProjectionHost, force: boolean): void {
    if (!host.form) {
        applyFormSchema(host);
        return;
    }
    formSchemaFields(host).forEach(field => {
        const control = host.form?.get(field.key);
        if (!control) {
            return;
        }
        const incoming = fields.initialValue(host as any, field);
        if (force) {
            control.reset(incoming, { emitEvent: false });
        } else if (!control.dirty && control.value !== incoming) {
            control.setValue(incoming, { emitEvent: false });
        }
    });
    host.valueVersion += 1;
    refreshFormErrors(host);
}

export function applyFormSchema(host: DynamicFormProjectionHost): void {
    const schemaFields = formSchemaFields(host);
    const signature = schemaFields.map(field => [
        field.key,
        field.type,
        field.required ? 1 : 0,
        field.defaultValue === undefined ? '' : JSON.stringify(field.defaultValue),
        JSON.stringify(field.rules || ''),
        field.min ?? '',
        field.max ?? '',
        field.minLength ?? '',
        field.maxLength ?? '',
        field.pattern || ''
    ].join(':')).join('|');
    if (host.form && signature === host.formSignature) {
        syncFormValues(host, false);
        return;
    }
    const controls: Record<string, FormControl> = {};
    host.ruleMessages = {};
    schemaFields.forEach(field => {
        const built = buildDynamicValidators(field);
        host.ruleMessages[field.key] = built.messages;
        controls[field.key] = new FormControl(fields.initialValue(host as any, field), built.validators);
    });
    const form = new FormGroup(controls);
    (form as any)[noReact] = true;
    Object.values(controls).forEach(control => {
        (control as any)[noReact] = true;
    });
    host.form = form;
    host.formSignature = signature;
    host.valueVersion += 1;
    refreshFormErrors(host);
}
