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
    | 'keyvalue'
    | 'widget';

export interface DynamicFormOption {
    label: string;
    value: any;
    disabled?: boolean;
}

/**
 * Trailing control action declared by the field schema.
 *
 * The form only renders the button and reports the id back to the host; the
 * host owns what the action does (open a dialog, create a referenced record,
 * clear a value). This keeps the schema JSON-friendly.
 */
export interface DynamicFormFieldAction {
    id: string;
    label: string;
    icon?: string;
    /** Accessible name/tooltip; falls back to `label`. */
    title?: string;
}

/**
 * One selectable source for a typed field (`literal` value, `msg.payload`,
 * `flow.var`, ...). Labels are host-supplied so the control follows the host's
 * locale; the value is what gets prefixed onto the stored string.
 */
/** Validation issue from field/schema hooks or the host (server/reference checks). */
export interface DynamicFormIssue {
    key: string;
    message: string;
    /** Warnings are displayed but do not block submit. */
    severity?: 'error' | 'warning';
}

export interface DynamicFormValidationContext {
    value: any;
    values: Record<string, any>;
    /** The field as provided by the host schema (host extensions keep their type). */
    field: any;
    /** Aborted when a newer validation run supersedes this one. */
    signal?: AbortSignal;
}

export interface DynamicFormTypedSource {
    /** Selector value; hosts may add sources (`num`, `json`, `jsonata`, ...). */
    value: string;
    label: string;
    /** Input control used while this source is active (defaults to the field type). */
    input?: 'text' | 'number' | 'password' | 'url';
}

/** Stored typed value split into the selector source and editable text. */
export interface DynamicFormTypedDecoded {
    source: string;
    text: string;
}

/**
 * Pluggable storage format for typed fields. The default codec prefixes the
 * source onto a string (`msg.payload`); hosts with richer needs (explicit
 * literal types, object references) supply their own so the stored shape stays
 * unambiguous while the control keeps showing plain text.
 */
export interface DynamicFormTypedCodec {
    decode(value: any): DynamicFormTypedDecoded;
    encode(source: string, text: string): any;
    /** A value that points at host context instead of carrying a literal. */
    isReference?(value: any): boolean;
    /** Inline validation for the stored typed value (JSON/regex/expression). */
    validate?(value: any, field?: DynamicFormField): string | undefined;
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
    /** Show a literal/msg/flow/global/env reference selector for this field. */
    typed?: boolean;
    /** Storage codec for {@link typed}; defaults to `msg.`-style prefixes. */
    typedCodec?: DynamicFormTypedCodec;
    /** Sources for this field; falls back to the schema list. */
    typedSources?: DynamicFormTypedSource[];
    label?: string;
    placeholder?: string;
    description?: string;
    /** Section header; fields with the same group render together. */
    group?: string;
    defaultValue?: any;
    options?: DynamicFormOption[];
    /** Allow several select values; stored as a comma separated string. */
    multiple?: boolean;
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
    /** Allow moving list rows up/down (TUI-safe alternative to drag/drop). */
    reorder?: boolean;
    /** Summary shown on each list row (for example `field = value`). */
    rowSummary?(item: any, index: number): string;
    /** Registered widget type (see {@link DynamicFormWidget}); uses `type: 'widget'`. */
    widget?: string;
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
    /** Trailing action buttons (reference pickers, inline editors). */
    actions?: DynamicFormFieldAction[];
    /** Render the field only when another control matches the condition. */
    visibleWhen?: DynamicFormCondition;
    /** Keep the value in the form model but do not render it. */
    hidden?: boolean;
    /**
     * Field-level validation (sync or async). Return a message to fail.
     * Hosts may instead inject issues with `DynamicFormComponent.setIssues`.
     */
    validate?(value: any, context: DynamicFormValidationContext):
        string | undefined | Promise<string | undefined>;
}

/**
 * Renderer-neutral field widget. Hosts register components by type; the form
 * only forwards field/value/error/change, so DOM and TUI share the same code.
 * Unknown types fall back to a text input.
 */
export interface DynamicFormWidget {
    type: string;
    component: any;
}

export interface DynamicFormSchema {
    fields: DynamicFormField[];
    /** Widgets referenced by `field.widget` (`field.type` must be `widget`). */
    widgets?: DynamicFormWidget[];
    /** Title used for fields that do not declare a group. */
    defaultGroupLabel?: string;
    /** Labels for the typed-value source selector; defaults to English. */
    typedSources?: DynamicFormTypedSource[];
    /** Labels for switching JSON fields between key/value rows and raw JSON. */
    jsonFieldsLabel?: string;
    jsonTextLabel?: string;
    messages?: Record<string, string>;
    /** Cross-field validation run after field hooks. */
    validate?(values: Record<string, any>, signal?: AbortSignal):
        DynamicFormIssue[] | Promise<DynamicFormIssue[]>;
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
