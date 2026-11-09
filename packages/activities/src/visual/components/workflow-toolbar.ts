import { Attribute, Component, NoReactive } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { MenuBarGroup, isDarkTheme } from '@tsdi/components/common';
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
        <menu-bar class="workflow-menu" icon="☰" label="" caret="" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
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

    /** Keep the menu source stable while the toolbar model is unchanged. */
    @NoReactive() private menuCache?: { model: WorkflowToolbarModel; groups: MenuBarGroup[] };

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

    get menuLabel(): string { return this.t('menu', 'Menu'); }
    get jsonMenuLabel(): string { return this.t('jsonMenu', 'Import / Export JSON'); }

    /**
     * Node-RED style application menu. It mirrors the toolbar actions instead of
     * replacing them, so mouse users keep the inline buttons and the menu offers
     * the same commands plus shortcut hints for keyboard-oriented users.
     */
    get menuGroups(): MenuBarGroup[] {
        const cache = this.menuCache;
        if (cache && cache.model === this.model) {
            return cache.groups;
        }
        const groups = [
            {
                items: [
                    { id: 'save', label: this.saveLabel, shortcut: 'Ctrl+S' },
                    { id: 'open-library', label: this.libraryLabel },
                    { id: 'toggle-json', label: this.jsonMenuLabel }
                ]
            },
            {
                items: [
                    {
                        id: 'run',
                        label: this.runLabel,
                        icon: '▶',
                        disabled: this.model.running || !this.model.nodeCount
                    },
                    {
                        id: 'resume',
                        label: this.resumeLabel,
                        icon: '⏵',
                        disabled: !this.model.canResume
                    },
                    {
                        id: 'cancel',
                        label: this.stopLabel,
                        icon: '■',
                        disabled: !this.model.running
                    }
                ]
            },
            {
                items: [
                    { id: 'undo', label: this.undoLabel, shortcut: 'Ctrl+Z', disabled: !this.model.canUndo },
                    { id: 'redo', label: this.redoLabel, shortcut: 'Ctrl+Y', disabled: !this.model.canRedo },
                    { id: 'duplicate', label: this.duplicateLabel, shortcut: 'Ctrl+D', disabled: !this.model.hasSelection },
                    { id: 'delete', label: this.deleteLabel, shortcut: 'Del', disabled: !this.model.hasSelection, danger: true },
                    { id: 'clear', label: this.clearLabel, disabled: !this.model.nodeCount }
                ]
            },
            {
                items: [
                    { id: 'reset-view', label: this.resetLabel },
                    { id: 'auto-layout', label: this.layoutLabel },
                    { id: 'toggle-logs', label: this.logsLabel },
                    { id: 'toggle-theme', label: this.themeLabel }
                ]
            }
        ];
        this.menuCache = { model: this.model, groups };
        return groups;
    }

    /**
     * Arrow field: the menu receives it as a plain callback, so a prototype
     * method would lose the component instance when invoked.
     */
    readonly menuSelect = (id: string): void => {
        switch (id) {
            case 'run': this.run(); break;
            case 'resume': this.resume(); break;
            case 'cancel': this.cancel(); break;
            case 'undo': this.undo(); break;
            case 'redo': this.redo(); break;
            case 'duplicate': this.duplicate(); break;
            case 'delete': this.remove(); break;
            case 'clear': this.clear(); break;
            case 'reset-view': this.resetView(); break;
            case 'auto-layout': this.autoLayout(); break;
            case 'toggle-logs': this.toggleLogs(); break;
            case 'toggle-theme': this.toggleTheme(); break;
            case 'save': this.save(); break;
            case 'open-library': this.openLibrary(); break;
            case 'toggle-json': this.toggleJson(); break;
            default: this.action?.(id); break;
        }
    };

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
