import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowNodeRegistry } from '../node-registry';
import { WorkflowDesigner } from '../workflow-designer';
import { configNodeInfos, WorkflowConfigNodeInfo } from '../workflow-config-nodes';

/** What the host should do with the selected config node. */
export type WorkflowConfigNodeAction = 'edit' | 'add' | 'reveal';

export interface WorkflowConfigNodeGroupView {
    /** Resource this group creates (`mqtt-broker`, `tls`, ...). */
    resource: string;
    /** Registered type behind the group's create button. */
    type: string;
    label: string;
    items: WorkflowConfigNodeInfo[];
}

/**
 * Configuration-node list.
 *
 * Config nodes stay on the canvas (they are real document nodes), but a broker
 * or TLS profile is only useful when you can find it, see how many nodes share
 * it and edit it without hunting for its box. This panel is that index: it
 * derives everything from the document through the shared
 * `workflow-config-nodes` helpers, so a save/delete/rename anywhere refreshes
 * the list through the reactive bindings.
 */
@Component({
    selector: 'workflow-config-nodes',
    template: `
    <div class="workflow-config-nodes-host" v-show="visible">
    <div class="workflow-publish workflow-config-nodes" v-if="visible">
        <div class="workflow-publish-panel workflow-config-nodes-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-config-node-group" v-for="group in groups" data-config-group="{{group.resource}}">
                <div class="workflow-config-node-group-head">
                    <span class="workflow-config-node-group-label">{{group.label}}</span>
                    <button class="workflow-btn workflow-config-node-add" type="button"
                        data-config-add="{{group.type}}" @click="add(group.type)">{{addLabel}}</button>
                </div>
                <div class="workflow-config-node-row" v-for="item in group.items" data-config-id="{{item.id}}">
                    <button class="workflow-config-node-main" type="button" @click="reveal(item.id)">
                        <span class="workflow-config-node-name">{{item.name}}</span>
                        <span class="workflow-config-node-summary" v-if="item.summary">{{item.summary}}</span>
                    </button>
                    <span [class]="usageClass(item)">{{usageLabel(item)}}</span>
                    <button class="workflow-btn workflow-config-node-edit" type="button"
                        data-config-edit="{{item.id}}" [title]="editLabel(item)"
                        [aria-label]="editLabel(item)" @click="edit(item.id)">✎</button>
                </div>
                <div class="workflow-config-node-empty" v-if="!group.items.length">{{emptyLabel}}</div>
            </div>
            <div class="workflow-publish-actions">
                <button class="workflow-btn" type="button" @click="close">{{closeLabel}}</button>
            </div>
        </div>
    </div>
    </div>`
})
export class WorkflowConfigNodesComponent {
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() registry!: WorkflowNodeRegistry;
    @Attribute() locale = 'zh-CN';
    /** Host callback; the panel never edits the document itself. */
    @Attribute() action?: (name: WorkflowConfigNodeAction, value: string) => void;

    visible = false;

    constructor(@Optional() private translator?: Translator) { }

    open(): void {
        this.visible = true;
    }

    close(): void {
        this.visible = false;
    }

    reveal(id: string): void {
        // The canvas is behind the overlay, so close before revealing.
        this.close();
        this.action?.('reveal', id);
    }

    edit(id: string): void {
        this.action?.('edit', id);
    }

    add(type: string): void {
        this.action?.('add', type);
    }

    /**
     * One group per registered config-node type, in registry order, so a
     * resource with no entries still offers its create button.
     */
    get groups(): WorkflowConfigNodeGroupView[] {
        const designer = this.designer;
        const registry = this.registry;
        if (!designer || !registry) {
            return [];
        }
        const infos = configNodeInfos(designer.definition, registry);
        return registry.list()
            .filter(definition => definition.configNode === true)
            .map(definition => ({
                resource: definition.resource || definition.type,
                type: definition.type,
                label: registry.nodeLabel(definition.type, this.locale as any, this.translator),
                items: infos.filter(info => info.type === definition.type)
            }));
    }

    usageLabel(item: WorkflowConfigNodeInfo): string {
        return item.used
            ? this.t('configNodeUsage', '{count} refs', { count: item.usedBy.length })
            : this.t('configNodeUnused', 'unused');
    }

    usageClass(item: WorkflowConfigNodeInfo): string {
        return `workflow-config-node-usage ${item.used ? 'is-used' : 'is-unused'}`;
    }

    get title(): string { return this.t('configNodes', 'Configuration nodes'); }
    get emptyLabel(): string { return this.t('configNodeEmpty', 'No entries yet.'); }
    get addLabel(): string { return this.t('configNodeAdd', 'New'); }
    get closeLabel(): string { return this.t('close', 'Close'); }

    editLabel(item: WorkflowConfigNodeInfo): string {
        return this.t('editConfigNode', 'Edit {name}', { name: item.name });
    }

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback,
            params
        );
    }
}
