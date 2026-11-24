import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import {
    DynamicFormChange,
    DynamicFormField,
    validateDynamicFormValues
} from '@tsdi/components/common/dynamic-form';
import { Translator } from '@tsdi/i18n';
import { NodePosition, WorkflowConfigField } from '../types';
import { WorkflowNodeRegistry } from '../node-registry';
import { WorkflowDesigner } from '../workflow-designer';
import { translateWorkflow } from '../i18n';
import { configNodeOptions, configNodeTypeForResource } from '../workflow-config-nodes';

/**
 * Create/edit dialog for shared configuration nodes (MQTT brokers, TLS
 * profiles, plugin resources) plus the confirmation shown before deleting a
 * config node that other nodes still reference.
 *
 * Kept as its own component so the designer preview stays a composition root:
 * the dialog owns its transient state and reuses the shared dynamic form for
 * the config-node schema.
 */
@Component({
    selector: 'workflow-config-dialog',
    template: `
    <div class="workflow-config-dialog-host" v-show="showConfigDialog || showDeleteConfirm">
    <div class="workflow-publish workflow-config-dialog" v-if="showConfigDialog">
        <div class="workflow-publish-panel workflow-config-dialog-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{dialogTitle}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-config-dialog-body">
                <label class="workflow-group-field">
                    <span>{{nameLabel}}</span>
                    <input class="workflow-config-name-input" type="text"
                        [value]="name" @input="nameInput" @keydown="dialogKey" />
                </label>
                <dynamic-form #configForm classPrefix="workflow" :schema="schema"
                    :value="values" :contextKey="configId"
                    :emptyLabel="emptyLabel" :changeAction="dialogChange">
                </dynamic-form>
                <div class="workflow-publish-error" v-if="error">{{error}}</div>
            </div>
            <div class="workflow-publish-actions">
                <button class="workflow-btn" type="button" @click="close">{{cancelLabel}}</button>
                <button class="workflow-btn workflow-btn-primary workflow-config-save" type="button"
                    @click="save">{{saveLabel}}</button>
            </div>
        </div>
    </div>
    <div class="workflow-publish workflow-delete-confirm" v-if="showDeleteConfirm">
        <div class="workflow-publish-panel workflow-delete-confirm-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{deleteConfirmTitle}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="cancelDelete">✕</button>
            </div>
            <div class="workflow-delete-confirm-body">
                <div class="workflow-delete-confirm-line" v-for="item in deleteConfirmRefs">
                    {{item.name}} · {{item.count}} {{deleteConfirmUsageLabel}}
                </div>
            </div>
            <div class="workflow-publish-actions">
                <button class="workflow-btn" type="button" @click="cancelDelete">{{cancelLabel}}</button>
                <button class="workflow-btn workflow-btn-primary workflow-delete-confirm-ok" type="button"
                    @click="confirmDelete">{{deleteLabel}}</button>
            </div>
        </div>
    </div>
    </div>
    `
})
export class WorkflowConfigDialogComponent {
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() registry!: WorkflowNodeRegistry;
    @Attribute() locale = 'zh-CN';
    /** Places a newly created config node; supplied by the canvas host. */
    @Attribute() positionAction?: () => NodePosition;
    /** Called after a create/delete so the host can autosave. */
    @Attribute() notifyAction?: () => void;

    showConfigDialog = false;
    showDeleteConfirm = false;
    configType = '';
    configId = '';
    name = '';
    values: Record<string, any> = {};
    error = '';
    deleteConfirmRefs: Array<{ id: string; name: string; count: number }> = [];
    protected bindTo?: { nodeId: string; key: string };
    protected schemaCache?: { definition: any; type: string; schema: { fields: DynamicFormField[] } };

    constructor(@Optional() private translator?: Translator) { }

    protected t(key: string, fallback: string): string {
        return translateWorkflow(this.translator, this.locale as any, `workflow.ui.${key}`, fallback);
    }

