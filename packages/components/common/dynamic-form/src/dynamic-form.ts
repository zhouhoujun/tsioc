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
                <div [class]="groupFieldsClass()">
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="labelRowClass()" v-if="field.type !== 'hidden'">
                        <label [class]="labelClass()">{{fieldLabel(field)}}<span [class]="requiredClass()" v-if="isRequired(field)">*</span></label>
                        <span class="df-field-actions">
                        <button [class]="jsonModeClass()" v-if="field.type === 'json'" type="button"
                            @click="toggleJsonMode(field)">{{isJsonRaw(field) ? (schema.jsonFieldsLabel || 'Fields') : (schema.jsonTextLabel || 'JSON')}}</button>
                        <button [class]="resetClass()" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">↺</button>
                        </span>
                    </div>
                    <div [class]="inputWrapClass(field)" v-if="isTextInput(field) || isNumberInput(field)">
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
                        <span [class]="inputUnitClass()" v-if="field.unit">{{field.unit}}</span>
                    </div>
                    <label v-if="isBooleanInput(field)" [class]="checkboxRowClass()">
                        <input type="checkbox" [checked]="fieldChecked(field)"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeBoolean(field, $event)" />
                        <span v-if="field.description">{{field.description}}</span>
                    </label>
                    <select v-if="isSelectInput(field)" [class]="selectClass(field)"
                        [value]="fieldValue(field)"
                        [disabled]="field.disabled || field.readonly"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @change="changeSelect(field, $event)">
                        <option v-for="option in field.options" [value]="option.value"
                            [selected]="sameOptionValue(option.value, fieldValue(field))"
                            [disabled]="option.disabled">{{option.label}}</option>
                    </select>
                    <div v-if="isRadioInput(field)" [class]="optionsClass()" role="radiogroup"
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
                    <textarea v-if="isJsonTextArea(field)" [class]="textareaClass(field)"
                        data-dynamic-code="json"
                        [value]="jsonTextValue(field)" [rows]="field.rows || 4"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isJsonObjectEditor(field)" [class]="keyValueClass()">
                        <div [class]="keyValueRowClass()" v-for="(entry, index) in jsonEntries(field)">
                            <input [class]="keyValueKeyClass()" type="text" [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeJsonEntryKey(field, index, $event)" />
                            <input [class]="keyValueValueClass()" type="text" [value]="entry.display"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeJsonEntryValue(field, index, $event)" />
                            <button [class]="listRemoveClass()" type="button" @click="removeJsonEntry(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addJsonEntry(field)">{{field.addLabel || '+ Add'}}</button>
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
                    <div v-if="isListInput(field)" [class]="listClass()">
                        <div [class]="listRowClass()" v-for="(item, index) in listItems(field)">
                            <div [class]="listFieldsClass()">
                                <div v-for="child in field.itemFields" v-if="isListItemVisible(child, item)">
                                    <div [class]="listItemFieldClass(child)" data-field-key="{{child.key}}">
                                        <label [class]="labelClass()">{{fieldLabel(child)}}<span [class]="requiredClass()" v-if="isRequired(child)">*</span></label>
                                        <input v-if="isTextInput(child) || isNumberInput(child)" [class]="inputClass(child)"
                                            type="{{htmlType(child)}}"
                                            [value]="listItemValue(item, child)"
                                            [placeholder]="child.placeholder || ''"
                                            [min]="child.min" [max]="child.max" [step]="child.step"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)" />
                                        <textarea v-if="isTextareaInput(child) || isJsonInput(child)" [class]="textareaClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [rows]="child.rows || (isJsonInput(child) ? 3 : 2)"
                                            [placeholder]="child.placeholder || ''"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)"></textarea>
                                        <label v-if="isBooleanInput(child)" [class]="checkboxRowClass()">
                                            <input type="checkbox" [checked]="listItemChecked(item, child)"
                                                @change="changeListItem(field, listIndex(field, item), child, $event)" />
                                        </label>
                                        <select v-if="isSelectInput(child)" [class]="selectClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [disabled]="child.disabled || child.readonly"
                                            @change="changeListItemSelect(field, listIndex(field, item), child, $event)">
                                            <option v-for="option in child.options" [value]="option.value"
                                                [selected]="sameOptionValue(option.value, listItemValue(item, child))"
                                                [disabled]="option.disabled">{{option.label}}</option>
                                        </select>
                                        <div v-if="isRadioInput(child)" [class]="optionsClass()">
                                            <label v-for="option in child.options" data-option-value="{{option.value}}"
                                                [class]="optionClass(child, listItemValue(item, child))">
                                                <input type="radio" name="{{formId}}-{{field.key}}-{{index}}-{{child.key}}"
                                                    [value]="option.value"
                                                    [checked]="sameOptionValue(option.value, listItemValue(item, child))"
                                                    @change="changeListItemOption(field, listIndex(field, item), child, option.value)" />
                                                <span>{{option.label}}</span>
                                            </label>
                                        </div>
                                        <div [class]="errorClass()" v-if="listItemError(child, item)">{{listItemError(child, item)}}</div>
                                    </div>
                                </div>
                            </div>
                            <button [class]="listRemoveClass()" type="button" @click="removeListItem(field, listIndex(field, item))">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addListItem(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <div v-if="isKeyValueInput(field)" [class]="keyValueClass()">
                        <div [class]="keyValueRowClass()" v-for="(entry, index) in keyValueEntries(field)">
                            <input [class]="keyValueKeyClass()" type="text"
                                [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeKeyValueKey(field, index, $event)" />
                            <label v-if="keyValueValueType(field) === 'boolean'" [class]="checkboxRowClass()">
                                <input type="checkbox" [checked]="entry.value === true"
                                    @change="changeKeyValueValue(field, index, $event)" />
                            </label>
                            <input v-else [class]="keyValueValueClass()"
                                type="{{keyValueValueType(field) === 'number' ? 'number' : 'text'}}"
                                [value]="entry.value"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeKeyValueValue(field, index, $event)" />
                            <button [class]="listRemoveClass()" type="button" @click="removeKeyValue(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addKeyValue(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="errorClass()" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="hintClass()" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
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
    protected _rawSchema?: any;
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
    protected visibleGroupsCache?: { schema: DynamicFormSchema; version: number; groups: Array<{ label: string; fields: DynamicFormField[] }> };
    protected readonly formId = `dynamic-form-${++dynamicFormSequence}`;
    protected jsonRawFields: Record<string, boolean> = {};

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

    get formValid(): boolean {
        return !!this.form?.valid;
    }

    get isDirty(): boolean {
        return !!this.form?.dirty;
    }

    /** Visible fields grouped under their section headers. */
    get visibleGroups(): Array<{ label: string; fields: DynamicFormField[] }> {
        // Read the tracked inputs on every call so bindings keep their
        // subscriptions even when the cache hits.
        const schema = this._schema;
        const version = this.valueVersion;
        const cache = this.visibleGroupsCache;
        if (cache && cache.schema === schema && cache.version === version) {
            return cache.groups;
        }
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
        this.visibleGroupsCache = { schema, version, groups };
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
        if (field.type === 'json') {
            return value;
        }
        return this.fieldDisplayValue(field, value);
    }

    /** Default value used by the per-field and whole-form reset actions. */
    protected resetValue(field: DynamicFormField): any {
        if (field.type === 'json') {
            return field.defaultValue;
        }
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

    isJsonRaw(field: DynamicFormField): boolean {
        return this.jsonRawFields[field.key] === true;
    }

    isJsonObjectValue(field: DynamicFormField): boolean {
        const value = this.fieldValue(field);
        return value === undefined || value === null || value === '' || (typeof value === 'object' && !Array.isArray(value));
    }

    isJsonObjectEditor(field: DynamicFormField): boolean {
        return field.type === 'json' && !this.isJsonRaw(field) && this.isJsonObjectValue(field);
    }

    isJsonTextArea(field: DynamicFormField): boolean {
        return field.type === 'json' && (!this.isJsonObjectEditor(field));
    }

    jsonTextValue(field: DynamicFormField): string {
        const value = this.fieldValue(field);
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value ?? {}, null, 2);
        } catch {
            return '';
        }
    }

    toggleJsonMode(field: DynamicFormField): void {
        if (this.isJsonRaw(field)) {
            const next = { ...this.jsonRawFields };
            delete next[field.key];
            this.jsonRawFields = next;
            const value = this.fieldValue(field);
            if (typeof value === 'string' && value.trim()) {
                try {
                    this.updateValue(field, JSON.parse(value));
                } catch {
                    // Keep the raw string until it becomes valid JSON.
                }
            }
            return;
        }
        this.jsonRawFields = { ...this.jsonRawFields, [field.key]: true };
    }

    jsonEntries(field: DynamicFormField): Array<{ key: string; value: any; display: string }> {
        const value = this.fieldValue(field);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
        }
        return Object.entries(value).map(([key, item]) => ({
            key,
            value: item,
            display: typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '')
        }));
    }

    protected updateJsonObject(field: DynamicFormField, entries: Array<{ key: string; value: any }>): void {
        const value: Record<string, any> = {};
        for (const entry of entries) {
            value[entry.key] = entry.value;
        }
        this._value = { ...(this._value || {}), [field.key]: value };
        this.valueSignature = JSON.stringify(this._value);
        this.updateValue(field, value);
    }

    addJsonEntry(field: DynamicFormField): void {
        const entries = this.jsonEntries(field).map(entry => ({ key: entry.key, value: entry.value }));
        const used = new Set(entries.map(entry => entry.key));
        let index = entries.length + 1;
        while (used.has(`field${index}`)) {
            index += 1;
        }
        entries.push({ key: `field${index}`, value: '' });
        this.updateJsonObject(field, entries);
    }

    removeJsonEntry(field: DynamicFormField, index: number): void {
        const entries = this.jsonEntries(field).map(entry => ({ key: entry.key, value: entry.value }));
        entries.splice(index, 1);
        this.updateJsonObject(field, entries);
    }

    changeJsonEntryKey(field: DynamicFormField, index: number, event: any): void {
        const entries = this.jsonEntries(field).map(entry => ({ key: entry.key, value: entry.value }));
        entries[index] = { ...entries[index], key: String(event?.target?.value ?? '') };
        this.updateJsonObject(field, entries);
    }

    changeJsonEntryValue(field: DynamicFormField, index: number, event: any): void {
        const entries = this.jsonEntries(field).map(entry => ({ key: entry.key, value: entry.value }));
        const raw = String(event?.target?.value ?? '');
        let value: any = raw;
        if (raw !== '') {
            try {
                value = JSON.parse(raw);
            } catch {
                value = raw;
            }
        } else {
            value = '';
        }
        entries[index] = { ...entries[index], value };
        this.updateJsonObject(field, entries);
    }

    jsonModeClass(): string { return `${this.classPrefix}-field-mode`; }

    isKeyValueInput(field: DynamicFormField): boolean {
        return field.type === 'keyvalue';
    }

    keyValueValueType(field: DynamicFormField): 'text' | 'number' | 'boolean' {
        return field.valueType === 'number' || field.valueType === 'boolean' ? field.valueType : 'text';
    }

    keyValueEntries(field: DynamicFormField): Array<{ key: string; value: any }> {
        const value = this.fieldValue(field);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
        }
        return Object.entries(value).map(([key, item]) => ({ key, value: item }));
    }

    protected updateKeyValue(field: DynamicFormField, entries: Array<{ key: string; value: any }>): void {
        const value: Record<string, any> = {};
        for (const entry of entries) {
            value[entry.key] = entry.value;
        }
        this._value = { ...(this._value || {}), [field.key]: value };
        this.valueSignature = JSON.stringify(this._value);
        this.updateValue(field, value);
    }

    addKeyValue(field: DynamicFormField): void {
        const entries = this.keyValueEntries(field);
        const used = new Set(entries.map(entry => entry.key));
        let index = entries.length + 1;
        while (used.has(`field${index}`)) {
            index += 1;
        }
        const valueType = this.keyValueValueType(field);
        entries.push({
            key: `field${index}`,
            value: valueType === 'number' ? 0 : valueType === 'boolean' ? false : ''
        });
        this.updateKeyValue(field, entries);
    }

    removeKeyValue(field: DynamicFormField, index: number): void {
        const entries = this.keyValueEntries(field);
        entries.splice(index, 1);
        this.updateKeyValue(field, entries);
    }

    changeKeyValueKey(field: DynamicFormField, index: number, event: any): void {
        const entries = this.keyValueEntries(field);
        entries[index] = { ...entries[index], key: String(event?.target?.value ?? '') };
        this.updateKeyValue(field, entries);
    }

    changeKeyValueValue(field: DynamicFormField, index: number, event: any): void {
        const entries = this.keyValueEntries(field);
        const type = this.keyValueValueType(field);
        const raw = type === 'boolean' ? !!event?.target?.checked : event?.target?.value;
        const value = type === 'number'
            ? (raw === '' ? 0 : Number(raw))
            : type === 'boolean' ? !!raw : raw;
        entries[index] = { ...entries[index], value };
        this.updateKeyValue(field, entries);
    }

    keyValueClass(): string { return `${this.classPrefix}-keyvalue`; }
    keyValueRowClass(): string { return `${this.classPrefix}-keyvalue-row`; }
    keyValueKeyClass(): string { return `${this.classPrefix}-input ${this.classPrefix}-keyvalue-key`; }
    keyValueValueClass(): string { return `${this.classPrefix}-input ${this.classPrefix}-keyvalue-value`; }

    isJsonInput(field: DynamicFormField): boolean {
        return field.type === 'json';
    }

    isListInput(field: DynamicFormField): boolean {
        return field.type === 'list';
    }

    listIndex(field: DynamicFormField, item: any): number {
        const index = this.listItems(field).indexOf(item);
        return index < 0 ? 0 : index;
    }

    listItems(field: DynamicFormField): any[] {
        const value = this.fieldValue(field);
        return Array.isArray(value) ? value : [];
    }

    listItemValue(item: any, child: DynamicFormField): any {
        const value = item?.[child.key];
        return this.fieldDisplayValue(child, value === undefined ? child.defaultValue : value);
    }

    listItemChecked(item: any, child: DynamicFormField): boolean {
        return item?.[child.key] === true;
    }

    isListItemVisible(child: DynamicFormField, item: any): boolean {
        const condition = child.visibleWhen;
        if (!condition) {
            return true;
        }
        const value = item?.[condition.key];
        if (condition.equals !== undefined) return String(value) === String(condition.equals);
        if (condition.notEquals !== undefined) return String(value) !== String(condition.notEquals);
        if (condition.in) return condition.in.map(entry => String(entry)).includes(String(value));
        if (condition.truthy !== undefined) return condition.truthy ? !!value : !value;
        if (condition.falsy !== undefined) return condition.falsy ? !value : !!value;
        return true;
    }

    listItemError(child: DynamicFormField, item: any): string {
        const value = this.listItemValue(item, child);
        const empty = value === undefined || value === null || value === '';
        if (child.required && empty) {
            return this.messages?.required || child.errorMessages?.required || 'Required';
        }
        return '';
    }

    protected updateList(field: DynamicFormField, items: any[]): void {
                const list = [...items];
        const key = field.key;
        this._value = { ...(this._value || {}), [key]: list };
        this.valueSignature = JSON.stringify(this._value);
        this.updateValue(field, list);
    }

    addListItem(field: DynamicFormField): void {
        const items = this.listItems(field).map(item => ({ ...item }));
        const next: Record<string, any> = {};
        (field.itemFields || []).forEach(child => {
            next[child.key] = child.defaultValue !== undefined ? child.defaultValue : (child.type === 'checkbox' || child.type === 'switch' ? false : '');
        });
        items.push(next);
        this.updateList(field, items);
    }

    removeListItem(field: DynamicFormField, index: number): void {
        const items = this.listItems(field).map(item => ({ ...item }));
        items.splice(index, 1);
        this.updateList(field, items);
    }

    changeListItem(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void {
                const items = this.listItems(field).map(item => ({ ...item }));
        const raw = child.type === 'checkbox' || child.type === 'switch'
            ? !!event?.target?.checked
            : event?.target?.value;
        items[index] = { ...(items[index] || {}), [child.key]: this.coerceValue(child, raw) };
        this.updateList(field, items);
    }

    changeListItemOption(field: DynamicFormField, index: number, child: DynamicFormField, value: any): void {
        const items = this.listItems(field).map(item => ({ ...item }));
        items[index] = { ...(items[index] || {}), [child.key]: value };
        this.updateList(field, items);
    }

    changeListItemSelect(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void {
        this.changeListItemOption(field, index, child, this.optionValue(child, event?.target?.value));
    }

    listClass(): string { return `${this.classPrefix}-list`; }
    listRowClass(): string { return `${this.classPrefix}-list-row`; }
    listFieldsClass(): string { return `${this.classPrefix}-list-fields`; }
    listItemFieldClass(_child: DynamicFormField): string { return `${this.classPrefix}-list-field`; }
    listAddClass(): string { return `${this.classPrefix}-list-add`; }
    listRemoveClass(): string { return `${this.classPrefix}-list-remove`; }

    changeText(field: DynamicFormField, event: any): void {
        this.updateValue(field, event?.target?.value);
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
        this.updateValue(field, this.optionValue(field, event?.target?.value));
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

    isSelectInput(field: DynamicFormField): boolean {
        return field.type === 'select';
    }

    isRadioInput(field: DynamicFormField): boolean {
        return field.type === 'radio';
    }

    /** @deprecated use `isSelectInput`/`isRadioInput`; kept for host templates. */
    isOptionInput(field: DynamicFormField): boolean {
        return this.isSelectInput(field) || this.isRadioInput(field);
    }

    isTextareaInput(field: DynamicFormField): boolean {
        return field.type === 'textarea';
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
    groupFieldsClass(): string { return `${this.classPrefix}-fields`; }
    groupTitleClass(): string { return `${this.classPrefix}-field-group-title`; }
    noFieldsClass(): string { return `${this.classPrefix}-no-fields`; }
    fieldClass(field: DynamicFormField): string {
        const span = field.span || 'full';
        return [
            `${this.classPrefix}-field`,
            span === 'half' ? 'is-half' : 'is-full',
            field.fieldClass || ''
        ].filter(Boolean).join(' ');
    }
    labelRowClass(): string { return `${this.classPrefix}-field-label-row`; }
    labelClass(): string { return `${this.classPrefix}-field-label`; }
    requiredClass(): string { return `${this.classPrefix}-field-required`; }
    resetClass(): string { return `${this.classPrefix}-field-reset`; }
    inputClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-input`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    selectClass(field: DynamicFormField): string {
        return [ `${this.classPrefix}-select`, field.inputClass || '' ].filter(Boolean).join(' ');
    }
    inputWrapClass(field: DynamicFormField): string {
        return `${this.classPrefix}-input-wrap${field.unit ? ' has-unit' : ''}`;
    }
    inputUnitClass(): string { return `${this.classPrefix}-input-unit`; }
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
