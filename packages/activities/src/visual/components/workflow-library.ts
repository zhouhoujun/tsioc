import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowDefinitionSummary } from '../workflow-store';

/**
 * Workflow library overlay: save the current document, create a copy, load or
 * delete stored definitions. The store is host-provided (localStorage by
 * default in browsers), so the same component works in any renderer.
 */
@Component({
    selector: 'workflow-library',
    template: `
    <div class="workflow-library-panel" v-show="visible">
        <div class="workflow-library-head">
            <span class="workflow-library-title">{{title}}</span>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn workflow-btn-primary" @click="save">{{saveLabel}}</button>
            <button class="workflow-btn" @click="saveAs">{{saveAsLabel}}</button>
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-library-list">
            <div class="workflow-library-empty" v-if="!items.length">{{emptyLabel}}</div>
            <div class="workflow-library-row" v-for="item in items" [class]="rowClass(item)">
                <span class="workflow-library-row-main">
                    <span class="workflow-library-row-name">{{item.name}}</span>
                    <span class="workflow-library-row-meta">{{nodeLabel(item)}} · {{item.updatedAt}}</span>
                </span>
                <button class="workflow-btn" @click="open(item)">{{openLabel}}</button>
                <button class="workflow-btn workflow-btn-danger" @click="remove(item)">{{removeLabel}}</button>
            </div>
        </div>
        <div class="workflow-library-error" v-if="error">{{error}}</div>
    </div>`
})
export class WorkflowLibraryComponent {
    @Attribute() items: WorkflowDefinitionSummary[] = [];
    @Attribute() visible = false;
    @Attribute() currentId = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() error = '';
    @Attribute() saveAction?: () => void;
    @Attribute() saveAsAction?: () => void;
    @Attribute() openAction?: (id: string) => void;
    @Attribute() removeAction?: (id: string) => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

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

    get title(): string { return this.t('libraryTitle', 'Workflow library'); }
    get emptyLabel(): string { return this.t('libraryEmpty', 'No saved workflows yet.'); }
    get saveLabel(): string { return this.t('save', 'Save'); }
    get saveAsLabel(): string { return this.t('saveAs', 'Save as copy'); }
    get openLabel(): string { return this.t('open', 'Open'); }
    get removeLabel(): string { return this.t('remove', 'Delete'); }
    get closeLabel(): string { return this.t('close', 'Close'); }

    nodeLabel(item: WorkflowDefinitionSummary): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.nodeCount',
            this.isZh ? `${item.nodeCount} 个节点` : `${item.nodeCount} nodes`,
            { count: item.nodeCount }
        );
    }

    rowClass(item: WorkflowDefinitionSummary): Record<string, boolean> {
        return {
            'workflow-library-row': true,
            'is-active': item.id === this.currentId
        };
    }

    save(): void {
        this.saveAction?.();
    }

    saveAs(): void {
        this.saveAsAction?.();
    }

    open(item: WorkflowDefinitionSummary): void {
        this.openAction?.(item.id);
    }

    remove(item: WorkflowDefinitionSummary): void {
        this.removeAction?.(item.id);
    }

    close(): void {
        this.closeAction?.();
    }
}
