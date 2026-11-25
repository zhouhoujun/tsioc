import { Attribute, Component, Computed, ElementRef, OnDestroy, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { resolveFieldAria } from '../../field/src/field-semantics';
import { FormControl, FormGroup } from '@tsdi/components/forms';
import {
    DynamicFormChange,
    DynamicFormField,
    DynamicFormFieldAction,
    DynamicFormIssue,
    DynamicFormOption,
    DynamicFormResult,
    DynamicFormSchema,
    DynamicFormTypedSource,
    DynamicFormValidateResult
} from './dynamic-form.types';
import { buildDynamicValidators, dynamicFormMessage } from './dynamic-form.validation';
import { DYNAMIC_FORM_TEMPLATE } from './dynamic-form.template';
import { createDynamicFormClasses, DynamicFormClasses } from './dynamic-form.classes';
import { DynamicFieldWidgetComponent } from './dynamic-field-widget';
import { conditionMatches, normalizeSchema } from './dynamic-form.normalize';
import { applyFormSchema, formSchemaFields, refreshFormErrors, syncFormValues } from './dynamic-form.projection';
import { fieldWidgetComponent as resolveFieldWidgetComponent, fieldWidget } from './dynamic-form.widgets';
import {
    clearFormIssues,
    focusFirstFormError,
    formValidationResult,
    isFormValid,
    issueSeverityFor,
    mergedFormErrors,
    scheduleFormValidation,
    setFormIssues,
    validateFormAsync
} from './dynamic-form.validation-state';
import * as editor from './dynamic-form.editors';
import * as fields from './dynamic-form.fields';

let dynamicFormSequence = 0;

/**
 * Renderer-neutral, JSON-configurable dynamic form.
 *
 * Fields, groups, options, visibility conditions and validation rules are plain
 * data, so a host can build a complete form from a JSON document. Validation is
 * backed by `@tsdi/components/forms`; this component only owns projection,
 * editing state and error messages.
 */
@Component({
    selector: 'dynamic-form, ui-dynamic-form',
    imports: [DynamicFieldWidgetComponent],
    template: DYNAMIC_FORM_TEMPLATE
})
export class DynamicFormComponent implements OnDestroy {
    @Attribute() classPrefix = 'df';

    @Computed()
    get classes(): DynamicFormClasses {
        return createDynamicFormClasses(this.classPrefix);
    }
    @Attribute() showActions = false;
    @Attribute() submitLabel = '';
    @Attribute() resetLabel = '';
    @Attribute() resetFieldLabel = 'Reset to default';
    @Attribute() emptyLabel = 'No fields';
    @Attribute() messages: Record<string, string> = {};
    @Attribute() changeAction?: (change: DynamicFormChange) => void;
    @Attribute() blurAction?: (field: DynamicFormField) => void;
    /** Host callback for `field.actions` buttons. */
    @Attribute() actionAction?: (field: DynamicFormField, actionId: string) => void;
    /** Host hook for list-row actions; receives the row index and child field. */
    @Attribute() listItemActionAction?: (
        field: DynamicFormField,
        child: DynamicFormField,
        index: number,
        actionId: string
    ) => void;
    @Attribute() submitAction?: (result: DynamicFormResult) => void;
    @Attribute() resetAction?: (value: Record<string, any>) => void;
    @Attribute() validityAction?: (valid: boolean, errors: Record<string, any> | null) => void;
    /** Host focuses the field when validation fails (TUI maps this to its focus layer). */
    @Attribute() focusFieldAction?: (key: string) => void;
    /** Automatic async validation: none (host-driven), on change, on blur or on submit. */
    @Attribute() validateOn: 'none' | 'change' | 'blur' | 'submit' = 'none';
    @Attribute() validationDelay = 250;

    _schema: DynamicFormSchema = { fields: [] };
    /** Pending typed-source choice per field key (only while the value is empty). */
    typedSelections: Record<string, string> = {};
    protected _rawSchema?: any;
    _value: Record<string, any> = {};
    protected _contextKey = '';
    form?: FormGroup;
    formSignature = '';
    schemaSignature = '';
    protected valueSignature = '';
    protected schemaError = '';
    validationErrors: Record<string, Record<string, any> | null> = {};
    ruleMessages: Record<string, Record<string, string>> = {};
    /** Issues injected by the host (reference checks, server validation). */
    externalIssues: Record<string, DynamicFormIssue> = {};
    /** Issues produced by the last async validation run. */
    asyncIssues: Record<string, DynamicFormIssue> = {};
    validating = false;
    validationSequence = 0;
    validationTimer?: any;
    validationAbort?: AbortController;
    submitAttempted = false;
    valueVersion = 0;
    destroyed = false;
    protected syncQueued = false;
    protected syncMode: 'none' | 'soft' | 'force' = 'none';
    protected readonly formId = `dynamic-form-${++dynamicFormSequence}`;
    protected jsonRawFields: Record<string, boolean> = {};

    constructor(@Optional() elementRef?: ElementRef) { }

    @Attribute()
    set schema(value: DynamicFormSchema | string | any) {
        // Hosts that derive their schema from a model pass the same object until
        // the model changes; re-normalizing and re-stringifying it on every
        // render made selection feel slow (the signature covers fresh objects).
        if (value === this._rawSchema) {
            return;
        }
        this._rawSchema = value;
        let next: DynamicFormSchema;
        let error = '';
        try {
            next = normalizeSchema(value);
        } catch (e) {
            next = { fields: [] };
            error = `Invalid form schema: ${(e as Error).message}`;
        }
        const signature = JSON.stringify(next);
        if (signature === this.schemaSignature && error === this.schemaError) {
            return;
        }
        this.schemaSignature = signature;
        this.schemaError = error;
        this._schema = next;
        Promise.resolve().then(() => {
            if (!this.destroyed) {
                this.applySchema();
            }
        });
    }
    get schema(): DynamicFormSchema {
        return this._schema;
    }

    @Attribute()
    set value(value: Record<string, any> | null | undefined) {
        const next = value && typeof value === 'object' ? value : {};
        const signature = JSON.stringify(next);
        if (signature === this.valueSignature) {
            return;
        }
        this.valueSignature = signature;
        this._value = next;
        this.scheduleSync(false);
    }
    get value(): Record<string, any> {
        return this._value;
    }

    @Attribute()
    set contextKey(value: string) {
        const next = String(value ?? '');
        if (next === this._contextKey) {
            return;
        }
        this._contextKey = next;
        this.scheduleSync(true);
    }
    get contextKey(): string {
        return this._contextKey;
    }

    protected scheduleSync(force: boolean): void {
        if (force) {
            this.syncMode = 'force';
        } else if (this.syncMode === 'none') {
            this.syncMode = 'soft';
        }
        if (this.syncQueued) {
            return;
        }
        this.syncQueued = true;
        Promise.resolve().then(() => {
            this.syncQueued = false;
            const mode = this.syncMode;
            this.syncMode = 'none';
            if (!this.destroyed) {
                this.syncValues(mode === 'force');
            }
        });
    }

    get submitText(): string {
        return this.submitLabel || this._schema?.submitLabel || 'Submit';
    }

    get resetText(): string {
        return this.resetLabel || this._schema?.resetLabel || 'Reset';
    }

    get formValid(): boolean { return this.isValid(); }

    protected isValid(): boolean { return isFormValid(this); }

    protected mergedErrors(): Record<string, any> | null { return mergedFormErrors(this); }

    get isDirty(): boolean {
        return !!this.form?.dirty;
    }

    /** Visible fields grouped under their section headers. */
    @Computed()
    get visibleGroups(): Array<{ label: string; fields: DynamicFormField[] }> {
        // `valueVersion` is the reactive signal for noReact form controls; the
        // computed cache invalidates when it or the schema/field conditions
        // change.
        void this.valueVersion;
        const groups: Array<{ label: string; fields: DynamicFormField[] }> = [];
        const index: Record<string, number> = {};
        this.schemaFields().forEach(field => {
            if (field.hidden || field.type === 'hidden' || !this.isVisible(field)) {
                return;
            }
            const label = field.group || this._schema?.defaultGroupLabel || '';
            let position = index[label];
            if (position === undefined) {
                position = groups.length;
                index[label] = position;
                groups.push({ label, fields: [] });
            }
            groups[position].fields.push(field);
        });
        return groups;
    }

    // -----------------------------------------------------------------
    // Form projection
    // -----------------------------------------------------------------

    schemaFields(): DynamicFormField[] { return formSchemaFields(this); }

    protected applySchema(): void { applyFormSchema(this); }

    protected syncValues(force: boolean): void { syncFormValues(this, force); }

    refreshErrors(): void { refreshFormErrors(this); }

    fieldDisplayValue(field: DynamicFormField, value: any): any { return fields.fieldDisplayValue(field, value); }

    protected initialValue(field: DynamicFormField): any { return fields.initialValue(this, field); }

    /** Default value used by the per-field and whole-form reset actions. */
    protected resetValue(field: DynamicFormField): any { return fields.resetValue(field); }

    coerceValue(field: DynamicFormField, value: any): any { return fields.coerceValue(field, value); }

    updateValue(field: DynamicFormField, raw: any): void {
        const control = this.form?.get(field.key);
                if (!control) {
            return;
        }
        control.setValue(this.coerceValue(field, raw));
        control.markAsDirty();
        control.markAsTouched();
        this.valueVersion += 1;
        this.validationErrors = { ...this.validationErrors, [field.key]: control.errors };
        const change: DynamicFormChange = {
            key: field.key,
            value: control.value,
            field,
            valid: control.valid,
            errors: control.errors
        };
        this.changeAction?.(change);
        this.validityAction?.(this.isValid(), this.mergedErrors());
        scheduleFormValidation(this, 'change');
    }

    setEditorValue(field: DynamicFormField, value: any): void {
        this._value = { ...(this._value || {}), [field.key]: value };
        this.valueSignature = JSON.stringify(this._value);
        this.updateValue(field, value);
    }

    isJsonRawField(field: DynamicFormField): boolean {
        return this.jsonRawFields[field.key] === true;
    }

    setJsonRawField(field: DynamicFormField, raw: boolean): void {
        const next = { ...this.jsonRawFields };
        if (raw) {
            next[field.key] = true;
        } else {
            delete next[field.key];
        }
        this.jsonRawFields = next;
    }

    isJsonRaw(field: DynamicFormField): boolean { return editor.isJsonRaw(this, field); }

    isJsonObjectValue(field: DynamicFormField): boolean { return editor.isJsonObjectValue(this, field); }

    isJsonObjectEditor(field: DynamicFormField): boolean { return editor.isJsonObjectEditor(this, field); }

    isJsonTextArea(field: DynamicFormField): boolean { return editor.isJsonTextArea(this, field); }

    jsonTextValue(field: DynamicFormField): string { return editor.jsonTextValue(this, field); }

    toggleJsonMode(field: DynamicFormField): void { editor.toggleJsonMode(this, field); }

    jsonEntries(field: DynamicFormField): Array<{ key: string; value: any; display: string }> { return editor.jsonEntries(this, field); }


    addJsonEntry(field: DynamicFormField): void { editor.addJsonEntry(this, field); }

    removeJsonEntry(field: DynamicFormField, index: number): void { editor.removeJsonEntry(this, field, index); }

    changeJsonEntryKey(field: DynamicFormField, index: number, event: any): void { editor.changeJsonEntryKey(this, field, index, event); }

    changeJsonEntryValue(field: DynamicFormField, index: number, event: any): void { editor.changeJsonEntryValue(this, field, index, event); }


    isKeyValueInput(field: DynamicFormField): boolean { return editor.isKeyValueInput(field); }

    keyValueValueType(field: DynamicFormField): 'text' | 'number' | 'boolean' { return editor.keyValueValueType(field); }

    keyValueEntries(field: DynamicFormField): Array<{ key: string; value: any }> { return editor.keyValueEntries(this, field); }


    addKeyValue(field: DynamicFormField): void { editor.addKeyValue(this, field); }

    removeKeyValue(field: DynamicFormField, index: number): void { editor.removeKeyValue(this, field, index); }

    changeKeyValueKey(field: DynamicFormField, index: number, event: any): void { editor.changeKeyValueKey(this, field, index, event); }

    changeKeyValueValue(field: DynamicFormField, index: number, event: any): void { editor.changeKeyValueValue(this, field, index, event); }


    isJsonInput(field: DynamicFormField): boolean { return editor.isJsonInput(field); }

    isListInput(field: DynamicFormField): boolean { return editor.isListInput(field); }

    listIndex(field: DynamicFormField, item: any): number { return editor.listIndex(this, field, item); }

    listItems(field: DynamicFormField): any[] { return editor.listItems(this, field); }

    listItemValue(item: any, child: DynamicFormField): any { return editor.listItemValue(this, item, child); }

    listItemChecked(item: any, child: DynamicFormField): boolean { return editor.listItemChecked(item, child); }

    isListItemVisible(child: DynamicFormField, item: any): boolean { return editor.isListItemVisible(child, item); }

    listItemError(child: DynamicFormField, item: any): string { return editor.listItemError(this, child, item); }


    addListItem(field: DynamicFormField): void { editor.addListItem(this, field); }
    moveListItem(field: DynamicFormField, index: number, delta: number): void { editor.moveListItem(this, field, index, delta); }
    listRowSummary(field: DynamicFormField, item: any, index: number): string { return editor.listRowSummary(field, item, index); }

    removeListItem(field: DynamicFormField, index: number): void { editor.removeListItem(this, field, index); }

    changeListItem(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItem(this, field, index, child, event); }

    listItemTypedType(item: any, child: DynamicFormField): string { return editor.listItemTypedType(this, item, child); }

    changeListItemTypedType(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItemTypedType(this, field, index, child, event); }

    changeListItemOption(field: DynamicFormField, index: number, child: DynamicFormField, value: any): void { editor.changeListItemOption(this, field, index, child, value); }

    changeListItemSelect(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItemSelect(this, field, index, child, event); }


    changeText(field: DynamicFormField, event: any): void {
        let raw = event?.target?.value;
        if (field.typed === true && typeof raw === 'string' && raw !== '') {
            raw = fields.typedCodec(field).encode(this.typedType(field), raw);
        }
        this.updateValue(field, raw);
    }

    changeBoolean(field: DynamicFormField, event: any): void {
        this.updateValue(field, !!event?.target?.checked);
    }

    chooseOption(field: DynamicFormField, value: any): void {
        this.updateValue(field, value);
    }

    /**
     * Native `<select>` reports the option value as a string. Map it back to the
     * schema option so numeric/boolean option values keep their original type.
     */
    optionValue(field: DynamicFormField, raw: any): any {
        const match = (field.options || []).find(option => this.sameOptionValue(option.value, raw));
        return match ? match.value : raw;
    }

    changeSelect(field: DynamicFormField, event: any): void {
        if (fields.isMultiSelect(field)) {
            this.updateValue(field, fields.multiselectChangeValue(event));
            return;
        }
        this.updateValue(field, this.optionValue(field, event?.target?.value));
    }

    blurField(field: DynamicFormField): void {
        this.blurAction?.(field);
        scheduleFormValidation(this, 'blur');
    }

    /** Report a schema-declared field action (`field.actions`) to the host. */
    runFieldAction(field: DynamicFormField, action: DynamicFormFieldAction): void {
        editor.runFieldAction(this, field, action);
    }

    /** Field action on a list row; the host resolves the child field by key. */
    runListItemAction(
        field: DynamicFormField,
        index: number,
        child: DynamicFormField,
        action: DynamicFormFieldAction
    ): void {
        editor.runListItemAction(this, field, child, index, action);
    }

    // -----------------------------------------------------------------
    // Reset / submit
    // -----------------------------------------------------------------

    resetField(field: DynamicFormField): void {
        const control = this.form?.get(field.key);
        if (!control) {
            return;
        }
        control.reset(this.resetValue(field), { emitEvent: false });
        if (field.typed === true) {
            delete this.typedSelections[field.key];
        }
        this.clearIssues([field.key]);
        this.valueVersion += 1;
        this.validationErrors = { ...this.validationErrors, [field.key]: control.errors };
        this.changeAction?.({
            key: field.key,
            value: control.value,
            field,
            valid: control.valid,
            errors: control.errors
        });
        this.validityAction?.(this.isValid(), this.mergedErrors());
    }

    /** Reset controls to schema defaults. Pass `false` for a silent reset. */
    reset(emit = true): Record<string, any> {
        this.schemaFields().forEach(field => {
            const value = field.defaultValue !== undefined
                ? this.resetValue(field)
                : this.initialValue(field);
            this.form?.get(field.key)?.reset(value, { emitEvent: false });
        });
        this.submitAttempted = false;
        this.validationSequence += 1;
        this.validationAbort?.abort();
        this.validationAbort = undefined;
        this.validating = false;
        this.clearIssues();
        this.valueVersion += 1;
        this.refreshErrors();
        if (emit) {
            const value = this.getValue();
            this.resetAction?.(value);
            this.validityAction?.(this.isValid(), this.mergedErrors());
        }
        return this.getValue();
    }

    resetForm(): void {
        this.reset(true);
    }

    submit(): DynamicFormResult {
        this.submitAttempted = true;
        this.form?.markAllAsTouched();
        this.refreshErrors();
        const result: DynamicFormResult = {
            value: this.getValue(),
            valid: this.isValid(),
            errors: this.mergedErrors()
        };
        if (!result.valid) {
            this.focusFirstError();
        }
        this.submitAction?.(result);
        return result;
    }

    validate(): DynamicFormValidateResult {
        return { valid: this.isValid(), value: this.getValue(), errors: this.mergedErrors() };
    }

    /** Host-injected issues (reference checks, server validation). */
    setIssues(issues: DynamicFormIssue[] = []): void {
        setFormIssues(this, issues);
        this.valueVersion += 1;
    }

    /** Clear external (all or selected keys) and/or async issues. */
    clearIssues(keys?: string[], source: 'external' | 'async' | 'all' = 'all'): void {
        clearFormIssues(this, keys, source);
        this.valueVersion += 1;
    }

    /** Run field/schema async validation; stale runs are ignored. */
    async validateAsync(): Promise<DynamicFormValidateResult> { return validateFormAsync(this); }

    /** Async submit: validate first, then report the merged result. */
    async submitAsync(): Promise<DynamicFormResult> {
        const result = await this.validateAsync();
        this.submitAction?.(result);
        return result;
    }

    protected validationResult(): DynamicFormValidateResult { return formValidationResult(this); }

    focusFirstError(): string { return focusFirstFormError(this); }

    issueSeverity(field: DynamicFormField): string { return issueSeverityFor(this, field); }

    getValue(): Record<string, any> {
        return fields.formModelValue(this, this.schemaFields());
    }

    setValue(value: Record<string, any>): void {
        this._value = value && typeof value === 'object' ? value : {};
        this.valueSignature = JSON.stringify(this._value);
        this.valueVersion += 1;
        this.syncValues(true);
    }

    patchValue(value: Record<string, any>): void {
        this.setValue({ ...this._value, ...(value || {}) });
    }

    // -----------------------------------------------------------------
    // Field state / messages
    // -----------------------------------------------------------------

    sameOptionValue(a: any, b: any): boolean {
        return String(a) === String(b);
    }

    isVisible(field: DynamicFormField): boolean {
        if (!field.visibleWhen) {
            return true;
        }
        const control = this.form?.get(field.visibleWhen.key);
        const actual = control ? control.value : this._value?.[field.visibleWhen.key];
        return conditionMatches(actual, field.visibleWhen);
    }

    fieldLabel(field: DynamicFormField): string { return fields.fieldLabel(field); }

    fieldValue(field: DynamicFormField): any { return fields.fieldValue(this, field); }

    fieldChecked(field: DynamicFormField): boolean { return fields.fieldChecked(this, field); }

    isRequired(field: DynamicFormField): boolean { return fields.isRequired(field); }

    canReset(field: DynamicFormField): boolean { return fields.canReset(field); }

    errorFor(field: DynamicFormField): string { return fields.errorFor(this, field); }

    protected safeIdPart(key: unknown): string { return String(key ?? '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'field'; }

    fieldErrorId(field: DynamicFormField): string { return `${this.formId}-error-${this.safeIdPart(field?.key)}`; }

    fieldHintId(field: DynamicFormField): string { return `${this.formId}-hint-${this.safeIdPart(field?.key)}`; }

    describedByFor(field: DynamicFormField): string {
        return resolveFieldAria({
            hint: field?.description,
            error: this.errorFor(field),
            hintId: this.fieldHintId(field),
            errorId: this.fieldErrorId(field)
        }).describedBy;
    }

    encodeValue(field: DynamicFormField): string { return fields.encodeValue(this, field); }

    suggestionData(field: DynamicFormField): string { return fields.suggestionData(field); }

    htmlType(field: DynamicFormField): string { return fields.htmlType(field); }

    isTextInput(field: DynamicFormField): boolean { return fields.isTextInput(field); }

    isNumberInput(field: DynamicFormField): boolean { return fields.isNumberInput(field); }

    isBooleanInput(field: DynamicFormField): boolean { return fields.isBooleanInput(field); }

    isWidgetInput(field: DynamicFormField): boolean { return fields.isWidgetInput(field); }
    widgetFor(field: DynamicFormField): any { return fieldWidget(this._schema, field); }
    fieldWidgetComponent(field: DynamicFormField): any { return resolveFieldWidgetComponent(this._schema, field); }
    @Computed()
    get formValues(): Record<string, any> { return this.getValue(); }
    changeWidgetValue = (field: DynamicFormField, value: any): void => { this.updateValue(field, value); };
    isSelectInput(field: DynamicFormField): boolean { return fields.isSelectInput(field); }
    isMultiSelect(field: DynamicFormField): boolean { return fields.isMultiSelect(field); }
    optionSelected(field: DynamicFormField, value: any): boolean { return fields.optionSelected(this, field, value); }

    isRadioInput(field: DynamicFormField): boolean { return fields.isRadioInput(field); }

    /** @deprecated use `isSelectInput`/`isRadioInput`; kept for host templates. */
    isOptionInput(field: DynamicFormField): boolean { return fields.isOptionInput(field); }

    isTypedInput(field: DynamicFormField): boolean { return fields.isTypedInput(field); }

    /** Localised source options; the host may override them per schema. */
    get typedSourceOptions(): DynamicFormTypedSource[] { return fields.typedSources(this._schema); }
    typedSourceOptionsFor(field: DynamicFormField): DynamicFormTypedSource[] { return fields.typedSourcesFor(this._schema, field); }

    typedType(field: DynamicFormField): string { return fields.typedType(this, field); }
    typedText(field: DynamicFormField): string { return fields.typedText(this, field); }
    typedHtmlType(field: DynamicFormField): string { return fields.typedHtmlType(this, field); }
    changeTypedType(field: DynamicFormField, event: any): void { fields.changeTypedType(this, field, event); }

    isTextareaInput(field: DynamicFormField): boolean { return fields.isTextareaInput(field); }

    isCodeInput(field: DynamicFormField): boolean { return fields.isCodeInput(field); }

    // -----------------------------------------------------------------
    // Class helpers (keep skins configurable through `classPrefix`)
    // -----------------------------------------------------------------

    fieldClass(field: DynamicFormField): string {
        const span = field.span || 'full';
        return [
            `${this.classPrefix}-field`,
            span === 'half' ? 'is-half' : 'is-full',
            field.fieldClass || ''
        ].filter(Boolean).join(' ');
    }
    inputClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-input`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    selectClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-select`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    inputWrapClass(field: DynamicFormField): string {
        return `${this.classPrefix}-input-wrap${field.unit ? ' has-unit' : ''}`;
    }
    textareaClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-textarea`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    codeClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-textarea`, `${this.classPrefix}-code-editor`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    optionClass(field: DynamicFormField, option: DynamicFormOption): string {
        return [
            `${this.classPrefix}-option`,
            this.sameOptionValue(option.value, this.fieldValue(field)) ? 'is-selected' : '',
            option.disabled || field.disabled || field.readonly ? 'is-disabled' : ''
        ].filter(Boolean).join(' ');
    }

    onDestroy(): void {
        this.destroyed = true;
        if (this.validationTimer) {
            clearTimeout(this.validationTimer);
            this.validationTimer = undefined;
        }
        this.validationSequence += 1;
        this.validationAbort?.abort();
        this.validationAbort = undefined;
    }
}
