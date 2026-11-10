import { Attribute, Component, OnDestroy, noReact } from '@tsdi/components';
import { FormControl, FormGroup } from '@tsdi/components/forms';
import {
    DynamicFormChange,
    DynamicFormCondition,
    DynamicFormField,
    DynamicFormOption,
    DynamicFormResult,
    DynamicFormSchema,
    DynamicFormValidateResult
} from './dynamic-form.types';
import { buildDynamicValidators, dynamicFormMessage } from './dynamic-form.validation';

function normalizeField(field: any): DynamicFormField {
    return {
        ...field,
        key: String(field?.key ?? ''),
        type: field?.type || 'text',
        options: Array.isArray(field?.options) ? field.options : undefined,
        rules: Array.isArray(field?.rules) ? field.rules : undefined
    };
}

function normalizeSchema(value: any): DynamicFormSchema {
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

function conditionMatches(actual: any, condition: DynamicFormCondition): boolean {
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

function hasOwn(value: any, key: string): boolean {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

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
    selector: 'dynamic-form',
    template: `
    <div [class]="formClass()">
        <div [class]="schemaErrorClass()" v-if="schemaError">{{schemaError}}</div>
        <div v-else>
            <div [class]="noFieldsClass()" v-if="!visibleGroups.length">{{emptyLabel}}</div>
            <div [class]="groupClass()" v-for="group in visibleGroups">
                <div [class]="groupTitleClass()" v-if="group.label">{{group.label}}</div>
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="labelRowClass()" v-if="field.type !== 'hidden'">
                        <label [class]="labelClass()">{{fieldLabel(field)}}<span [class]="requiredClass()" v-if="isRequired(field)">*</span></label>
                        <button [class]="resetClass()" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">↺</button>
                    </div>
                    <input v-if="isTextInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                        [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        [min]="field.min" [max]="field.max" [step]="field.step"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)" />
                    <input v-if="isNumberInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                        [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        [min]="field.min" [max]="field.max" [step]="field.step || 1"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)" />
                    <label v-if="isBooleanInput(field)" [class]="checkboxRowClass()">
                        <input type="checkbox" [checked]="fieldChecked(field)"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeBoolean(field, $event)" />
                        <span v-if="field.description">{{field.description}}</span>
                    </label>
                    <div v-if="isOptionInput(field)" [class]="optionsClass()" role="radiogroup"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}">
                        <label v-for="option in field.options" data-option-value="{{option.value}}"
                            [class]="optionClass(field, option)">
                            <input type="radio" name="{{formId}}-{{field.key}}"
                                [value]="option.value"
                                [checked]="sameOptionValue(option.value, fieldValue(field))"
                                [disabled]="field.disabled || field.readonly || option.disabled"
                                @change="chooseOption(field, option.value)" />
                            <span>{{option.label}}</span>
                        </label>
                    </div>
                    <textarea v-if="isTextareaInput(field)" [class]="textareaClass(field)"
                        [value]="fieldValue(field)" [rows]="field.rows || (field.type === 'json' ? 4 : 3)"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <textarea v-if="isCodeInput(field)" [class]="codeClass(field)"
                        data-dynamic-code="{{field.language || 'javascript'}}"
                        data-code-value="{{encodeValue(field)}}"
                        data-code-suggestions="{{suggestionData(field)}}"
                        [value]="fieldValue(field)" [rows]="field.rows || 8"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="errorClass()" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="hintClass()" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
            </div>
            <div [class]="actionsClass()" v-if="showActions">
                <button type="button" [class]="buttonClass(false)" @click="resetForm()">{{resetText}}</button>
                <button type="button" [class]="buttonClass(true)" @click="submit()">{{submitText}}</button>
            </div>
        </div>
    </div>`
})
export class DynamicFormComponent implements OnDestroy {
    @Attribute() classPrefix = 'df';
    @Attribute() showActions = false;
    @Attribute() submitLabel = '';
    @Attribute() resetLabel = '';
    @Attribute() resetFieldLabel = 'Reset to default';
    @Attribute() emptyLabel = 'No fields';
    @Attribute() messages: Record<string, string> = {};
    @Attribute() changeAction?: (change: DynamicFormChange) => void;
    @Attribute() blurAction?: (field: DynamicFormField) => void;
    @Attribute() submitAction?: (result: DynamicFormResult) => void;
    @Attribute() resetAction?: (value: Record<string, any>) => void;
    @Attribute() validityAction?: (valid: boolean, errors: Record<string, any> | null) => void;

    protected _schema: DynamicFormSchema = { fields: [] };
    protected _value: Record<string, any> = {};
    protected _contextKey = '';
    protected form?: FormGroup;
    protected formSignature = '';
    protected schemaSignature = '';
    protected valueSignature = '';
    protected schemaError = '';
    protected validationErrors: Record<string, Record<string, any> | null> = {};
    protected ruleMessages: Record<string, Record<string, string>> = {};
    protected submitAttempted = false;
    protected valueVersion = 0;
    protected destroyed = false;
    protected syncQueued = false;
    protected syncMode: 'none' | 'soft' | 'force' = 'none';
    protected readonly formId = `dynamic-form-${++dynamicFormSequence}`;

    @Attribute()
    set schema(value: DynamicFormSchema | string | any) {
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

    get formValid(): boolean {
        return !!this.form?.valid;
    }

    get isDirty(): boolean {
        return !!this.form?.dirty;
    }

    /** Visible fields grouped under their section headers. */
    get visibleGroups(): Array<{ label: string; fields: DynamicFormField[] }> {
        // Value-dependent visibility and select state must repaint on every edit.
        void this.valueVersion;
        const groups: Array<{ label: string; fields: DynamicFormField[] }> = [];
        const index: Record<string, number> = {};
        this.schemaFields().forEach(field => {
            if (field.hidden || field.type === 'hidden' || !this.isVisible(field)) {
                return;
            }
            const label = field.group || '';
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

    protected schemaFields(): DynamicFormField[] {
        return this._schema?.fields || [];
    }

    protected applySchema(): void {
        const fields = this.schemaFields();
        const signature = fields.map(field => [
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
        if (this.form && signature === this.formSignature) {
            this.syncValues(false);
            return;
        }
        const controls: Record<string, FormControl> = {};
        this.ruleMessages = {};
        fields.forEach(field => {
            const built = buildDynamicValidators(field);
            this.ruleMessages[field.key] = built.messages;
            controls[field.key] = new FormControl(this.initialValue(field), built.validators);
        });
        const form = new FormGroup(controls);
        (form as any)[noReact] = true;
        Object.values(controls).forEach(control => {
            (control as any)[noReact] = true;
        });
        this.form = form;
        this.formSignature = signature;
        this.valueVersion += 1;
        this.refreshErrors();
    }

    protected syncValues(force: boolean): void {
        if (!this.form) {
            this.applySchema();
            return;
        }
        this.schemaFields().forEach(field => {
            const control = this.form?.get(field.key);
            if (!control) {
                return;
            }
            const incoming = this.initialValue(field);
            if (force) {
                control.reset(incoming, { emitEvent: false });
            } else if (!control.dirty && control.value !== incoming) {
                control.setValue(incoming, { emitEvent: false });
            }
        });
        this.valueVersion += 1;
        this.refreshErrors();
    }

    protected refreshErrors(): void {
        const next: Record<string, Record<string, any> | null> = {};
        this.schemaFields().forEach(field => {
            next[field.key] = this.form?.get(field.key)?.errors || null;
        });
        this.validationErrors = next;
    }

    protected fieldDisplayValue(field: DynamicFormField, value: any): any {
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

    protected initialValue(field: DynamicFormField): any {
        const source = this._value || {};
        const value = hasOwn(source, field.key) ? source[field.key] : field.defaultValue;
        return this.fieldDisplayValue(field, value);
    }

    /** Default value used by the per-field and whole-form reset actions. */
    protected resetValue(field: DynamicFormField): any {
        return this.fieldDisplayValue(field, field.defaultValue);
    }

    protected coerceValue(field: DynamicFormField, value: any): any {
        if (field.type === 'checkbox' || field.type === 'switch') {
            return !!value;
        }
        if (field.type === 'number' || field.type === 'range') {
            return value === '' || value === undefined || value === null ? '' : Number(value);
        }
        return value;
    }

    protected updateValue(field: DynamicFormField, raw: any): void {
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
        this.validityAction?.(!!this.form?.valid, this.form?.errors || null);
    }

    changeText(field: DynamicFormField, event: any): void {
        this.updateValue(field, event?.target?.value);
    }

    changeBoolean(field: DynamicFormField, event: any): void {
        this.updateValue(field, !!event?.target?.checked);
    }

    chooseOption(field: DynamicFormField, value: any): void {
        this.updateValue(field, value);
    }

    blurField(field: DynamicFormField): void {
        this.blurAction?.(field);
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
        this.valueVersion += 1;
        this.validationErrors = { ...this.validationErrors, [field.key]: control.errors };
        this.changeAction?.({
            key: field.key,
            value: control.value,
            field,
            valid: control.valid,
            errors: control.errors
        });
        this.validityAction?.(!!this.form?.valid, this.form?.errors || null);
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
        this.valueVersion += 1;
        this.refreshErrors();
        if (emit) {
            const value = this.getValue();
            this.resetAction?.(value);
            this.validityAction?.(!!this.form?.valid, this.form?.errors || null);
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
            valid: !!this.form?.valid,
            errors: this.form?.errors || null
        };
        this.submitAction?.(result);
        return result;
    }

    validate(): DynamicFormValidateResult {
        return {
            valid: !!this.form?.valid,
            value: this.getValue(),
            errors: this.form?.errors || null
        };
    }

    getValue(): Record<string, any> {
        const value: Record<string, any> = {};
        this.schemaFields().forEach(field => {
            const control = this.form?.get(field.key);
            const raw = control ? control.value : this.initialValue(field);
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

    protected isVisible(field: DynamicFormField): boolean {
        if (!field.visibleWhen) {
            return true;
        }
        const control = this.form?.get(field.visibleWhen.key);
        const actual = control ? control.value : this._value?.[field.visibleWhen.key];
        return conditionMatches(actual, field.visibleWhen);
    }

    fieldLabel(field: DynamicFormField): string {
        return field.label || field.key;
    }

    fieldValue(field: DynamicFormField): any {
        void this.valueVersion;
        return this.form?.get(field.key)?.value ?? this.initialValue(field);
    }

    fieldChecked(field: DynamicFormField): boolean {
        return this.fieldValue(field) === true;
    }

    isRequired(field: DynamicFormField): boolean {
        return field.required === true
            || (field.rules || []).some(rule => {
                const type = typeof rule === 'string' ? rule : rule?.type;
                return type === 'required' || type === 'requiredTrue';
            });
    }

    canReset(field: DynamicFormField): boolean {
        return field.defaultValue !== undefined && !field.readonly && !field.disabled;
    }

    errorFor(field: DynamicFormField): string {
        // Read the snapshot unconditionally so the binding subscribes even while
        // the control is still valid (the first failing edit must repaint).
        const errors = this.validationErrors[field.key];
        const control = this.form?.get(field.key);
        if (!control || control.valid || !(control.dirty || control.touched || this.submitAttempted)) {
            return '';
        }
        const messages = { ...(this._schema?.messages || {}), ...(this.messages || {}) };
        return dynamicFormMessage(field, errors, this.ruleMessages[field.key], messages);
    }

    encodeValue(field: DynamicFormField): string {
        return encodeURIComponent(String(this.fieldValue(field) ?? ''));
    }

    suggestionData(field: DynamicFormField): string {
        return encodeURIComponent(JSON.stringify(field.suggestions || []));
    }

    htmlType(field: DynamicFormField): string {
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

    isTextInput(field: DynamicFormField): boolean {
        return [
            'text', 'password', 'email', 'url', 'tel', 'search',
            'date', 'time', 'datetime-local', 'month', 'week', 'color'
        ].includes(field.type);
    }

    isNumberInput(field: DynamicFormField): boolean {
        return field.type === 'number' || field.type === 'range';
    }

    isBooleanInput(field: DynamicFormField): boolean {
        return field.type === 'checkbox' || field.type === 'switch';
    }

    isOptionInput(field: DynamicFormField): boolean {
        return field.type === 'select' || field.type === 'radio';
    }

    isTextareaInput(field: DynamicFormField): boolean {
        return field.type === 'textarea' || field.type === 'json';
    }

    isCodeInput(field: DynamicFormField): boolean {
        return field.type === 'code';
    }

    // -----------------------------------------------------------------
    // Class helpers (keep skins configurable through `classPrefix`)
    // -----------------------------------------------------------------

    formClass(): string { return `${this.classPrefix}-form dynamic-form`; }
    schemaErrorClass(): string { return `${this.classPrefix}-schema-error`; }
    groupClass(): string { return `${this.classPrefix}-field-group`; }
    groupTitleClass(): string { return `${this.classPrefix}-field-group-title`; }
    noFieldsClass(): string { return `${this.classPrefix}-no-fields`; }
    fieldClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-field`, field.fieldClass || '' ].filter(Boolean).join(' ');
    }
    labelRowClass(): string { return `${this.classPrefix}-field-label-row`; }
    labelClass(): string { return `${this.classPrefix}-field-label`; }
    requiredClass(): string { return `${this.classPrefix}-field-required`; }
    resetClass(): string { return `${this.classPrefix}-field-reset`; }
    inputClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-input`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    textareaClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-textarea`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    codeClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-textarea`, `${this.classPrefix}-code-editor`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    checkboxRowClass(): string { return `${this.classPrefix}-checkbox-row`; }
    optionsClass(): string { return `${this.classPrefix}-options`; }
    optionClass(field: DynamicFormField, option: DynamicFormOption): string {
        return [
            `${this.classPrefix}-option`,
            this.sameOptionValue(option.value, this.fieldValue(field)) ? 'is-selected' : '',
            option.disabled || field.disabled || field.readonly ? 'is-disabled' : ''
        ].filter(Boolean).join(' ');
    }
    errorClass(): string { return `${this.classPrefix}-field-error`; }
    hintClass(): string { return `${this.classPrefix}-field-hint`; }
    actionsClass(): string { return `${this.classPrefix}-actions`; }
    buttonClass(primary: boolean): string {
        return [ `${this.classPrefix}-btn`, primary ? `${this.classPrefix}-btn-primary` : '' ].filter(Boolean).join(' ');
    }

    onDestroy(): void {
        this.destroyed = true;
    }
}
