import { AbstractControl, ValidatorFn, Validators } from '@tsdi/components/forms';
import { DynamicFormField, DynamicFormRule, DynamicFormRuleType, DynamicFormSchema } from './dynamic-form.types';

export type DynamicFormErrorMap = Record<string, any> | null;

export interface BuiltDynamicValidators {
    validators: ValidatorFn[];
    /** Rule-specific messages, keyed by error name. */
    messages: Record<string, string>;
}

export const DEFAULT_DYNAMIC_FORM_MESSAGES: Record<string, string> = {
    required: 'Required',
    requiredTrue: 'Required',
    email: 'Invalid email address',
    url: 'Invalid URL',
    min: 'Value is too small',
    max: 'Value is too large',
    minlength: 'Too short',
    maxlength: 'Too long',
    pattern: 'Invalid format',
    json: 'Invalid JSON',
    number: 'Must be a number',
    integer: 'Must be an integer',
    color: 'Use a hex color such as #2563eb',
    regex: 'Invalid regular expression',
    minItems: 'Too few items',
    maxItems: 'Too many items'
};

function isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function numberValidator(control: AbstractControl): DynamicFormErrorMap {
    return isEmpty(control.value) || Number.isFinite(Number(control.value)) ? null : { number: true };
}

function integerValidator(control: AbstractControl): DynamicFormErrorMap {
    if (isEmpty(control.value)) {
        return null;
    }
    const value = Number(control.value);
    return Number.isFinite(value) && Math.floor(value) === value ? null : { integer: true };
}

function colorValidator(control: AbstractControl): DynamicFormErrorMap {
    if (isEmpty(control.value)) {
        return null;
    }
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(control.value))
        ? null
        : { color: true };
}

function regexValidator(control: AbstractControl): DynamicFormErrorMap {
    if (isEmpty(control.value)) {
        return null;
    }
    try {
        new RegExp(String(control.value));
        return null;
    } catch {
        return { regex: true };
    }
}

function itemsValidator(kind: 'minItems' | 'maxItems', limit: number): ValidatorFn {
    return (control: AbstractControl): DynamicFormErrorMap => {
        if (!Array.isArray(control.value)) {
            return null;
        }
        const count = control.value.length;
        if (kind === 'minItems' && count < limit) {
            return { minItems: { required: limit, actual: count } };
        }
        if (kind === 'maxItems' && count > limit) {
            return { maxItems: { required: limit, actual: count } };
        }
        return null;
    };
}

function urlValidator(control: AbstractControl): DynamicFormErrorMap {
    if (isEmpty(control.value)) {
        return null;
    }
    return /^(https?:\/\/|\/)[^\s]+$/i.test(String(control.value)) ? null : { url: true };
}

export function jsonValidator(control: AbstractControl): DynamicFormErrorMap {
    if (isEmpty(control.value)) {
        return null;
    }
    if (typeof control.value !== 'string') {
        return null;
    }
    try {
        JSON.parse(control.value);
        return null;
    } catch {
        return { json: true };
    }
}

function normalizedRules(field: DynamicFormField): DynamicFormRule[] {
    const rules: DynamicFormRule[] = [];
    const seen = new Set<DynamicFormRuleType>();
    const push = (rule: DynamicFormRule): void => {
        if (seen.has(rule.type)) {
            return;
        }
        seen.add(rule.type);
        rules.push(rule);
    };

    (field.rules || []).forEach(rule => {
        push(typeof rule === 'string' ? { type: rule } : rule);
    });
    if (field.required) {
        push({ type: 'required' });
    }
    if (field.type === 'number' || field.type === 'range') {
        push({ type: 'number' });
    }
    if (field.type === 'email') {
        push({ type: 'email' });
    }
    if (field.type === 'url') {
        push({ type: 'url' });
    }
    if (field.type === 'json') {
        push({ type: 'json' });
    }
    if (field.type === 'color') {
        push({ type: 'color' });
    }
    if (field.min !== undefined) {
        push({ type: 'min', value: field.min });
    }
    if (field.max !== undefined) {
        push({ type: 'max', value: field.max });
    }
    if (field.minLength !== undefined) {
        push({ type: 'minLength', value: field.minLength });
    }
    if (field.maxLength !== undefined) {
        push({ type: 'maxLength', value: field.maxLength });
    }
    if (field.pattern) {
        push({ type: 'pattern', value: field.pattern });
    }
    if (field.minItems !== undefined) {
        push({ type: 'minItems', value: field.minItems });
    }
    if (field.maxItems !== undefined) {
        push({ type: 'maxItems', value: field.maxItems });
    }
    return rules;
}

