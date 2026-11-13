/**
 * JSON-friendly schema for the renderer-neutral dynamic form.
 *
 * The schema is intentionally plain data so it can come from a literal object,
 * a JSON file or an HTTP response. Validation is declared with simple rule
 * objects instead of functions, which keeps the configuration serializable.
 */

export type DynamicFormFieldType =
    | 'text'
    | 'password'
    | 'email'
    | 'url'
    | 'tel'
    | 'search'
    | 'number'
    | 'range'
    | 'textarea'
    | 'json'
    | 'code'
    | 'checkbox'
    | 'switch'
    | 'select'
    | 'radio'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'color'
    | 'hidden'
    | 'list'
    | 'keyvalue';

export interface DynamicFormOption {
    label: string;
    value: any;
    disabled?: boolean;
}

export type DynamicFormRuleType =
    | 'required'
    | 'requiredTrue'
    | 'email'
    | 'url'
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'json'
    | 'number'
    | 'integer'
    | 'color'
    | 'regex'
    | 'minItems'
    | 'maxItems';

export interface DynamicFormRule {
    type: DynamicFormRuleType;
    /** Argument for min/max/minLength/maxLength/pattern. */
    value?: any;
    /** Message shown when this rule fails. */
    message?: string;
}

export interface DynamicFormCondition {
    key: string;
    equals?: any;
    notEquals?: any;
    in?: any[];
    truthy?: boolean;
    falsy?: boolean;
}

export interface DynamicFormField {
    key: string;
    type: DynamicFormFieldType;
    label?: string;
    placeholder?: string;
    description?: string;
    /** Section header; fields with the same group render together. */
    group?: string;
    defaultValue?: any;
    options?: DynamicFormOption[];
    rows?: number;
    min?: number;
    max?: number;
    step?: number;
    /** Optional suffix shown inside the control (for example `ms`, `s`, `%`). */
    unit?: string;
    /** Grid width inside its section; short controls default to half width. */
    span?: 'full' | 'half';
    /** Item schema for list/array fields. */
    itemFields?: DynamicFormField[];
    addLabel?: string;
    removeLabel?: string;
    minItems?: number;
    maxItems?: number;
    /** Value editor used by key/value fields. */
    valueType?: 'text' | 'number' | 'boolean';
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
    readonly?: boolean;
    disabled?: boolean;
    /** Code editor language hint (code fields). */
    language?: string;
    /** Editor completion paths offered by the host (code fields). */
    suggestions?: string[];
    /** Extra class applied to the input/textarea element. */
    inputClass?: string;
    /** Extra class applied to the field wrapper. */
    fieldClass?: string;
    rules?: Array<DynamicFormRule | DynamicFormRuleType>;
    /** Per-field message overrides, keyed by rule/error name. */
    errorMessages?: Record<string, string>;
    /** Render the field only when another control matches the condition. */
    visibleWhen?: DynamicFormCondition;
    /** Keep the value in the form model but do not render it. */
    hidden?: boolean;
}

export interface DynamicFormSchema {
    fields: DynamicFormField[];
    /** Title used for fields that do not declare a group. */
    defaultGroupLabel?: string;
    /** Labels for switching JSON fields between key/value rows and raw JSON. */
    jsonFieldsLabel?: string;
    jsonTextLabel?: string;
    messages?: Record<string, string>;
    submitLabel?: string;
    resetLabel?: string;
}

export interface DynamicFormChange {
    key: string;
    value: any;
    field: DynamicFormField;
    valid: boolean;
    errors: Record<string, any> | null;
}

export interface DynamicFormResult {
    value: Record<string, any>;
    valid: boolean;
    errors: Record<string, any> | null;
}

export interface DynamicFormValidateResult {
    valid: boolean;
    value: Record<string, any>;
    errors: Record<string, any> | null;
}
