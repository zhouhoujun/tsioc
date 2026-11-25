import type {
    DynamicFormCondition,
    DynamicFormField,
    DynamicFormSchema
} from './dynamic-form.types';

/** Coerce one host field into the normalized plain-data schema. */
export function normalizeField(field: any): DynamicFormField {
    return {
        ...field,
        key: String(field?.key ?? ''),
        type: field?.type || 'text',
        options: Array.isArray(field?.options) ? field.options : undefined,
        rules: Array.isArray(field?.rules) ? field.rules : undefined
    };
}

/** Accept JSON, a field array or a schema object. */
export function normalizeSchema(value: any): DynamicFormSchema {
    let raw = value;
    if (typeof raw === 'string') {
        raw = JSON.parse(raw);
    }
    if (Array.isArray(raw)) {
        raw = { fields: raw };
    }
    if (!raw || typeof raw !== 'object') {
        return { fields: [] };
    }
    return {
        ...raw,
        fields: (Array.isArray(raw.fields) ? raw.fields : [])
            .filter((field: any) => field && field.key)
            .map(normalizeField)
    };
}

export function conditionMatches(actual: any, condition: DynamicFormCondition): boolean {
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
