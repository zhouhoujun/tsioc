import { FormGroup } from '@tsdi/components/forms';
import {
    DynamicFormField,
    DynamicFormSchema,
    DynamicFormTypedCodec,
    DynamicFormTypedDecoded,
    DynamicFormTypedSource
} from './dynamic-form.types';
import { dynamicFormMessage, isTypedReference } from './dynamic-form.validation';

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

/** Host hooks the typed-value helpers need on top of the read-only state. */
export interface DynamicFormTypedHost extends DynamicFormFieldHost {
    typedSelections?: Record<string, string>;
    updateValue(field: DynamicFormField, value: any): void;
}

/** Sources shown by the typed-value selector when the host does not label them. */
export const DEFAULT_TYPED_SOURCES: DynamicFormTypedSource[] = [
    { value: 'literal', label: 'Literal' },
    { value: 'msg', label: 'msg' },
    { value: 'flow', label: 'flow' },
    { value: 'global', label: 'global' },
    { value: 'env', label: 'env' }
];

/** Leading source of a stored typed value (`msg.payload` -> `msg`). */
const TYPED_SOURCE_PATTERN = /^(msg|flow|global|env)\./;

/** Default storage: `msg.`-style prefixes, literal values stay plain text. */
export const DEFAULT_TYPED_CODEC: DynamicFormTypedCodec = {
    decode(value: any): DynamicFormTypedDecoded {
        const text = value === undefined || value === null ? '' : String(value);
        const match = TYPED_SOURCE_PATTERN.exec(text);
        return match
            ? { source: match[1], text: text.slice(match[0].length) }
            : { source: 'literal', text };
    },
    encode(source: string, text: string): any {
        return source === 'literal' ? text : `${source}.${text}`;
    },
    isReference(value: any): boolean {
        return isTypedReference(value);
    }
};

/** Codec used by a typed field; hosts may replace the default per field. */
export function typedCodec(field: DynamicFormField): DynamicFormTypedCodec {
    return field.typedCodec || DEFAULT_TYPED_CODEC;
}

export function typedSources(schema?: DynamicFormSchema): DynamicFormTypedSource[] {
    const configured = schema?.typedSources;
    return configured && configured.length ? configured : DEFAULT_TYPED_SOURCES;
}

/** Sources offered by one typed field; a field list wins over the schema list. */
export function typedSourcesFor(schema: DynamicFormSchema | undefined, field: DynamicFormField): DynamicFormTypedSource[] {
    if (field.typedSources && field.typedSources.length) {
        return field.typedSources;
    }
    return typedSources(schema);
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

/**
 * Typed form model: controls are the source of truth, JSON text is parsed and
 * checkbox/number values are normalized. Fields without a control fall back to
 * their initial value so partially built forms still submit a full object.
 */
export function formModelValue(host: DynamicFormFieldHost, fields: DynamicFormField[]): Record<string, any> {
    const value: Record<string, any> = {};
    fields.forEach(field => {
        const control = host.form?.get(field.key);
        const raw = control ? control.value : initialValue(host, field);
        switch (field.type) {
            case 'number':
            case 'range':
                value[field.key] = raw === '' || raw === undefined || raw === null ? '' : Number(raw);
                break;
            case 'checkbox':
            case 'switch':
                value[field.key] = raw === true;
                break;
            case 'json':
                if (typeof raw === 'string' && raw.trim() !== '') {
                    try {
                        value[field.key] = JSON.parse(raw);
                    } catch {
                        value[field.key] = raw;
                    }
                } else {
                    value[field.key] = raw;
                }
                break;
            default:
                value[field.key] = raw;
                break;
        }
    });
    return value;
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

/** Select that accepts several values; the stored form is comma separated. */
export function isMultiSelect(field: DynamicFormField): boolean {
    return field.type === 'select' && field.multiple === true;
}

/** Selected values of a multi-select (or single select) field. */
export function selectValues(host: DynamicFormFieldHost, field: DynamicFormField): string[] {
    const value = fieldValue(host, field);
    const list = Array.isArray(value) ? value : String(value ?? '').split(',');
    return list.map(item => String(item).trim()).filter(Boolean);
}

export function optionSelected(host: DynamicFormFieldHost, field: DynamicFormField, value: any): boolean {
    if (isMultiSelect(field)) {
        return selectValues(host, field).includes(String(value));
    }
    const current = fieldValue(host, field);
    return current === value || String(current) === String(value);
}

export function multiselectChangeValue(event: any): string {
    const options = event?.target?.selectedOptions;
    if (!options) {
        return String(event?.target?.value ?? '');
    }
    return Array.from(options as ArrayLike<any>)
        .map(option => String(option.value))
        .filter(Boolean)
        .join(',');
}

export function isTypedInput(field: DynamicFormField): boolean {
    return field.typed === true;
}

/**
 * Selected source for a typed field. The stored value is the source of truth;
 * a pending choice is remembered only while the value is empty so a source can
 * be picked before typing anything.
 */
export function typedType(host: DynamicFormFieldHost, field: DynamicFormField): string {
    const raw = fieldValue(host, field);
    const decoded = typedCodec(field).decode(raw);
    if (decoded.source !== 'literal') {
        return decoded.source;
    }
    const empty = raw === undefined || raw === null || raw === '';
    return empty ? ((host as DynamicFormTypedHost).typedSelections?.[field.key] || 'literal') : 'literal';
}

/** Typed values show the payload text only; the selector owns the source. */
export function typedText(host: DynamicFormFieldHost, field: DynamicFormField): string {
    return typedCodec(field).decode(fieldValue(host, field)).text;
}

/** Text input value; typed fields hide the source the selector shows. */
export function textValue(host: DynamicFormFieldHost, field: DynamicFormField): any {
    return field.typed === true ? typedText(host, field) : fieldValue(host, field);
}

export function changeTypedType(host: DynamicFormTypedHost, field: DynamicFormField, event: any): void {
    const codec = typedCodec(field);
    const decoded = codec.decode(fieldValue(host, field));
    const next = String(event?.target?.value || 'literal');
    if (!decoded.text) {
        // Nothing to prefix yet: remember the choice for the first input
        // instead of storing a dangling `msg.`.
        host.typedSelections = { ...(host.typedSelections || {}), [field.key]: next };
        return;
    }
    host.updateValue(field, codec.encode(next, decoded.text));
}

export function isTextareaInput(field: DynamicFormField): boolean {
    return field.type === 'textarea';
}

export function isCodeInput(field: DynamicFormField): boolean {
    return field.type === 'code';
}
