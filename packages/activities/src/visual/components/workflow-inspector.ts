import { Attribute, Component, OnDestroy, ViewChild } from '@tsdi/components';
import { DynamicFormChange, DynamicFormComponent, DynamicFormField, DynamicFormSchema } from '@tsdi/components/common';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowInspectorFieldView, WorkflowInspectorModel } from '../types';

const EMPTY_INSPECTOR: WorkflowInspectorModel = {
    hasSelection: false,
    nodeId: '',
    name: '',
    description: '',
    typeLabel: '',
    status: 'idle',
    statusLabel: '',
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
        model.typeLabel,
        model.status,
        model.statusLabel,
        model.durationLabel,
        model.resultText,
        model.errorText,
        model.fields.map(field => [
            field.key,
            field.type,
            field.value ?? null,
            field.displayValue,
            field.checked ? 1 : 0,
            field.visible === false ? 0 : 1,
            field.group || '',
            field.placeholder || '',
            field.description || '',
            field.hasDefault ? 1 : 0
        ])
    ]);
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
                <span class="workflow-inspector-duration" v-if="model.durationLabel">{{model.durationLabel}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-inspector-restore" v-if="model.fields.length" type="button"
                    @click="restoreDefaults">{{restoreLabel}}</button>
            </div>
            <dynamic-form #nodeForm classPrefix="workflow" :schema="formSchema" :value="formValue"
                :contextKey="model.nodeId" :messages="formMessages" :emptyLabel="noPropertiesLabel"
                :resetFieldLabel="resetFieldLabel" :changeAction="formChange" :blurAction="formBlur">
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
    @Attribute() changeAction?: (key: string, value: any, type: string, nodeId?: string) => void;
    @Attribute() restoreAction?: () => void;
    @Attribute() codeSuggestions: string[] = [];

    @ViewChild('nodeForm', DynamicFormComponent) nodeForm?: DynamicFormComponent;

    protected _model: WorkflowInspectorModel = EMPTY_INSPECTOR;
    protected modelSignature = '';
    protected destroyed = false;
    protected pendingChange?: { key: string; value: any; type: string; nodeId: string };
    protected pendingTimer?: any;

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
    get resultLabel(): string { return this.t('latestOutput', 'Latest output'); }
    get restoreLabel(): string { return this.t('restoreDefaults', 'Reset'); }
    get resetFieldLabel(): string { return this.t('resetField', 'Reset to default'); }
    get noPropertiesLabel(): string { return this.t('noProperties', 'This node has no editable properties.'); }
    get namePlaceholder(): string { return this.t('namePlaceholder', 'Node name'); }
    get descriptionPlaceholder(): string { return this.t('descriptionPlaceholder', 'Optional note for this node'); }
    get requiredMessage(): string { return this.t('requiredMessage', this.isZh ? '必填项' : 'Required'); }
    get numberMessage(): string { return this.t('numberMessage', this.isZh ? '数值超出范围' : 'Number out of range'); }
    get patternMessage(): string { return this.t('patternMessage', this.isZh ? '格式不正确' : 'Invalid format'); }
    get jsonMessage(): string { return this.t('jsonMessage', this.isZh ? 'JSON 格式不正确' : 'Invalid JSON'); }
    get emailMessage(): string { return this.t('invalidEmail', this.isZh ? '邮箱格式不正确' : 'Invalid email address'); }
    get urlMessage(): string { return this.t('invalidUrl', this.isZh ? 'URL 格式不正确' : 'Invalid URL'); }
    get integerMessage(): string { return this.t('integerMessage', this.isZh ? '请输入整数' : 'Must be an integer'); }

    /** JSON schema handed to the shared dynamic form. */
    get formSchema(): DynamicFormSchema {
        const fields: DynamicFormField[] = [];
        if (!this._model.hasSelection) {
            return { fields };
        }
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
        this._model.fields.forEach(field => {
            fields.push({
                key: field.key,
                type: this.dynamicType(field),
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
                required: field.required,
                readonly: field.readonly,
                pattern: field.pattern,
                language: field.language,
                suggestions: this.codeSuggestions,
                hidden: field.visible === false
            });
        });
        return { fields };
    }

    get formValue(): Record<string, any> {
        const value: Record<string, any> = {
            name: this._model.name,
            description: this._model.description
        };
        this._model.fields.forEach(field => {
            value[field.key] = field.type === 'boolean'
                ? field.checked
                : field.type === 'select'
                    ? field.value
                    : field.displayValue;
        });
        return value;
    }

    get formMessages(): Record<string, string> {
        return {
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
    }

    readonly formChange = (change: DynamicFormChange): void => {
        if (!change.valid) {
            this.flushPendingChange();
            return;
        }
        const type = this.changeType(change.field);
        if (type === 'code') {
            this.queueChange(change.key, change.value, type);
            return;
        }
        // Any non-code edit also closes the code edit burst so ordering stays
        // intuitive (e.g. edit code, then immediately rename the node).
        this.flushPendingChange();
        this.changeAction?.(change.key, change.value, type, this._model.nodeId);
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
        switch (field.type) {
            case 'code':
                return 'code';
            case 'json':
                return 'json';
            case 'textarea':
                return 'textarea';
            case 'boolean':
                return 'checkbox';
            case 'select':
                return 'radio';
            case 'number':
                return 'number';
            default:
                return 'text';
        }
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
            case 'code':
                return 'code';
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
        const delay = Math.max(0, Number(this.codeChangeDelay) || 0);
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
