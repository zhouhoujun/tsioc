import { FormGroup } from '@tsdi/components/forms';
import { DynamicFormField, DynamicFormSchema } from './dynamic-form.types';
import { dynamicFormMessage } from './dynamic-form.validation';

/** State exposed by {@link DynamicFormComponent} to the pure field helpers. */
export interface DynamicFormFieldHost {
    form?: FormGroup;
    _value?: Record<string, any>;
    _schema?: DynamicFormSchema;
    validationErrors: Record<string, Record<string, any> | null>;
    ruleMessages: Record<string, Record<string, string>>;
    messages: Record<string, string>;
    submitAttempted: boolean;
    valueVersion: number;
}

export function hasOwn(value: any, key: string): boolean {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

export function conditionMatches(actual: any, condition: DynamicFormField['visibleWhen']): boolean {
    if (!condition) {
        return true;
    }
    if (condition.equals !== undefined) {
        return String(actual) === String(condition.equals);
    }
    if (condition.notEquals !== undefined) {
        return String(actual) !== String(condition.notEquals);
    }
    if (condition.in) {
        const allowed = condition.in.map(item => String(item));
        return allowed.includes(String(actual));
    }
    if (condition.truthy !== undefined) {
        return condition.truthy ? !!actual : !actual;
    }
    if (condition.falsy !== undefined) {
        return condition.falsy ? !actual : !!actual;
    }
    return true;
}

export function fieldLabel(field: DynamicFormField): string {
    return field.label || field.key;
}

export function fieldDisplayValue(field: DynamicFormField, value: any): any {
    if (field.type === 'json') {
        if (typeof value === 'string') {
            return value;
        }
        return value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
    }
    if (field.type === 'checkbox' || field.type === 'switch') {
        return !!value;
    }
    return value === undefined || value === null ? '' : value;
}

export function initialValue(host: DynamicFormFieldHost, field: DynamicFormField): any {
    const source = host._value || {};
    const value = hasOwn(source, field.key) ? source[field.key] : field.defaultValue;
    if (field.type === 'json') {
        return value;
    }
    return fieldDisplayValue(field, value);
}

/** Default value used by the per-field and whole-form reset actions. */
export function resetValue(field: DynamicFormField): any {
    if (field.type === 'json') {
        return field.defaultValue;
    }
    return fieldDisplayValue(field, field.defaultValue);
}

export function coerceValue(field: DynamicFormField, value: any): any {
    if (field.type === 'checkbox' || field.type === 'switch') {
        return !!value;
    }
    if (field.type === 'number' || field.type === 'range') {
        return value === '' || value === undefined || value === null ? '' : Number(value);
    }
    return value;
}

export function fieldValue(host: DynamicFormFieldHost, field: DynamicFormField): any {
    // `valueVersion` is the reactive signal for noReact form controls.
    void host.valueVersion;
    return host.form?.get(field.key)?.value ?? initialValue(host, field);
}

export function fieldChecked(host: DynamicFormFieldHost, field: DynamicFormField): boolean {
    return fieldValue(host, field) === true;
}

export function isRequired(field: DynamicFormField): boolean {
    return field.required === true
        || (field.rules || []).some(rule => {
            const type = typeof rule === 'string' ? rule : rule?.type;
            return type === 'required' || type === 'requiredTrue';
        });
}

export function canReset(field: DynamicFormField): boolean {
    return field.defaultValue !== undefined && !field.readonly && !field.disabled;
}

export function errorFor(host: DynamicFormFieldHost, field: DynamicFormField): string {
    // Read the snapshot unconditionally so the binding subscribes even while the
    // control is still valid (the first failing edit must repaint).
    const errors = host.validationErrors[field.key];
    const control = host.form?.get(field.key);
    if (!control || control.valid || !(control.dirty || control.touched || host.submitAttempted)) {
        return '';
    }
    const messages = { ...(host._schema?.messages || {}), ...(host.messages || {}) };
    return dynamicFormMessage(field, errors, host.ruleMessages[field.key], messages);
}

export function encodeValue(host: DynamicFormFieldHost, field: DynamicFormField): string {
    return encodeURIComponent(String(fieldValue(host, field) ?? ''));
}

export function suggestionData(field: DynamicFormField): string {
    return encodeURIComponent(JSON.stringify(field.suggestions || []));
}

export function htmlType(field: DynamicFormField): string {
    switch (field.type) {
        case 'number':
            return 'number';
        case 'range':
            return 'range';
        case 'password':
        case 'email':
        case 'url':
        case 'tel':
        case 'search':
        case 'date':
        case 'time':
        case 'datetime-local':
        case 'month':
        case 'week':
        case 'color':
            return field.type;
        default:
            return 'text';
    }
}

export function isTextInput(field: DynamicFormField): boolean {
    return [
        'text', 'password', 'email', 'url', 'tel', 'search',
        'date', 'time', 'datetime-local', 'month', 'week', 'color'
    ].includes(field.type);
}

export function isNumberInput(field: DynamicFormField): boolean {
    return field.type === 'number' || field.type === 'range';
}

export function isBooleanInput(field: DynamicFormField): boolean {
    return field.type === 'checkbox' || field.type === 'switch';
}

export function isSelectInput(field: DynamicFormField): boolean {
    return field.type === 'select';
}

export function isRadioInput(field: DynamicFormField): boolean {
    return field.type === 'radio';
}

export function isOptionInput(field: DynamicFormField): boolean {
    return isSelectInput(field) || isRadioInput(field);
}

export function isTypedInput(field: DynamicFormField): boolean {
    return field.typed === true;
}

export function typedType(host: DynamicFormFieldHost, field: DynamicFormField): string {
    const value = String(fieldValue(host, field) ?? '');
    const match = /^(msg|flow|global|env)\./.exec(value);
    return match ? match[1] : 'literal';
}

export function isTextareaInput(field: DynamicFormField): boolean {
    return field.type === 'textarea';
}

export function isCodeInput(field: DynamicFormField): boolean {
    return field.type === 'code';
}
