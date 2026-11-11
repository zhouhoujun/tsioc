import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { ThemeName } from '@tsdi/components/common';
import { translateWorkflow } from '../i18n';
import { WorkflowToolbarModel } from '../types';

const EMPTY_TOOLBAR: WorkflowToolbarModel = {
    name: '',
    nodeCount: 0,
    connectionCount: 0,
    hasSelection: false,
    canUndo: false,
    canRedo: false,
    canResume: false,
    running: false,
    zoomLabel: '100%',
    statusLabel: ''
};

/**
 * Workflow designer toolbar. Host actions are injected through callbacks so the
 * same component works in HTML, TUI and any future renderer. Visual styling is
 * owned by the shared workflow stylesheet, never by inline attributes.
 */
@Component({
    selector: 'workflow-toolbar',
    template: `
    <div class="workflow-toolbar">
        <span class="workflow-toolbar-title">{{model.name}}</span>
        <span class="workflow-toolbar-meta">{{nodeLabel}} · {{connectionLabel}}</span>
        <span class="workflow-toolbar-status">{{model.statusLabel}}</span>
        <span class="workflow-status-spacer"></span>
        <button v-if="visible('run')" class="workflow-btn workflow-btn-primary" [disabled]="model.running || !model.nodeCount" @click="run">{{runLabel}}</button>
        <button v-if="visible('resume')" class="workflow-btn" [disabled]="!model.canResume" @click="resume">{{resumeLabel}}</button>
        <button v-if="visible('cancel')" class="workflow-btn" [disabled]="!model.running" @click="cancel">{{stopLabel}}</button>
        <button v-if="visible('undo')" class="workflow-btn" [disabled]="!model.canUndo" @click="undo">{{undoLabel}}</button>
        <button v-if="visible('redo')" class="workflow-btn" [disabled]="!model.canRedo" @click="redo">{{redoLabel}}</button>
        <button v-if="visible('delete')" class="workflow-btn workflow-btn-danger" [disabled]="!model.hasSelection" @click="remove">{{deleteLabel}}</button>
        <button v-if="visible('zoom')" class="workflow-btn" @click="zoomOut">−</button>
        <span v-if="visible('zoom')" class="workflow-toolbar-zoom">{{model.zoomLabel}}</span>
        <button v-if="visible('zoom')" class="workflow-btn" @click="zoomIn">+</button>
        <button v-if="visible('reset-view')" class="workflow-btn" @click="resetView">{{resetLabel}}</button>
        <button v-if="visible('auto-layout')" class="workflow-btn" @click="autoLayout">{{layoutLabel}}</button>
        <button v-if="visible('duplicate')" class="workflow-btn" [disabled]="!model.hasSelection" @click="duplicate">{{duplicateLabel}}</button>
        <button v-if="visible('toggle-logs')" class="workflow-btn" @click="toggleLogs">{{logsLabel}}</button>
        <button v-if="visible('save')" class="workflow-btn" @click="save">{{saveLabel}}</button>
        <button v-if="visible('open-library')" class="workflow-btn" @click="openLibrary">{{libraryLabel}}</button>
        <button v-if="visible('toggle-json')" class="workflow-btn" @click="toggleJson">JSON</button>
        <button v-if="visible('clear')" class="workflow-btn" [disabled]="!model.nodeCount" @click="clear">{{clearLabel}}</button>
    </div>`
})
export class WorkflowToolbarComponent {
    @Attribute() model: WorkflowToolbarModel = EMPTY_TOOLBAR;
    @Attribute() locale = 'zh-CN';
    @Attribute() theme = 'light';
    @Attribute() themeChangeAction?: (theme: ThemeName) => void;
    @Attribute() runAction?: () => void;
    @Attribute() resumeAction?: () => void;
    @Attribute() cancelAction?: () => void;
    @Attribute() undoAction?: () => void;
    @Attribute() redoAction?: () => void;
    @Attribute() deleteAction?: () => void;
    @Attribute() zoomInAction?: () => void;
    @Attribute() zoomOutAction?: () => void;
    @Attribute() resetViewAction?: () => void;
    @Attribute() autoLayoutAction?: () => void;
    @Attribute() duplicateAction?: () => void;
    @Attribute() toggleLogsAction?: () => void;
    @Attribute() saveAction?: () => void;
    @Attribute() openLibraryAction?: () => void;
    @Attribute() clearAction?: () => void;
    @Attribute() toggleJsonAction?: () => void;
    @Attribute() action?: (name: string) => void;
    /** Optional list of action names to hide in embedded/compact hosts. */
    @Attribute() hiddenActions: string[] = [];

