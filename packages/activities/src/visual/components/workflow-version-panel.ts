import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowRelease, WorkflowVersionSummary } from '../workflow-store';

/**
 * Version history overlay. Lists immutable snapshots recorded by explicit saves
 * and publishes, marks the released version and restores a snapshot into the
 * editable draft.
 */
@Component({
    selector: 'workflow-version-panel',
    template: `
    <div class="workflow-version-panel" v-show="visible">
        <div class="workflow-version-head">
            <span class="workflow-version-title">{{title}}</span>
            <span class="workflow-version-release" v-if="release">v{{release.version}}</span>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn workflow-version-close" type="button"
                [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
        </div>
        <div class="workflow-version-list">
            <div class="workflow-version-empty" v-if="!items.length">{{emptyLabel}}</div>
            <div class="workflow-version-row" v-for="item in items" [class]="rowClass(item)">
                <span class="workflow-version-badge">v{{item.version}}</span>
                <span class="workflow-version-main">
                    <span class="workflow-version-name">{{item.name || item.workflowId}}</span>
                    <span class="workflow-version-meta">{{kindLabel(item)}} · {{item.createdAt}}</span>
                </span>
                <button class="workflow-btn" type="button" @click="restore(item)">{{restoreLabel}}</button>
            </div>
        </div>
        <div class="workflow-version-error" v-if="error">{{error}}</div>
    </div>`
})
export class WorkflowVersionPanelComponent {
    @Attribute() items: WorkflowVersionSummary[] = [];
    @Attribute() release?: WorkflowRelease;
    @Attribute() visible = false;
    @Attribute() locale = 'zh-CN';
    @Attribute() error = '';
    @Attribute() restoreAction?: (version: number) => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private readonly translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    private t(key: string, fallback: string): string {
        return translateWorkflow(this.translator, this.isZh ? 'zh-CN' : 'en', `workflow.ui.${key}`, fallback);
    }

    get title(): string { return this.t('versions', 'Versions'); }
    get emptyLabel(): string { return this.t('versionsEmpty', 'No versions yet. Save with Ctrl+S to record one.'); }
    get restoreLabel(): string { return this.t('versionRestore', 'Restore'); }
    get closeLabel(): string { return this.t('close', 'Close'); }

    kindLabel(item: WorkflowVersionSummary): string {
        return item.kind === 'publish'
            ? this.t('versionPublished', 'Published')
            : this.t('versionSaved', 'Saved');
    }

    rowClass(item: WorkflowVersionSummary): Record<string, boolean> {
        return {
            'workflow-version-row': true,
            'is-published': this.release?.version === item.version
        };
    }

    restore(item: WorkflowVersionSummary): void {
        this.restoreAction?.(item.version);
    }

    close(): void {
        this.closeAction?.();
    }
}
