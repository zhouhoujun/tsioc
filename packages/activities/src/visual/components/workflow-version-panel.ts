import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowRelease, WorkflowVersionSummary } from '../workflow-store';
import { describeWorkflowDiff, WorkflowDiffResult } from '../workflow-diff';

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
                    <span class="workflow-version-meta">{{metaLabel(item)}}</span>
                </span>
                <button class="workflow-btn" type="button" @click="compare(item)">{{compareLabel}}</button>
                <button class="workflow-btn" type="button" v-if="!isReleased(item)" @click="releaseItem(item)">{{releaseLabel}}</button>
                <button class="workflow-btn" type="button" @click="restore(item)">{{restoreLabel}}</button>
            </div>
        </div>
        <div class="workflow-version-diff" v-if="diff">
            <div class="workflow-version-diff-head">
                <span class="workflow-version-diff-title">{{diffTitle}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-btn" type="button" @click="clearDiff">{{closeLabel}}</button>
            </div>
            <div class="workflow-version-diff-empty" v-if="diffLines.length === 0">{{diffEmptyLabel}}</div>
            <div class="workflow-version-diff-row" v-for="line in diffLines" [class]="'is-' + line.kind">
                <span class="workflow-version-diff-mark">{{lineMark(line.kind)}}</span>
                <span class="workflow-version-diff-text">{{line.text}}</span>
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
    /** Diff of the selected version against the current draft. */
    @Attribute() diff?: WorkflowDiffResult;
    @Attribute() diffVersion?: number;
    @Attribute() restoreAction?: (version: number) => void;
    @Attribute() compareAction?: (version: number) => void;
    @Attribute() releaseAction?: (version: number) => void;
    @Attribute() closeDiffAction?: () => void;
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
    get compareLabel(): string { return this.t('versionCompare', 'Compare'); }
    get releaseLabel(): string { return this.t('versionRelease', 'Release'); }

    /** `Saved · <time> · by <author>` — the author is host-provided and optional. */
    metaLabel(item: WorkflowVersionSummary): string {
        const parts = [this.kindLabel(item), item.createdAt];
        if (item.createdBy) {
            parts.push(this.t('versionBy', 'by') + ' ' + item.createdBy);
        }
        return parts.join(' · ');
    }

    isReleased(item: WorkflowVersionSummary): boolean {
        return this.release?.version === item.version;
    }
    get diffEmptyLabel(): string { return this.t('versionDiffEmpty', 'No differences from the draft.'); }

    get diffTitle(): string {
        return `${this.t('versionDiffTitle', 'Changes since')} v${this.diffVersion ?? ''}`;
    }

    get diffLines(): Array<{ kind: 'added' | 'removed' | 'changed'; text: string }> {
        return this.diff ? describeWorkflowDiff(this.diff) : [];
    }

    lineMark(kind: 'added' | 'removed' | 'changed'): string {
        return kind === 'added' ? '+' : kind === 'removed' ? '−' : '~';
    }

    compare(item: WorkflowVersionSummary): void {
        this.compareAction?.(item.version);
    }

    releaseItem(item: WorkflowVersionSummary): void {
        this.releaseAction?.(item.version);
    }

    clearDiff(): void {
        this.closeDiffAction?.();
    }

    kindLabel(item: WorkflowVersionSummary): string {
        return item.kind === 'publish'
            ? this.t('versionPublished', 'Published')
            : this.t('versionSaved', 'Saved');
    }

    rowClass(item: WorkflowVersionSummary): Record<string, boolean> {
        return {
            'workflow-version-row': true,
            'is-published': this.isReleased(item)
        };
    }

    restore(item: WorkflowVersionSummary): void {
        this.restoreAction?.(item.version);
    }

    close(): void {
        this.closeAction?.();
    }
}
