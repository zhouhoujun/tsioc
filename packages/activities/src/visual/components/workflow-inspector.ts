import { Attribute, Component, NoReactive, OnDestroy, ViewChild } from '@tsdi/components';
import {
    DynamicFormChange,
    DynamicFormComponent,
    DynamicFormField,
    DynamicFormSchema,
    DynamicFormTypedSource,
} from '@tsdi/components/common/dynamic-form';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WORKFLOW_TYPED_CODEC } from '../workflow-typed-value';
import { WorkflowInspectorFieldView, WorkflowInspectorModel } from '../types';

const EMPTY_INSPECTOR: WorkflowInspectorModel = {
    hasSelection: false,
    nodeId: '',
    name: '',
    description: '',
    disabled: false,
    webhookUrl: '',
    icon: '',
    color: '',
    typeLabel: '',
    typeDescription: '',
    status: 'idle',
    statusLabel: '',
    statusDetail: '',
    durationLabel: '',
    fields: [],
    resultText: '',
    errorText: ''
};

function snapshotSignature(model: WorkflowInspectorModel): string {
    if (!model.hasSelection) {
        return 'empty';
    }
    return JSON.stringify([
        model.nodeId,
        model.name,
        model.description,
        model.disabled ? 1 : 0,
        model.webhookUrl,
        model.icon,
        model.color,
        model.typeLabel,
        model.status,
        model.statusLabel,
        model.statusDetail,
        model.durationLabel,
        model.resultText,
        model.errorText,
        model.fields.map(field => [
            field.key,
            field.type,
            field.typed ? 1 : 0,
            field.value ?? null,
            field.displayValue,
            field.checked ? 1 : 0,
            field.visible === false ? 0 : 1,
            field.group || '',
            field.placeholder || '',
            field.description || '',
            field.hasDefault ? 1 : 0,
            field.options.map(option => `${option.value}=${option.label}`).join('\u0001'),
            field.reference ? `${field.reference.kind}:${field.reference.missing ? 1 : 0}` : '',
            (field.actions || []).map(action => action.id).join(',')
        ])
    ]);
}

/**
 * Structural key for the derived form schema: which fields exist, what type
 * they are and whether they are visible. Values are excluded so typing reuses
 * the same schema object instead of rebuilding every control.
 */
function schemaKey(model: WorkflowInspectorModel): string {
    if (!model.hasSelection) {
        return 'empty';
    }
    return model.fields.map(field => [
        field.key,
        field.type,
        field.typed ? 1 : 0,
        field.visible === false ? 0 : 1,
        field.options.map(option => `${option.value}=${option.label}`).join(','),
        (field.actions || []).map(action => action.id).join(',')
    ].join(':')).join('|');
}

/**
 * Node inspector. The property surface is provided by the shared
 * `dynamic-form` component, so field rendering, conditional visibility,
 * validation and reset all come from the JSON-configurable form layer.
 */
@Component({
    selector: 'workflow-inspector',
    template: `
    <div class="workflow-inspector">
        <div class="workflow-inspector-title">{{titleLabel}}</div>
        <div class="workflow-inspector-empty" v-if="!model.hasSelection">{{emptyLabel}}</div>
        <div v-if="model.hasSelection">
            <div class="workflow-inspector-head">
                <span class="workflow-inspector-type">{{model.typeLabel}}</span>
                <span class="workflow-inspector-id" v-if="model.nodeId">{{model.nodeId}}</span>
                <span class="workflow-inspector-status" v-if="model.statusLabel">{{model.statusLabel}}</span>
                <span class="workflow-inspector-detail" v-if="model.statusDetail">{{model.statusDetail}}</span>
                <span class="workflow-inspector-duration" v-if="model.durationLabel">{{model.durationLabel}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-inspector-restore" v-if="model.fields.length" type="button"
                    @click="restoreDefaults">{{restoreLabel}}</button>
            </div>
            <div class="workflow-inspector-description" v-if="model.typeDescription">{{model.typeDescription}}</div>
            <div class="workflow-inspector-webhook" v-if="model.webhookUrl">
                <span class="workflow-inspector-webhook-label">{{webhookLabel}}</span>
                <code class="workflow-inspector-webhook-url">{{model.webhookUrl}}</code>
            </div>
            <dynamic-form #nodeForm classPrefix="workflow" :schema="formSchema" :value="formValue"
                :contextKey="model.nodeId" :messages="formMessages" :emptyLabel="noPropertiesLabel"
                :resetFieldLabel="resetFieldLabel" :changeAction="formChange" :blurAction="formBlur"
                :actionAction="formAction">
            </dynamic-form>
            <div class="workflow-no-fields" v-if="!model.fields.length">{{noPropertiesLabel}}</div>
            <div class="workflow-result" v-if="model.resultText">
                <div class="workflow-result-title">{{resultLabel}}</div>
                <pre class="workflow-result-pre">{{model.resultText}}</pre>
            </div>
            <div class="workflow-error" v-if="model.errorText">{{model.errorText}}</div>
        </div>
    </div>`
})
export class WorkflowInspectorComponent implements OnDestroy {
    @Attribute() locale = 'zh-CN';
    /**
     * Code edits are committed after this quiet period. Pushing every CodeMirror
     * keystroke into the designer would rebuild the full workflow snapshot and
     * re-render the canvas/inspector, which makes large code fields feel laggy.
     */
    @Attribute() codeChangeDelay = 160;
    /**
     * Text/JSON edits are committed after this quiet period. Each commit
     * re-binds every canvas node (style + layout, ~37ms at 66 nodes), so typing
     * a name should write the document once per burst, not per keystroke.
     * Blur, node switches, run/save and non-text fields still flush at once.
     */
    @Attribute() textChangeDelay = 300;
    @Attribute() changeAction?: (key: string, value: any, type: string, nodeId?: string) => void;
    /** Field-level actions (`field.actions`) forwarded from the inspector model. */
    @Attribute() actionAction?: (key: string, actionId: string, nodeId?: string) => void;
    @Attribute() restoreAction?: () => void;
    @Attribute() codeSuggestions: string[] = [];

