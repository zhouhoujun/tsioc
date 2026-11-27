import {
    AfterViewInit,
    Attribute,
    Component,
    ComponentRef,
    OnDestroy,
    ViewChild,
    ViewContainerRef
} from '@tsdi/components';
import { Inject, Optional, Type } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import type { IVisualWorkflowNode } from '../types';
import {
    nodeEditorSections,
    WorkflowNodeEditorContext,
    WorkflowNodeEditorContribution,
    WorkflowNodeEditorSection
} from '../workflow-node-editors';

/**
 * Host of one contributed node editor section.
 *
 * Creates the section component through a view container so contributions stay
 * renderer-neutral: the section receives node/values/locale/setConfig inputs and
 * is free to use any shared component inside.
 */
@Component({
    selector: 'workflow-node-editor-section',
    template: `
    <section class="workflow-node-editor-section" data-section="{{section?.id}}"
        aria-label="{{label}}">
        <div class="workflow-node-editor-section-title">{{label}}</div>
        <span #anchor></span>
    </section>`
})
export class WorkflowNodeEditorSectionComponent implements AfterViewInit, OnDestroy {
    @ViewChild('anchor', ViewContainerRef) anchor?: ViewContainerRef;

    @Attribute()
    set section(value: WorkflowNodeEditorSection | undefined) {
        if (value === this._section) {
            return;
        }
        this._section = value;
        this.recreate = true;
        this.scheduleSync();
    }
    get section(): WorkflowNodeEditorSection | undefined { return this._section; }
    protected _section?: WorkflowNodeEditorSection;

    @Attribute() label = '';

    @Attribute()
    set node(value: IVisualWorkflowNode | undefined) {
        if (value === this._node) {
            return;
        }
        this._node = value;
        this.scheduleSync();
    }
    get node(): IVisualWorkflowNode | undefined { return this._node; }
    protected _node?: IVisualWorkflowNode;

    @Attribute()
    set values(value: Record<string, any>) {
        const next = value || {};
        if (next === this._values) {
            return;
        }
        this._values = next;
        this.scheduleSync();
    }
    get values(): Record<string, any> { return this._values; }
    protected _values: Record<string, any> = {};

    @Attribute() locale = 'zh-CN';
    @Attribute() setConfigAction?: (patch: Record<string, any>) => void;

    protected child?: ComponentRef<any>;
    protected destroyed = false;
    protected syncQueued = false;
    protected recreate = false;

    protected context(): WorkflowNodeEditorContext {
        return {
            node: this.node as IVisualWorkflowNode,
            values: this.values,
            locale: this.locale,
            setConfig: (patch: Record<string, any>) => this.setConfigAction?.(patch)
        };
    }

    protected inputs(): Record<string, any> {
        const section = this.section;
        if (!section || !this.node) {
            return {};
        }
        const context = this.context();
        return {
            node: context.node,
            values: context.values,
            locale: context.locale,
            setConfig: context.setConfig,
            ...(section.inputs?.(context) || {})
        };
    }

    protected scheduleSync(): void {
        if (this.syncQueued) {
            return;
        }
        this.syncQueued = true;
        Promise.resolve().then(() => {
            this.syncQueued = false;
            if (!this.destroyed) {
                this.sync();
            }
        });
    }

    protected sync(): void {
        if (!this.anchor) {
            return;
        }
        const type: Type<any> | undefined = this.section?.component;
        if (!type) {
            this.child?.destroy?.();
            this.child = undefined;
            return;
        }
        if (this.recreate || !this.child) {
            this.recreate = false;
            this.child?.destroy?.();
            this.child = this.anchor.createComponent(type, { inputs: this.inputs() });
            return;
        }
        Object.assign(this.child.instance as object, this.inputs());
    }

    onAfterViewInit(): void {
        this.scheduleSync();
    }

    onDestroy(): void {
        this.destroyed = true;
        this.child?.destroy?.();
        this.child = undefined;
    }
}

const sectionsCache = new WeakMap<object, {
    node: IVisualWorkflowNode | undefined;
    contributions: WorkflowNodeEditorContribution[];
    values: Record<string, any>;
    locale: string;
    sections: WorkflowNodeEditorSection[];
}>();

/**
 * Renders the node-type sections contributed by the host.
 *
 * The inspector only passes data; section visibility/order/inputs are owned by
 * the contribution registry so a plugin can add a panel without editing the
 * inspector template.
 */
@Component({
    selector: 'workflow-node-editor-sections',
    imports: [WorkflowNodeEditorSectionComponent],
    template: `
    <div class="workflow-node-editor-sections">
        <workflow-node-editor-section v-for="section in sections" trackBy="id"
            :section="section" :label="sectionLabel(section)" :node="node" :values="values"
            :locale="locale" :setConfigAction="setConfigAction"></workflow-node-editor-section>
    </div>`
})
export class WorkflowNodeEditorSectionsComponent {
    @Attribute() node?: IVisualWorkflowNode;
    @Attribute() values: Record<string, any> = {};
    @Attribute() locale = 'zh-CN';
    @Attribute() setConfigAction?: (patch: Record<string, any>) => void;
    @Attribute() contributions: WorkflowNodeEditorContribution[] = [];

    constructor(@Optional() protected translator?: Translator) { }

    get sections(): WorkflowNodeEditorSection[] {
        // Stable identity matters: a fresh array on every binding pass makes
        // `v-for` recreate section hosts and can feed a render loop.
        const cached = sectionsCache.get(this);
        if (cached && cached.node === this.node && cached.contributions === this.contributions
            && cached.values === this.values && cached.locale === this.locale) {
            return cached.sections;
        }
        const sections = nodeEditorSections(this.contributions, this.node, {
            node: this.node as IVisualWorkflowNode,
            values: this.values,
            locale: this.locale,
            setConfig: (patch: Record<string, any>) => this.setConfigAction?.(patch)
        });
        sectionsCache.set(this, {
            node: this.node,
            contributions: this.contributions,
            values: this.values,
            locale: this.locale,
            sections
        });
        return sections;
    }

    sectionLabel(section: WorkflowNodeEditorSection): string {
        return translateWorkflow(
            this.translator,
            this.locale,
            section.labelKey || '',
            section.label || section.id
        );
    }
}
