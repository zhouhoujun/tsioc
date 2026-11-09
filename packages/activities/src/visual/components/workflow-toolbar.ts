import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { isDarkTheme } from '@tsdi/components/common';
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
        <button class="workflow-btn workflow-btn-primary" [disabled]="model.running || !model.nodeCount" @click="run">{{runLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canResume" @click="resume">{{resumeLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.running" @click="cancel">{{stopLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canUndo" @click="undo">{{undoLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canRedo" @click="redo">{{redoLabel}}</button>
        <button class="workflow-btn workflow-btn-danger" [disabled]="!model.hasSelection" @click="remove">{{deleteLabel}}</button>
        <button class="workflow-btn" @click="zoomOut">−</button>
        <span class="workflow-toolbar-zoom">{{model.zoomLabel}}</span>
        <button class="workflow-btn" @click="zoomIn">+</button>
        <button class="workflow-btn" @click="resetView">{{resetLabel}}</button>
        <button class="workflow-btn" @click="autoLayout">{{layoutLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.hasSelection" @click="duplicate">{{duplicateLabel}}</button>
        <button class="workflow-btn" @click="toggleLogs">{{logsLabel}}</button>
        <button class="workflow-btn" @click="toggleTheme" [title]="themeLabel">{{themeActionLabel}}</button>
        <button class="workflow-btn" @click="save">{{saveLabel}}</button>
        <button class="workflow-btn" @click="openLibrary">{{libraryLabel}}</button>
        <button class="workflow-btn" @click="toggleJson">JSON</button>
        <button class="workflow-btn" [disabled]="!model.nodeCount" @click="clear">{{clearLabel}}</button>
    </div>`
})
export class WorkflowToolbarComponent {
    @Attribute() model: WorkflowToolbarModel = EMPTY_TOOLBAR;
    @Attribute() locale = 'zh-CN';
    @Attribute() theme = 'light';
    @Attribute() toggleThemeAction?: () => void;
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

    constructor(@Optional() private translator?: Translator) { }

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
    get themeLabel(): string { return this.t('theme', 'Toggle theme'); }
    get themeActionLabel(): string {
        return isDarkTheme(this.theme)
            ? (this.isZh ? '亮色' : 'Light')
            : (this.isZh ? '暗色' : 'Dark');
    }
    get themeIcon(): string { return isDarkTheme(this.theme) ? '☀' : '☾'; }
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
    toggleTheme(): void {
        (this.toggleThemeAction || (() => this.action?.('toggle-theme')))();
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