function validatorFor(rule: DynamicFormRule): ValidatorFn | undefined {
    switch (rule.type) {
        case 'required':
            return Validators.required;
        case 'requiredTrue':
            return Validators.requiredTrue;
        case 'email':
            return Validators.email;
        case 'url':
            return urlValidator;
        case 'min':
            return Validators.min(Number(rule.value));
        case 'max':
            return Validators.max(Number(rule.value));
        case 'minLength':
            return Validators.minLength(Number(rule.value));
        case 'maxLength':
            return Validators.maxLength(Number(rule.value));
        case 'pattern':
            try {
                return Validators.pattern(new RegExp(String(rule.value)));
            } catch {
                return undefined;
            }
        case 'json':
            return jsonValidator;
        case 'color':
            return colorValidator;
        case 'regex':
            return regexValidator;
        case 'minItems':
            return itemsValidator('minItems', Number(rule.value));
        case 'maxItems':
            return itemsValidator('maxItems', Number(rule.value));
        case 'number':
            return numberValidator;
        case 'integer':
            return integerValidator;
        default:
            return undefined;
    }
}

/** Translate the JSON rule list into `@tsdi/components/forms` validators. */
/** Values prefixed with msg./flow./global./env. are references, not literals. */
export function isTypedReference(value: any): boolean {
    return typeof value === 'string' && /^(msg|flow|global|env)\./.test(value);
}

export function buildDynamicValidators(field: DynamicFormField): BuiltDynamicValidators {
    const validators: ValidatorFn[] = [];
    const messages: Record<string, string> = {};
    normalizedRules(field).forEach(rule => {
        const validator = validatorFor(rule);
        if (!validator) {
            return;
        }
        if (field.typed === true) {
            const literalValidator = validator;
            validators.push(control => isTypedReference(control.value) ? null : literalValidator(control));
        } else {
            validators.push(validator);
        }
        if (rule.message) {
            const errorKey = rule.type === 'minLength'
                ? 'minlength'
                : rule.type === 'maxLength'
                    ? 'maxlength'
                    : rule.type;
            messages[errorKey] = rule.message;
        }
    });
    return { validators, messages };
}

export function dynamicFormMessage(
    field: DynamicFormField,
    errors: DynamicFormErrorMap,
    ruleMessages: Record<string, string> | undefined,
    globalMessages: Record<string, string> | undefined
): string {
    if (!errors) {
        return '';
    }
    const keys = Object.keys(errors);
    for (const key of keys) {
        const message = field.errorMessages?.[key]
            || ruleMessages?.[key]
            || globalMessages?.[key]
            || DEFAULT_DYNAMIC_FORM_MESSAGES[key];
        if (message) {
            return message;
        }
    }
    return '';
}


export interface DynamicFormValidationIssue {
    key: string;
    errors: Record<string, any>;
    message: string;
}

/**
 * Validate plain form values against a schema without rendering it. This is the
 * shared entry point for hosts that need to validate node configuration before
 * saving or running a workflow.
 */
export function validateDynamicFormValues(
    schema: DynamicFormSchema | DynamicFormField[],
    values: Record<string, any> = {},
    messages?: Record<string, string>
): { valid: boolean; issues: DynamicFormValidationIssue[] } {
    const fields = Array.isArray(schema) ? schema : (schema?.fields || []);
    const issues: DynamicFormValidationIssue[] = [];
    for (const field of fields) {
        const control = { value: values?.[field.key] } as AbstractControl;
        const built = buildDynamicValidators(field);
        const errors: Record<string, any> = {};
        for (const validator of built.validators) {
            const result = validator(control);
            if (result) {
                Object.assign(errors, result);
            }
        }
        if (Object.keys(errors).length) {
            issues.push({
                key: field.key,
                errors,
                message: dynamicFormMessage(field, errors, built.messages, messages)
            });
        }
    }
    return { valid: issues.length === 0, issues };
}