    @ViewChild('nodeForm', DynamicFormComponent) nodeForm?: DynamicFormComponent;

    protected _model: WorkflowInspectorModel = EMPTY_INSPECTOR;
    protected modelSignature = '';
    protected destroyed = false;
    protected pendingChange?: { key: string; value: any; type: string; nodeId: string };
    protected pendingTimer?: any;

    /**
     * The form inputs are derived from the inspector model. They must keep a
     * stable identity across renders: building a fresh schema object made
     * `dynamic-form` re-normalize and re-sign its schema on every render after
     * a selection, which dominated the click latency.
     *
     * The key is structural (field shape, labels, options, constraints), not
     * the model instance: editing a value must not rebuild the controls.
     */
    @NoReactive() private formSchemaCache?: {
        key: string;
        locale: string;
        /** Joined hint list; the host rebuilds the array on every commit. */
        suggestions: string;
        schema: DynamicFormSchema;
    };
    @NoReactive() private formValueCache?: { model: WorkflowInspectorModel; value: Record<string, any> };
    @NoReactive() private formMessagesCache?: { locale: string; messages: Record<string, string> };

    constructor(@Optional() private translator?: Translator) { }

    @Attribute()
    get model(): WorkflowInspectorModel {
        return this._model;
    }
    set model(value: WorkflowInspectorModel) {
        const next = value || EMPTY_INSPECTOR;
        const signature = snapshotSignature(next);
        if (signature === this.modelSignature) {
            return;
        }
        // Commit a pending code edit before the inspector shows another node;
        // the delayed callback must never write to the newly selected node.
        if (this.pendingChange && this.pendingChange.nodeId !== next.nodeId) {
            this.flushPendingChange();
        }
        this.modelSignature = signature;
        this._model = next;
    }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.ui.${key}`,
            fallback
        );
    }

    get titleLabel(): string { return this.t('inspectorTitle', 'Node inspector'); }
    get emptyLabel(): string { return this.t('inspectorEmpty', 'Select a node on the canvas to edit its properties.'); }
    get nameLabel(): string { return this.t('name', 'Name'); }
    get descriptionLabel(): string { return this.t('description', 'Description'); }
    get appearanceLabel(): string { return this.t('appearance', 'Appearance'); }
    get iconLabel(): string { return this.t('icon', 'Icon'); }
    get colorLabel(): string { return this.t('color', 'Color'); }
    get enabledLabel(): string { return this.t('enabled', 'Enabled'); }
    get webhookLabel(): string { return this.t('webhookUrl', 'Webhook URL'); }
    get resultLabel(): string { return this.t('latestOutput', 'Latest output'); }
    get restoreLabel(): string { return this.t('restoreDefaults', 'Reset'); }
    get resetFieldLabel(): string { return this.t('resetField', 'Reset to default'); }
    get noPropertiesLabel(): string { return this.t('noProperties', 'This node has no editable properties.'); }
    get namePlaceholder(): string { return this.t('namePlaceholder', 'Node name'); }
    get descriptionPlaceholder(): string { return this.t('descriptionPlaceholder', 'Optional note for this node'); }
    get requiredMessage(): string { return this.t('requiredMessage', 'Required'); }
    get numberMessage(): string { return this.t('numberMessage', 'Number out of range'); }
    get patternMessage(): string { return this.t('patternMessage', 'Invalid format'); }
    get jsonMessage(): string { return this.t('jsonMessage', 'Invalid JSON'); }
    get emailMessage(): string { return this.t('invalidEmail', 'Invalid email address'); }
    get urlMessage(): string { return this.t('invalidUrl', 'Invalid URL'); }
    get integerMessage(): string { return this.t('integerMessage', 'Must be an integer'); }

    /** JSON schema handed to the shared dynamic form. */
    get formSchema(): DynamicFormSchema {
        const model = this._model;
        const cache = this.formSchemaCache;
        const key = schemaKey(model);
        const suggestions = (this.codeSuggestions || []).join('\u0000');
        if (cache && cache.key === key && cache.locale === this.locale && cache.suggestions === suggestions) {
            return cache.schema;
        }
        const schema = this.buildFormSchema();
        this.formSchemaCache = { key, locale: this.locale, suggestions, schema };
        return schema;
    }

    /**
     * Sources offered by typed value fields. `msg`/`flow`/`global`/`env` are
     * runtime identifiers; literal classes are translated.
     */
    protected get typedValueSources(): DynamicFormTypedSource[] {
        return [
            { value: 'literal', label: this.t('typedLiteral', 'Literal') },
            { value: 'num', label: this.t('typedNumber', 'Number') },
            { value: 'bool', label: this.t('typedBoolean', 'Boolean') },
            { value: 'json', label: this.t('typedJson', 'JSON') },
            { value: 're', label: this.t('typedRegex', 'Regex') },
            { value: 'msg', label: 'msg' },
            { value: 'flow', label: 'flow' },
            { value: 'global', label: 'global' },
            { value: 'env', label: 'env' }
        ];
    }

    private buildFormSchema(): DynamicFormSchema {
        const fields: DynamicFormField[] = [];
        if (!this._model.hasSelection) {
            return { fields };
        }
        const defaultGroupLabel = this.t('properties', 'Properties');
        fields.push({
            key: 'name',
            type: 'text',
            label: this.nameLabel,
            placeholder: this.namePlaceholder,
            required: true,
            inputClass: 'workflow-inspector-name'
        });
        fields.push({
            key: 'description',
            type: 'text',
            label: this.descriptionLabel,
            placeholder: this.descriptionPlaceholder,
            inputClass: 'workflow-inspector-description'
        });
        fields.push({
            key: 'enabled',
            type: 'checkbox',
            label: this.enabledLabel,
            defaultValue: true
        });
        fields.push({
            key: 'icon',
            type: 'text',
            label: this.iconLabel,
            group: this.appearanceLabel,
            maxLength: 4,
            defaultValue: '◆',
            placeholder: '◆',
            inputClass: 'workflow-inspector-icon'
        });
        fields.push({
            key: 'color',
            type: 'color',
            label: this.colorLabel,
            group: this.appearanceLabel,
            defaultValue: '#64748b',
            inputClass: 'workflow-inspector-color'
        });
        this._model.fields.forEach(field => {
            fields.push(this.toDynamicField(field));
        });
        return {
            fields,
            defaultGroupLabel,
            jsonFieldsLabel: this.t('fields', 'Fields'),
            jsonTextLabel: this.t('json', 'JSON'),
            // `msg`/`flow`/`global`/`env` are runtime identifiers; only the
            // literal source needs translating.
            typedSources: [
                { value: 'literal', label: this.t('typedLiteral', 'Literal') },
                { value: 'msg', label: 'msg' },
                { value: 'flow', label: 'flow' },
                { value: 'global', label: 'global' },
                { value: 'env', label: 'env' }
            ]
        };
    }

    protected toDynamicField(field: WorkflowInspectorFieldView): DynamicFormField {
        const typed = field.typed === true;
        return {
            key: field.key,
            type: this.dynamicType(field),
            typed,
            // Value fields store references and literal classes explicitly so
            // text that looks like a reference is never misread; path fields
            // keep the `msg.`-prefixed string form.
            typedCodec: typed && field.typedValue === true ? WORKFLOW_TYPED_CODEC : undefined,
            typedSources: typed && field.typedValue === true ? this.typedValueSources : undefined,
            label: field.label,
            placeholder: field.placeholder,
            description: field.description,
            group: field.group,
            options: field.options.map(option => ({ label: option.label, value: option.value })),
            defaultValue: field.hasDefault ? field.resetValue : undefined,
            rows: field.rows,
            min: field.min,
            max: field.max,
            step: field.step,
            unit: field.unit,
            span: field.span,
            minLength: field.minLength,
            maxLength: field.maxLength,
            required: field.required,
            readonly: field.readonly,
            disabled: field.disabled,
            pattern: field.pattern,
            rules: field.rules,
            errorMessages: field.errorMessages,
            itemFields: field.itemFields?.map(child => this.toDynamicField(child)),
            addLabel: field.addLabel,
            removeLabel: field.removeLabel,
            minItems: field.minItems,
            maxItems: field.maxItems,
            visibleWhen: field.visibleWhen,
            inputClass: field.inputClass,
            fieldClass: field.fieldClass,
            language: field.language,
            suggestions: this.codeSuggestions,
            actions: field.actions,
            hidden: field.visible === false
        };
    }

    get formValue(): Record<string, any> {
        const model = this._model;
        const cache = this.formValueCache;
        if (cache && cache.model === model) {
            return cache.value;
        }
        const value = this.buildFormValue();
        this.formValueCache = { model, value };
        return value;
    }

    private buildFormValue(): Record<string, any> {
        const value: Record<string, any> = {
            name: this._model.name,
            description: this._model.description,
            enabled: !this._model.disabled,
            icon: this._model.icon,
            color: this._model.color
        };
        this._model.fields.forEach(field => {
            value[field.key] = field.type === 'boolean'
                ? field.checked
                : field.type === 'select'
                    ? field.value
                    : field.type === 'json'
                        ? field.value
                        : field.typed
                            // Typed fields seed the control with the stored form
                            // so the source selector keeps its type.
                            ? field.value
                            : field.displayValue;
        });
        return value;
    }

    get formMessages(): Record<string, string> {
        const cache = this.formMessagesCache;
        if (cache && cache.locale === this.locale) {
            return cache.messages;
        }
        const messages: Record<string, string> = {
            required: this.requiredMessage,
            requiredTrue: this.requiredMessage,
            min: this.numberMessage,
            max: this.numberMessage,
            minlength: this.numberMessage,
            maxlength: this.numberMessage,
            pattern: this.patternMessage,
            json: this.jsonMessage,
            email: this.emailMessage,
            url: this.urlMessage,
            number: this.numberMessage,
            integer: this.integerMessage
        };
        this.formMessagesCache = { locale: this.locale, messages };
        return messages;
    }

    readonly formChange = (change: DynamicFormChange): void => {
                if (!change.valid) {
            this.flushPendingChange();
            return;
        }
        const type = this.changeType(change.field);
        if (type === 'code' || type === 'text' || type === 'json') {
            this.queueChange(change.key, change.value, type);
            return;
        }
        // Discrete edits (select/checkbox/color/number) apply immediately; they
        // also close the text burst so ordering stays intuitive (e.g. edit a
        // name, then immediately toggle the node).
        this.flushPendingChange();
        this.changeAction?.(change.key, change.value, type, this._model.nodeId);
    };

    readonly formAction = (field: DynamicFormField, actionId: string): void => {
        // Reference actions open dialogs; never leave a half-typed value behind.
        this.flushPendingChange();
        this.actionAction?.(field.key, actionId, this._model.nodeId);
    };

    readonly formBlur = (): void => {
        this.flushPendingChange();
    };

    restoreDefaults(): void {
        this.flushPendingChange();
        this.nodeForm?.reset(false);
        this.restoreAction?.();
    }

    protected dynamicType(field: WorkflowInspectorFieldView): DynamicFormField['type'] {
        // Most node field types are already shared dynamic-form types; only
        // the boolean alias needs mapping. Choice fields render as a native
        // `<select>` instead of a radio group.
        if (field.type === 'boolean') {
            return 'checkbox';
        }
        return field.type as DynamicFormField['type'];
    }

    protected changeType(field: DynamicFormField): string {
        switch (field.type) {
            case 'checkbox':
            case 'switch':
                return 'boolean';
            case 'radio':
            case 'select':
                return 'select';
            case 'number':
            case 'range':
                return 'number';
            case 'json':
                return 'json';
            case 'list':
                return 'list';
            case 'code':
                return 'code';
            case 'color':
                // Color pickers emit a value, not a typing burst.
                return 'color';
            default:
                return 'text';
        }
    }

    protected queueChange(key: string, value: any, type: string): void {
        if (this.pendingChange && this.pendingChange.key !== key) {
            this.flushPendingChange();
        }
        this.pendingChange = {
            key,
            value,
            type,
            nodeId: this._model?.nodeId || ''
        };
        if (this.pendingTimer !== undefined) {
            clearTimeout(this.pendingTimer);
        }
        const delay = Math.max(0, Number(
            type === 'code' ? this.codeChangeDelay : this.textChangeDelay
        ) || 0);
        this.pendingTimer = setTimeout(() => this.flushPendingChange(), delay);
    }

    protected flushPendingChange(): void {
        if (this.pendingTimer !== undefined) {
            clearTimeout(this.pendingTimer);
            this.pendingTimer = undefined;
        }
        const pending = this.pendingChange;
        this.pendingChange = undefined;
        if (!pending) {
            return;
        }
        this.changeAction?.(pending.key, pending.value, pending.type, pending.nodeId);
    }

    onDestroy(): void {
        this.flushPendingChange();
        this.destroyed = true;
    }
}