    constructor(@Optional() private translator?: Translator) { }

    visible(name: string): boolean {
        return !(Array.isArray(this.hiddenActions) ? this.hiddenActions : []).includes(name);
    }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.ui.${key}`,
            fallback,
            params
        );
    }

    get runLabel(): string { return this.t('run', 'Run'); }
    get resumeLabel(): string { return this.t('resume', 'Resume'); }
    get stopLabel(): string { return this.t('stop', 'Stop'); }
    get undoLabel(): string { return this.t('undo', 'Undo'); }
    get redoLabel(): string { return this.t('redo', 'Redo'); }
    get deleteLabel(): string { return this.t('delete', 'Delete'); }
    get resetLabel(): string { return this.t('fit', 'Fit'); }
    get layoutLabel(): string { return this.t('layout', 'Auto layout'); }
    get duplicateLabel(): string { return this.t('duplicate', 'Duplicate'); }
    get logsLabel(): string { return this.t('logs', 'Logs'); }

    get saveLabel(): string { return this.t('save', 'Save'); }
    get libraryLabel(): string { return this.t('library', 'Workflows'); }
    get clearLabel(): string { return this.t('clear', 'Clear'); }
    get nodeLabel(): string {
        return this.t('nodes', `${this.model.nodeCount} nodes`, { count: this.model.nodeCount });
    }
    get connectionLabel(): string {
        return this.t('links', `${this.model.connectionCount} links`, { count: this.model.connectionCount });
    }

    run(): void {
        (this.runAction || (() => this.action?.('run')))();
    }
    resume(): void {
        (this.resumeAction || (() => this.action?.('resume')))();
    }
    cancel(): void {
        (this.cancelAction || (() => this.action?.('cancel')))();
    }
    undo(): void {
        (this.undoAction || (() => this.action?.('undo')))();
    }
    redo(): void {
        (this.redoAction || (() => this.action?.('redo')))();
    }
    remove(): void {
        (this.deleteAction || (() => this.action?.('delete')))();
    }
    zoomIn(): void {
        (this.zoomInAction || (() => this.action?.('zoom-in')))();
    }
    zoomOut(): void {
        (this.zoomOutAction || (() => this.action?.('zoom-out')))();
    }
    resetView(): void {
        (this.resetViewAction || (() => this.action?.('reset-view')))();
    }
    autoLayout(): void {
        (this.autoLayoutAction || (() => this.action?.('auto-layout')))();
    }
    duplicate(): void {
        (this.duplicateAction || (() => this.action?.('duplicate')))();
    }
    toggleLogs(): void {
        (this.toggleLogsAction || (() => this.action?.('toggle-logs')))();
    }
    selectTheme(theme: ThemeName): void {
        this.themeChangeAction?.(theme);
    }
    save(): void {
        (this.saveAction || (() => this.action?.('save')))();
    }
    openLibrary(): void {
        (this.openLibraryAction || (() => this.action?.('open-library')))();
    }
    clear(): void {
        (this.clearAction || (() => this.action?.('clear')))();
    }
    toggleJson(): void {
        (this.toggleJsonAction || (() => this.action?.('toggle-json')))();
    }
}
