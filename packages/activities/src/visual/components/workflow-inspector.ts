import { Attribute, Component, OnDestroy, noReact } from '@tsdi/components';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@tsdi/components/forms';
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

function jsonValidator(control: AbstractControl) {
    const value = control.value;
    if (value === undefined || value === null || String(value).trim() === '') {
        return null;
    }
    try {
        JSON.parse(String(value));
        return null;
    } catch {
        return { json: true };
    }
}

/** Keep form internals out of the component reactive proxy. */
function markFormRaw(form: FormGroup): FormGroup {
    try {
        (form as any)[noReact] = true;
        Object.values(form.controls).forEach(control => {
            (control as any)[noReact] = true;
        });
    } catch {
        // ignore
    }
    return form;
}

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
            field.checked ? 1 : 0
        ])
    ]);
}

/**
 * Renderer-neutral node inspector. Property editing is backed by
 * `@tsdi/components/forms` (`FormGroup` + validators), so invalid values never
 * reach the designer. Code fields can be enhanced by a host-provided code
 * editor directive (see `@tsdi/activities/web`).
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
                <span class="workflow-inspector-status" v-if="model.statusLabel">{{model.statusLabel}}</span>
                <span class="workflow-inspector-duration" v-if="model.durationLabel">{{model.durationLabel}}</span>
            </div>
            <div class="workflow-field">
                <label class="workflow-field-label">{{nameLabel}}</label>
                <input class="workflow-input workflow-inspector-name" [value]="valueFor('name', model.name)"
                    aria-invalid="{{errorFor('name') ? 'true' : 'false'}}"
                    @input="changeName($event)" />
                <div class="workflow-field-error" v-if="errorFor('name')">{{errorFor('name')}}</div>
            </div>
            <div class="workflow-field">
                <label class="workflow-field-label">{{descriptionLabel}}</label>
                <input class="workflow-input workflow-inspector-description" [value]="valueFor('description', model.description)"
                    @input="changeDescription($event)" />
            </div>
            <div class="workflow-field" v-for="field in model.fields">
                <label class="workflow-field-label">{{field.label}}</label>
                <input v-if="field.type === 'text'" class="workflow-input" [value]="fieldValue(field)"
                    aria-invalid="{{errorFor(field.key) ? 'true' : 'false'}}"
                    @input="changeField(field, $event)" />
                <input v-if="field.type === 'number'" class="workflow-input" type="number" [value]="fieldValue(field)" [min]="field.min" [max]="field.max"
                    aria-invalid="{{errorFor(field.key) ? 'true' : 'false'}}"
                    @input="changeField(field, $event)" />
                <label v-if="field.type === 'boolean'" class="workflow-checkbox-row">
                    <input type="checkbox" [checked]="fieldChecked(field)" @change="changeField(field, $event)" />
                    <span>{{field.description || field.label}}</span>
                </label>
                <select v-if="field.type === 'select'" class="workflow-select" [value]="fieldValue(field)" @change="changeField(field, $event)">
                    <option v-for="option in field.options" [value]="option.value" [selected]="option.value === fieldValue(field)">{{option.label}}</option>
                </select>
                <textarea v-if="field.type === 'textarea'" class="workflow-textarea" [value]="fieldValue(field)" @input="changeField(field, $event)" rows="3"></textarea>
                <textarea v-if="field.type === 'json'" class="workflow-textarea" [value]="fieldValue(field)"
                    aria-invalid="{{errorFor(field.key) ? 'true' : 'false'}}"
                    @input="changeField(field, $event)" rows="4"></textarea>
                <textarea v-if="field.type === 'code'" class="workflow-textarea workflow-code-editor"
                    workflow-code-editor="{{field.language || 'javascript'}}"
                    data-code-value="{{encodeCode(fieldValue(field))}}"
                    [value]="fieldValue(field)"
                    aria-invalid="{{errorFor(field.key) ? 'true' : 'false'}}"
                    @input="changeField(field, $event)"
                    @blur="flushField(field)" rows="8"></textarea>
                <div class="workflow-field-error" v-if="errorFor(field.key)">{{errorFor(field.key)}}</div>
                <div class="workflow-field-hint" v-if="field.description && field.type !== 'boolean'">{{field.description}}</div>
            </div>
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

    protected _model: WorkflowInspectorModel = EMPTY_INSPECTOR;
    protected form?: FormGroup;
    protected formSignature = '';
    protected modelSignature = '';
    protected validationErrors: Record<string, any> = {};
    protected destroyed = false;
    protected pendingChange?: { key: string; value: any; type: string; nodeId: string };
    protected pendingTimer?: any;

    constructor(
        @Optional() private forms?: FormBuilder,
        @Optional() private translator?: Translator
    ) {
        this.forms = forms || new FormBuilder();
    }

    @Attribute()
    get model(): WorkflowInspectorModel {
        return this._model;
    }
    set model(value: WorkflowInspectorModel) {
        const next = value || EMPTY_INSPECTOR;
        // Model snapshots are rebuilt on every parent render. Writing an equal
        // snapshot back into this component would re-trigger the render that
        // produced it (the writer and reader share a reactive effect), so only
        // accept a changed snapshot.
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
        // Building the form inside the attribute binding would re-enter the
        // parent render through shared reactive state; do it after the render.
        Promise.resolve().then(() => {
            if (!this.destroyed) {
                this.applyModel(next);
            }
        });
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
    get requiredMessage(): string { return this.isZh ? '必填项' : 'Required'; }
    get numberMessage(): string { return this.isZh ? '数值超出范围' : 'Number out of range'; }
    get patternMessage(): string { return this.isZh ? '格式不正确' : 'Invalid format'; }
    get jsonMessage(): string { return this.isZh ? 'JSON 格式不正确' : 'Invalid JSON'; }

    encodeCode(value: string | undefined): string {
        return encodeURIComponent(String(value ?? ''));
    }

    valueFor(key: string, fallback: any): any {
        const control = this.form?.get(key);
        if (!control) {
            return fallback;
        }
        return control.value === undefined || control.value === null ? '' : control.value;
    }

    fieldValue(field: WorkflowInspectorFieldView): any {
        return this.valueFor(field.key, field.displayValue);
    }

    fieldChecked(field: WorkflowInspectorFieldView): boolean {
        const control = this.form?.get(field.key);
        return control ? !!control.value : field.checked;
    }

    errorFor(key: string): string {
        const errors = this.validationErrors[key];
        if (!errors) {
            return '';
        }
        if (errors.required) return this.requiredMessage;
        if (errors.json) return this.jsonMessage;
        if (errors.pattern) return this.patternMessage;
        if (errors.min || errors.max || errors.minlength || errors.maxlength) {
            return this.numberMessage;
        }
        return '';
    }

    changeName(event: any): void {
        this.updateControl('name', event?.target?.value ?? '', 'text');
    }

    changeDescription(event: any): void {
        this.updateControl('description', event?.target?.value ?? '', 'text');
    }

    changeField(field: WorkflowInspectorFieldView, event: any): void {
        const target = event?.target;
        const value = field.type === 'boolean' ? !!target?.checked : target?.value;
        this.updateControl(field.key, value, field.type);
    }

    /** Immediately commit a pending code edit (blur, node switch, destroy). */
    flushField(_field?: WorkflowInspectorFieldView): void {
        this.flushPendingChange();
    }

    protected updateControl(key: string, value: any, type: string): void {
        const control = this.form?.get(key);
        if (control) {
            control.setValue(value);
            control.markAsDirty();
            control.markAsTouched();
            // Replace the snapshot so every field binding re-evaluates.
            this.validationErrors = { ...this.validationErrors, [key]: control.errors };
        }
        if (control && control.errors) {
            return;
        }
        if (type === 'code') {
            this.queueChange(key, value, type);
            return;
        }
        // Any non-code edit also closes the code edit burst so ordering stays
        // intuitive (e.g. edit code, then immediately rename the node).
        this.flushPendingChange();
        this.changeAction?.(key, value, type, this.model?.nodeId);
    }

    protected queueChange(key: string, value: any, type: string): void {
        if (this.pendingChange && this.pendingChange.key !== key) {
            this.flushPendingChange();
        }
        this.pendingChange = {
            key,
            value,
            type,
            nodeId: this.model?.nodeId || ''
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

    protected applyModel(model: WorkflowInspectorModel): void {
        if (!model.hasSelection) {
            this.form = undefined;
            this.formSignature = '';
            this.validationErrors = {};
            return;
        }
        const signature = [
            model.nodeId,
            ...model.fields.map(field => `${field.key}:${field.type}:${field.required ? 1 : 0}:${field.pattern || ''}`)
        ].join('|');
        if (this.form && this.formSignature === signature) {
            this.syncForm(model);
            this.refreshValidationErrors();
            return;
        }
        const configs: Record<string, any> = {
            name: [model.name, [Validators.required, Validators.minLength(1)]],
            description: [model.description, []]
        };
        model.fields.forEach(field => {
            const validators = [];
            if (field.required) {
                validators.push(Validators.required);
            }
            if (field.type === 'number') {
                if (field.min !== undefined) validators.push(Validators.min(field.min));
                if (field.max !== undefined) validators.push(Validators.max(field.max));
            }
            if (field.pattern) {
                validators.push(Validators.pattern(field.pattern));
            }
            if (field.type === 'json') {
                validators.push(jsonValidator);
            }
            configs[field.key] = [this.controlValue(field), validators];
        });
        this.form = markFormRaw((this.forms || new FormBuilder()).group(configs));
        this.formSignature = signature;
        this.refreshValidationErrors();
    }

    protected syncForm(model: WorkflowInspectorModel): void {
        // Dirty controls hold the user's in-progress edit. Pushing the persisted
        // model back into them would erase invalid input before the error shows.
        const sync = (key: string, value: any): void => {
            const control = this.form?.get(key);
            if (!control || control.dirty || control.value === value) {
                return;
            }
            control.setValue(value, { emitEvent: false });
        };
        sync('name', model.name);
        sync('description', model.description);
        model.fields.forEach(field => sync(field.key, this.controlValue(field)));
    }

    protected refreshValidationErrors(): void {
        this.validationErrors = {};
        if (!this.form) {
            return;
        }
        Object.keys(this.form.controls).forEach(key => {
            this.validationErrors[key] = this.form!.controls[key].errors;
        });
    }

    protected controlValue(field: WorkflowInspectorFieldView): any {
        if (field.type === 'boolean') {
            return field.checked;
        }
        if (field.type === 'select') {
            return field.value;
        }
        return field.displayValue;
    }

    onDestroy(): void {
        this.flushPendingChange();
        this.destroyed = true;
    }
}