    get closeLabel(): string { return this.t('close', 'Close'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }
    get saveLabel(): string { return this.t('save', 'Save'); }
    get deleteLabel(): string { return this.t('delete', 'Delete'); }
    get emptyLabel(): string { return this.t('noFields', 'No fields'); }
    get nameLabel(): string { return this.t('configNodeName', 'Name'); }

    get dialogTitle(): string {
        const definition = this.configType ? this.registry?.get(this.configType) : undefined;
        const label = definition?.label || this.configType || '';
        return this.configId
            ? this.t('editConfigNode', 'Edit {name}').replace('{name}', label)
            : this.t('newConfigNode', 'New {name}').replace('{name}', label);
    }

    get deleteConfirmTitle(): string {
        return this.t('deleteReferencedTitle', 'Delete referenced configuration?');
    }

    get deleteConfirmUsageLabel(): string {
        return this.t('referencedByNodes', 'referencing nodes');
    }

    /** Schema of the config node's own fields, rebuilt only when it changes. */
    get schema(): { fields: DynamicFormField[] } {
        const definition = this.designer?.definition;
        const type = this.configType;
        const cache = this.schemaCache;
        if (cache && cache.definition === definition && cache.type === type) {
            return cache.schema;
        }
        const nodeDefinition = type ? this.registry.get(type) : undefined;
        const fields = (nodeDefinition?.fields || []).map(field => this.toFormField(field));
        const schema = { fields };
        this.schemaCache = { definition, type, schema };
        return schema;
    }

    /**
     * Reference fields inside a config node render as plain selects: a nested
     * create/edit dialog would stack, so the picker only offers existing
     * records.
     */
    protected toFormField(field: WorkflowConfigField): DynamicFormField {
        const options = field.reference
            ? [
                { label: this.t('none', '— none —'), value: '' },
                ...configNodeOptions(this.designer?.definition, this.registry, field.reference.resource || '')
                    .map(option => ({
                        label: option.description ? `${option.label} · ${option.description}` : option.label,
                        value: option.value
                    }))
            ]
            : field.options;
        return {
            ...field,
            type: (field.type === 'boolean' ? 'checkbox' : field.type) as DynamicFormField['type'],
            options,
            actions: undefined,
            itemFields: field.itemFields?.map(child => this.toFormField(child))
        } as DynamicFormField;
    }

    /** Inspector field action (`create` / `edit`) for a reference field. */
    handleAction(key: string, actionId: string, nodeId?: string): void {
        const node = nodeId
            ? this.designer.nodes.find(item => item.id === nodeId)
            : this.designer.selectedNode;
        if (!node) {
            return;
        }
        const field = (this.registry.get(node.type)?.fields || []).find(item => item.key === key);
        const spec = field?.reference;
        if (!spec) {
            return;
        }
        if (actionId === 'create') {
            const type = configNodeTypeForResource(this.registry, spec.resource || '');
            if (type) {
                this.open({ type, bindTo: { nodeId: node.id, key } });
            }
        } else if (actionId === 'edit') {
            const id = String(node.config?.[key] ?? '').split(',')[0].trim();
            if (id) {
                this.open({ id });
            }
        }
    }

    open(options: { type?: string; id?: string; bindTo?: { nodeId: string; key: string } }): void {
        const existing = options.id
            ? this.designer.nodes.find(node => node.id === options.id)
            : undefined;
        const type = existing?.type || options.type || '';
        const definition = type ? this.registry.get(type) : undefined;
        if (!definition) {
            return;
        }
        this.configType = type;
        this.configId = existing?.id || '';
        this.name = existing?.name || '';
        this.values = {
            ...(definition.defaultConfig || {}),
            ...(existing?.config || {})
        };
        this.bindTo = existing ? undefined : options.bindTo;
        this.error = '';
        this.schemaCache = undefined;
        this.showConfigDialog = true;
    }

    close(): void {
        this.showConfigDialog = false;
        this.error = '';
        this.bindTo = undefined;
    }

    nameInput(event: any): void {
        this.name = String(event?.target?.value ?? '');
        this.error = '';
    }

    dialogKey(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Enter') {
            event?.preventDefault?.();
            this.save();
        } else if (key === 'Escape') {
            event?.preventDefault?.();
            this.close();
        }
    }

    readonly dialogChange = (change: DynamicFormChange): void => {
        this.values = { ...this.values, [change.key]: change.value };
        this.error = '';
    };

    save(): void {
        if (!this.showConfigDialog || !this.configType) {
            return;
        }
        const result = validateDynamicFormValues(this.schema.fields, this.values);
        if (result.issues.length) {
            this.error = result.issues[0].message;
            return;
        }
        const name = this.name.trim();
        if (this.configId) {
            const node = this.designer.nodes.find(item => item.id === this.configId);
            if (!node) {
                this.close();
                return;
            }
            this.designer.updateNode(node.id, {
                ...(name ? { name } : {}),
                config: { ...(node.config || {}), ...this.values }
            });
        } else {
            const created = this.designer.createConfigNode(
                this.configType,
                this.positionAction ? this.positionAction() : { x: 80, y: 80 },
                { name: name || undefined, config: this.values, bindTo: this.bindTo }
            );
            if (!created) {
                this.error = this.designer.error || 'Unable to create configuration node';
                return;
            }
        }
        this.showConfigDialog = false;
        this.error = '';
        this.bindTo = undefined;
        this.notifyAction?.();
    }

    /**
     * Deleting a config node other nodes point at would only fail at run time.
     * Ask first and name the dependants; the delete itself stays unchanged.
     */
    requestDelete(nodeIds?: string[]): void {
        const ids = nodeIds && nodeIds.length ? nodeIds : this.designer.selectedNodeIds;
        const refs: Array<{ id: string; name: string; count: number }> = [];
        ids.forEach(id => {
            const node = this.designer.nodes.find(item => item.id === id);
            if (!node || this.registry.get(node.type)?.configNode !== true) {
                return;
            }
            const count = this.designer.nodeReferences(id).length;
            if (count) {
                refs.push({ id, name: node.name || id, count });
            }
        });
        if (!refs.length) {
            this.designer.deleteSelection();
            this.notifyAction?.();
            return;
        }
        this.deleteConfirmRefs = refs;
        this.showDeleteConfirm = true;
    }

    confirmDelete(): void {
        this.showDeleteConfirm = false;
        this.deleteConfirmRefs = [];
        this.designer.deleteSelection();
        this.notifyAction?.();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.deleteConfirmRefs = [];
    }
}
