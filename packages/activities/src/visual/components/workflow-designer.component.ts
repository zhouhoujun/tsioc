import { Attribute, Component, ElementRef, NoReactive, OnDestroy, ReactiveEffect, ViewChild, noReact, reactive } from '@tsdi/components';
import { applyThemeToDocument, isThemeName, ThemeName } from '@tsdi/components/common';
import { TabBarSource } from '@tsdi/components/common/tab-bar';
import { DOCUMENT } from '@tsdi/common';
import { Inject, Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { ActivityContext } from '../../activities/Activity';
import { WorkflowNodeRegistry } from '../node-registry';
import { VisualWorkflowService } from '../VisualWorkflowService';
import { createBlankWorkflowDefinition, createDefaultWorkflowDefinition, WorkflowDesigner } from '../workflow-designer';
import { VisualWorkflowDefinition, WorkflowToolbarModel } from '../types';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    createDefaultWorkflowDefinitionStore
} from '../workflow-store';
import { installWorkflowDesignerStyles } from './workflow-designer.styles';
import { WorkflowDesignerPreviewComponent } from './workflow-designer-preview.component';
import { WORKFLOW_ACTION_BUS } from '../workflow-action-bus';

interface WorkflowDocumentTab {
    id: string;
    designer: WorkflowDesigner;
    /** Whether the document exists in the backing store. */
    persisted: boolean;
}

/**
 * Full multi-workflow designer shell.
 *
 * Tabs, workflow library and shell-level save/open shortcuts live here. The
 * palette, canvas, inspector, toolbar, run history and JSON panel are provided
 * by the reusable {@link WorkflowDesignerPreviewComponent}, which the microservice
 * admin also embeds for rule editing.
 */
@Component({
    selector: 'workflow-designer',
    template: `
    <div class="workflow-designer" data-theme="{{themeName}}">
        <div class="workflow-global-bar">
            <tab-bar class="workflow-tabs" :source="workflowTabSource"></tab-bar>
            <workflow-management-menu :model="toolbarModel" :locale="locale" :theme="themeName"
                :action="toolbarAction" :themeChangeAction="themeSelectAction"
                :localeChangeAction="changeLocale"></workflow-management-menu>
        </div>
        <workflow-designer-preview #preview
            :designer="designer"
            :registry="registry"
            :locale="locale"
            :theme="themeName"
            :runContext="runContext"
            :saveState="saveState"
            :themeChangeAction="themeSelectAction"
            :hostAction="previewHostAction"
            :hiddenActions="previewHiddenActions"
            :autosaveAction="scheduleAutosave"></workflow-designer-preview>
        <workflow-library :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
        <div class="workflow-rename" v-if="showRename">
            <div class="workflow-rename-panel">
                <div class="workflow-rename-head">
                    <span class="workflow-rename-title">{{renameTitle}}</span>
                    <button class="workflow-btn workflow-rename-close" type="button"
                        [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancelRename"><icon name="close" size="sm"></icon></button>
                </div>
                <input class="workflow-rename-input" type="text" [value]="renameValue"
                    placeholder="{{renamePlaceholder}}" aria-label="{{renameTitle}}"
                    @input="renameInput" @keydown="renameKey" />
                <div class="workflow-rename-error" v-if="renameError">{{renameError}}</div>
                <div class="workflow-rename-actions">
                    <button class="workflow-btn" type="button" @click="cancelRename">{{cancelLabel}}</button>
                    <button class="workflow-btn workflow-btn-primary" type="button" @click="commitRename">{{renameConfirmLabel}}</button>
                </div>
            </div>
        </div>
    </div>`
})
export class WorkflowDesignerComponent implements OnDestroy {
    @Attribute() locale = 'zh-CN';
    @Attribute() theme: ThemeName = 'light';
    /** Optional host hook to persist a user-selected theme. */
    @Attribute() themeChangeAction?: (theme: ThemeName) => void;
    /** Optional host hook to switch the UI language. */
    @Attribute() localeChangeAction?: (locale: 'en' | 'zh-CN') => void;
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() initialDefinition?: VisualWorkflowDefinition | string;
    @Attribute() runContext: ActivityContext = {};
    @Attribute() autoRun = false;
    @Attribute() store: WorkflowDefinitionStore = createDefaultWorkflowDefinitionStore();
    /** Persist edits automatically after `autosaveDelay` ms of quiet. */
    @Attribute() autosave = false;
    @Attribute() autosaveDelay = 1200;
    /**
     * Minimum gap between two autosaves. Editing keeps resetting the quiet
     * timer, so without a floor a slow typist would write the whole document
     * once per character.
     */
    @Attribute() autosaveMinInterval = 3000;
    /** Longest an edit may stay unsaved while the user keeps typing. */
    @Attribute() autosaveMaxDelay = 15000;
    /** Host hook invoked whenever the open document tabs change. */
    @Attribute() tabChangeAction?: (state: { openIds: string[]; activeId?: string }) => void;

    @ViewChild('preview', WorkflowDesignerPreviewComponent) preview?: WorkflowDesignerPreviewComponent;

    private workflowTabs: WorkflowDocumentTab[] = [];
    private activeTabId = '';
    private tabVersion = 0;
    private tabSourceCache?: TabBarSource;
    private reactiveEffect?: ReactiveEffect;
    private menuClickHandler?: (event: any) => void;
    saveState: 'saved' | 'dirty' | 'saving' | 'error' = 'saved';
    readonly previewHiddenActions = ['save', 'open-library'];
    showLibrary = false;
    showRename = false;
    renameValue = '';
    renameError = '';
    libraryError = '';
    libraryItems: WorkflowDefinitionSummary[] = [];
    /** Set in onInit to the reactive component proxy (arrow callbacks capture the raw instance). */
    private selfRef?: WorkflowDesignerComponent;
    @NoReactive() private autosaveTimer?: any;
    @NoReactive() private autosaveInFlight = false;
    @NoReactive() private lastAutosaveAt = 0;
    @NoReactive() private unsavedSince?: number;
    @NoReactive() private keyHandler?: (event: any) => void;
    @NoReactive() private documentRef?: any;

    readonly registry: WorkflowNodeRegistry;
    private readonly service?: VisualWorkflowService;

    constructor(
        @Optional() registry?: WorkflowNodeRegistry,
        @Optional() service?: VisualWorkflowService,
        @Optional() @Inject(DOCUMENT) document?: any,
        @Optional() private translator?: Translator,
        @Optional() effect?: ReactiveEffect,
        @Optional() private elementRef?: ElementRef
    ) {
        this.documentRef = document;
        try {
            if (document) {
                (document as any)[noReact] = true;
            }
        } catch {
            // Documents can reject expando properties; handlers still use the
            // raw constructor reference rather than reading it through a proxy.
        }
        this.registry = registry || new WorkflowNodeRegistry();
        this.service = service;
        this.reactiveEffect = effect;
        installWorkflowDesignerStyles(document);
        applyThemeToDocument(document, this.themeName);
        const rawDesigner = new WorkflowDesigner({
            registry: this.registry,
            service,
            definition: createDefaultWorkflowDefinition(this.registry, this.localeValue, translator)
        });
        this.designer = effect ? reactive(rawDesigner, effect) : rawDesigner;
        this.workflowTabs = [{ id: this.designer.definition.id, designer: this.designer, persisted: false }];
        this.activeTabId = this.workflowTabs[0].id;
    }

    onInit(): void {
        this.selfRef = this;
        WORKFLOW_ACTION_BUS.subscribe((action: string) => this.toolbarAction(action));
        const document = (globalThis as { document?: Document }).document;
        if (document?.addEventListener) {
            this.menuClickHandler = (event: any) => {
                const target = event?.target?.closest?.('[data-menu-id]');
                const id = target?.getAttribute?.('data-menu-id');
                if (!id) {
                    return;
                }
                setTimeout(() => {
                    if ((globalThis as any).__workflowMenuHandled !== id) {
                        this.toolbarAction(id);
                    }
                }, 0);
            };
            document.addEventListener('click', this.menuClickHandler, true);
        }
        this.saveState = this.designer.dirty ? 'dirty' : 'saved';
        this.bindGlobalShortcuts();
        if (this.initialDefinition) {
            this.designer.load(this.initialDefinition);
            this.syncActiveTabId();
        }
        if (this.autoRun) {
            void this.designer.run({ context: this.runContext });
        }
    }

    onDestroy(): void {
        this.clearAutosaveTimer();
        const rootDocument = (globalThis as { document?: Document }).document;
        if (this.menuClickHandler && rootDocument?.removeEventListener) {
            rootDocument.removeEventListener('click', this.menuClickHandler, true);
        }
        const doc = this.documentRef;
        if (doc?.removeEventListener && this.keyHandler) {
            doc.removeEventListener('keydown', this.keyHandler, true);
        }
        this.keyHandler = undefined;
    }

    get localeValue(): 'zh-CN' | 'en' {
        return String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
    }

    get themeName(): ThemeName {
        return isThemeName(this.theme) ? this.theme : 'light';
    }

    get themeSelectAction(): (theme: ThemeName) => void {
        return theme => this.setTheme(theme);
    }

    readonly changeLocale = (locale: 'en' | 'zh-CN'): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.locale = locale;
        self.localeChangeAction?.(locale);
    };

    get toolbarModel(): WorkflowToolbarModel {
        return this.preview?.toolbarModel as WorkflowToolbarModel;
    }

    get workflowTabSource(): TabBarSource {
        // Read the revision so tab changes invalidate template bindings. The
        // source object itself must stay stable between changes; returning a
        // new object on every read feeds the tab-bar loop and its parent effect.
        this.tabVersion;
        if (this.tabSourceCache) {
            return this.tabSourceCache;
        }
        const labels = this.workflowTabs.map(tab => ({
            id: tab.id,
            label: tab.designer.definition.name || this.t('newWorkflow', 'New workflow'),
            active: tab.id === this.activeTabId
        }));
        this.tabSourceCache = {
            visible: true,
            items: labels,
            showCreate: true,
            createLabel: '+',
            select: id => { void this.activateWorkflowTab(id); },
            close: id => { void this.closeWorkflowTab(id); },
            create: () => { void this.createWorkflowTab(); }
        };
        return this.tabSourceCache;
    }

    get openWorkflowCount(): number {
        this.tabVersion;
        return this.workflowTabs.length;
    }

    /** Create a blank workflow in a new tab. */
    async createWorkflowTab(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        await self.persistActiveTab();
        const definition = createBlankWorkflowDefinition(
            self.localeValue,
            self.t('newWorkflow', 'New workflow')
        );
        definition.id = self.nextWorkflowId();
        const tab = self.createTab(definition);
        self.workflowTabs.push(tab);
        self.setActiveTab(tab);
        self.emitTabs();
    }

    /** Open a saved workflow in a new tab or activate its existing tab. */
    async openWorkflowTab(id: string): Promise<boolean> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const existing = self.workflowTabs.find(tab => tab.id === id);
        if (existing) {
            await self.activateWorkflowTab(id);
            return true;
        }
        try {
            const definition = await self.store.get(id);
            if (!definition) {
                self.libraryError = `${self.t('notFound', 'Workflow not found')}: ${id}`;
                return false;
            }
            await self.persistActiveTab();
            const tab = self.createTab(definition, true);
            self.workflowTabs.push(tab);
            self.setActiveTab(tab);
            self.emitTabs();
            return true;
        } catch (error) {
            self.libraryError = (error as Error).message;
            return false;
        }
    }

    /** Restore the open tab set persisted by the host. */
    async restoreWorkflowTabs(ids: string[], activeId?: string): Promise<boolean> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const loaded: WorkflowDocumentTab[] = [];
        let available: Set<string>;
        try {
            available = new Set((await self.store.list()).map(item => item.id));
        } catch {
            available = new Set(ids || []);
        }
        for (const id of Array.from(new Set(ids || []))) {
            if (!id || !available.has(id)) {
                continue;
            }
            try {
                const definition = await self.store.get(id);
                if (definition) {
                    loaded.push(self.createTab(definition, true));
                }
            } catch {
                // A deleted or unreachable document must not block the others.
            }
        }
        if (!loaded.length) {
            return false;
        }
        self.workflowTabs = loaded;
        const active = loaded.find(tab => tab.id === activeId) || loaded[0];
        self.setActiveTab(active);
        self.emitTabs();
        return true;
    }

    private createTab(definition: VisualWorkflowDefinition, persisted = false): WorkflowDocumentTab {
        const raw = new WorkflowDesigner({
            registry: this.registry,
            service: this.service,
            definition
        });
        const designer = this.reactiveEffect ? reactive(raw, this.reactiveEffect) : raw;
        if (persisted) {
            void this.loadExecutionHistory(designer);
        }
        return { id: designer.definition.id, designer, persisted };
    }

    /**
     * Load persisted runs for an opened document. History is optional: hosts
     * without an execution store keep the current-session run chips only.
     */
    private async loadExecutionHistory(designer: WorkflowDesigner): Promise<void> {
        const store = this.store;
        if (typeof store?.listExecutions !== 'function') {
            return;
        }
        try {
            const history = await store.listExecutions(designer.definition.id, 20);
            if (history?.length) {
                designer.setExecutionHistory(history);
            }
        } catch {
            // Execution history is diagnostic only; never block opening a document.
        }
    }

    private nextWorkflowId(): string {
        let id: string;
        do {
            id = `workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        } while (this.workflowTabs.some(tab => tab.id === id));
        return id;
    }

    private setActiveTab(tab: WorkflowDocumentTab): void {
        this.clearAutosaveTimer();
        this.activeTabId = tab.id;
        this.designer = tab.designer;
        this.saveState = tab.designer.dirty ? 'dirty' : 'saved';
        this.tabSourceCache = undefined;
        this.tabVersion += 1;
    }

    private activeTab(): WorkflowDocumentTab | undefined {
        return this.workflowTabs.find(tab => tab.id === this.activeTabId);
    }

    private async activateWorkflowTab(id: string): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const tab = self.workflowTabs.find(item => item.id === id);
        if (!tab || tab.id === self.activeTabId) {
            return;
        }
        await self.persistActiveTab();
        self.setActiveTab(tab);
        self.emitTabs();
    }

    private async closeWorkflowTab(id: string): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const index = self.workflowTabs.findIndex(tab => tab.id === id);
        if (index < 0) {
            return;
        }
        const [tab] = self.workflowTabs.splice(index, 1);
        if (self.autosave && tab.designer.dirty) {
            try {
                await self.saveTab(tab);
            } catch {
                // Unsaved closure is discarded only after a failed autosave;
                // the error is surfaced through the normal save state.
            }
        }
        if (self.activeTabId === id) {
            const next = self.workflowTabs[Math.min(index, self.workflowTabs.length - 1)];
            if (next) {
                self.setActiveTab(next);
            } else {
                await self.createWorkflowTab();
            }
        }
        self.emitTabs();
    }

    private async persistActiveTab(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const tab = self.activeTab();
        if (self.autosave && tab?.designer.dirty) {
            await self.saveTab(tab);
        }
    }

    private async saveTab(tab: WorkflowDocumentTab): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        await tab.designer.saveTo(self.store);
        tab.persisted = true;
        self.syncTabId(tab);
        self.emitTabs();
        if (tab === self.activeTab()) {
            self.lastAutosaveAt = Date.now();
            self.unsavedSince = undefined;
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
        }
    }

    private syncActiveTabId(): void {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const tab = self.activeTab();
        if (!tab) {
            return;
        }
        tab.id = self.designer.definition.id;
        self.activeTabId = tab.id;
        self.emitTabs();
    }

    private syncTabId(tab: WorkflowDocumentTab): void {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const previousId = tab.id;
        const nextId = tab.designer.definition.id;
        if (previousId === nextId) {
            return;
        }
        tab.id = nextId;
        if (self.activeTabId === previousId) {
            self.activeTabId = nextId;
        }
        self.emitTabs();
    }

    private emitTabs(): void {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.tabSourceCache = undefined;
        self.tabVersion += 1;
        const persisted = self.workflowTabs.filter(tab => tab.persisted);
        const active = self.activeTab();
        self.tabChangeAction?.({
            openIds: persisted.map(tab => tab.id),
            activeId: active?.persisted ? active.id : persisted[0]?.id
        });
    }

    setTheme(theme: ThemeName): void {
        this.theme = isThemeName(theme) ? theme : 'light';
        const doc = this.documentRef || (globalThis as { document?: Document }).document;
        applyThemeToDocument(doc, this.theme);
        this.themeChangeAction?.(this.themeName);
    }

    get isZh(): boolean {
        return this.localeValue === 'zh-CN';
    }

    get renameTitle(): string { return this.t('renameTitle', 'Rename workflow'); }
    get renamePlaceholder(): string { return this.t('renamePlaceholder', 'Workflow name'); }
    get renameConfirmLabel(): string { return this.t('renameConfirm', 'Rename'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(this.translator, this.localeValue, `workflow.ui.${key}`, fallback);
    }

    readonly clearAutosaveTimer = (): void => {
        if (this.autosaveTimer !== undefined) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = undefined;
        }
    };

    /** Mark the document dirty and schedule an autosave when enabled. */
    readonly scheduleAutosave = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.designer?.dirty) {
            return;
        }
        if (self.saveState !== 'saving') {
            self.saveState = 'dirty';
        }
        if (!self.autosave) {
            return;
        }
        const now = Date.now();
        if (self.unsavedSince === undefined) {
            self.unsavedSince = now;
        }
        const quiet = Math.max(0, Number(self.autosaveDelay) || 0);
        const minInterval = Math.max(0, Number(self.autosaveMinInterval) || 0);
        const maxDelay = Math.max(quiet, Number(self.autosaveMaxDelay) || quiet);
        const sinceSave = self.lastAutosaveAt ? now - self.lastAutosaveAt : minInterval;
        const sinceFirstEdit = now - self.unsavedSince;
        // Wait for quiet, but never sooner than `autosaveMinInterval` after the
        // previous write; keep the backlog bounded by `autosaveMaxDelay`.
        const delay = Math.min(
            Math.max(quiet, minInterval - sinceSave),
            Math.max(0, maxDelay - sinceFirstEdit)
        );
        self.clearAutosaveTimer();
        self.autosaveTimer = setTimeout(() => {
            self.autosaveTimer = undefined;
            void self.performAutosave();
        }, delay);
    };

    private async performAutosave(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.autosave || !self.designer.dirty || self.autosaveInFlight) {
            return;
        }
        self.autosaveInFlight = true;
        self.lastAutosaveAt = Date.now();
        self.saveState = 'saving';
        try {
            await self.designer.saveTo(self.store);
            self.unsavedSince = undefined;
            const active = self.activeTab();
            const wasPersisted = !!active?.persisted;
            if (active) {
                active.persisted = true;
            }
            // The tab list only changes when a document is first persisted.
            if (!wasPersisted) {
                self.emitTabs();
            }
            self.libraryError = '';
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
        } catch (error) {
            self.saveState = 'error';
            self.libraryError = (error as Error).message;
        } finally {
            self.autosaveInFlight = false;
            if (self.designer.dirty) {
                self.scheduleAutosave();
            }
        }
    }

    private bindGlobalShortcuts(): void {
        const doc = this.documentRef;
        if (!doc?.addEventListener || this.keyHandler) {
            return;
        }
        this.keyHandler = (event: any) => this.handleGlobalKey(event);
        doc.addEventListener('keydown', this.keyHandler, true);
    }

    private handleGlobalKey(event: any): void {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const key = String(event?.key || '');
        const meta = !!(event?.ctrlKey || event?.metaKey);
        const target = event?.target;
        const tag = String(target?.tagName || '').toLowerCase();
        const editing = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable;

        if (meta && (key === 's' || key === 'S')) {
            event.preventDefault();
            void self.saveWorkflow();
            return;
        }
        if (meta && (key === 'o' || key === 'O')) {
            event.preventDefault();
            void self.openLibrary();
            return;
        }
        if (meta && key === 'Enter') {
            event.preventDefault();
            if (!self.designer.running && self.designer.nodes.length) {
                self.toolbarAction('run');
            }
            return;
        }
        if (!editing && (key === '?' || key === 'F1')) {
            event.preventDefault();
            self.preview?.toggleShortcuts();
            return;
        }
        if (key === 'Escape' && self.preview?.showShortcuts) {
            event.preventDefault();
            self.preview?.closeShortcuts();
        }
    }

    readonly toolbarAction = (action: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (action.startsWith('language:')) {
            const locale = action.slice('language:'.length);
            if (locale === 'en' || locale === 'zh-CN') {
                self.changeLocale(locale);
            }
            return;
        }
        if (action.startsWith('theme:')) {
            const theme = action.slice('theme:'.length);
            if (theme === 'light' || theme === 'dark' || theme === 'solarized' || theme === 'high-contrast') {
                self.setTheme(theme);
            }
            return;
        }
        if (action === 'rename') {
            self.openRename();
            return;
        }
        if (action === 'save') {
            void self.saveWorkflow();
            return;
        }
        if (action === 'open-library') {
            void self.openLibrary();
            return;
        }
        self.preview?.handleToolbarAction(action);
    };

    readonly previewHostAction = (action: string): void => {
        this.toolbarAction(action);
    };

    readonly fitView = (): void => {
        this.preview?.fitView();
    };

    // Backwards-compatible delegates. The workspace implementation lives in
    // WorkflowDesignerPreviewComponent; the full shell still exposes the same
    // surface used by hosts, tests and the designer entry page.
    get canvasModel() { return this.preview?.canvasModel; }
    get inspectorModel() { return this.preview?.inspectorModel; }
    get statusModel() { return this.preview?.statusModel; }
    get codeSuggestions() { return this.preview?.codeSuggestions ?? []; }
    get saveStateLabel() { return this.preview?.saveStateLabel ?? ''; }
    get showLogs() { return !!this.preview?.showLogs; }
    set showLogs(value: boolean) { if (this.preview) this.preview.showLogs = value; }
    get jsonText() { return this.preview?.jsonText ?? ''; }
    set jsonText(value: string) { if (this.preview) this.preview.jsonText = value; }
    toggleJson(): void { this.preview?.toggleJson(); }
    handleCanvas(payload: any): void { this.preview?.handleCanvas(payload); }

    toggleShortcuts(): void {
        this.preview?.toggleShortcuts();
    }

    readonly openLibrary = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            self.libraryItems = await self.designer.listSaved(self.store);
            self.libraryError = '';
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
        self.showLibrary = true;
    };

    /** Open the rename overlay for the active workflow document. */
    readonly openRename = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.renameValue = self.designer?.definition?.name || '';
        self.renameError = '';
        self.showRename = true;
    };

    readonly renameInput = (event: any): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.renameValue = String(event?.target?.value ?? '');
        self.renameError = '';
    };

    readonly renameKey = (event: any): void => {
        const key = String(event?.key || '');
        if (key === 'Enter') {
            event?.preventDefault?.();
            this.commitRename();
            return;
        }
        if (key === 'Escape') {
            event?.preventDefault?.();
            this.cancelRename();
        }
    };

    readonly cancelRename = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showRename = false;
        self.renameError = '';
    };

    readonly commitRename = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const name = String(self.renameValue || '').trim();
        if (!name) {
            self.renameError = self.t('renameEmpty', 'Enter a workflow name');
            return;
        }
        const tab = self.activeTab();
        if (!tab) {
            self.showRename = false;
            return;
        }
        tab.designer.renameWorkflow(name);
        self.showRename = false;
        self.renameError = '';
        // The tab label and toolbar title derive from the definition name, so
        // rebuild the cached tab source and let autosave persist the rename.
        self.emitTabs();
        self.scheduleAutosave();
    };

    readonly saveWorkflow = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.clearAutosaveTimer();
        self.saveState = 'saving';
        try {
            await self.designer.saveTo(self.store);
            const active = self.activeTab();
            if (active) {
                active.persisted = true;
            }
            self.syncActiveTabId();
            self.libraryError = '';
            self.lastAutosaveAt = Date.now();
            self.unsavedSince = undefined;
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
            await self.refreshLibrary();
        } catch (error) {
            self.saveState = 'error';
            self.libraryError = (error as Error).message;
        }
    };

    readonly saveWorkflowAs = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.clearAutosaveTimer();
        self.saveState = 'saving';
        try {
            await self.designer.saveTo(self.store, {
                as: true,
                name: `${self.designer.definition.name} copy`
            });
            const active = self.activeTab();
            if (active) {
                active.persisted = true;
            }
            self.syncActiveTabId();
            self.libraryError = '';
            self.lastAutosaveAt = Date.now();
            self.unsavedSince = undefined;
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
            await self.refreshLibrary();
        } catch (error) {
            self.saveState = 'error';
            self.libraryError = (error as Error).message;
        }
    };

    readonly loadWorkflow = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const existing = self.workflowTabs.find(tab => tab.id === id);
        if (existing) {
            try {
                const definition = await self.store.get(id);
                if (!definition) {
                    self.libraryError = `${self.t('notFound', 'Workflow not found')}: ${id}`;
                    return;
                }
                existing.designer.load(definition);
                self.setActiveTab(existing);
                self.syncActiveTabId();
                self.clearAutosaveTimer();
                self.libraryError = '';
                self.showLibrary = false;
            } catch (error) {
                self.libraryError = (error as Error).message;
            }
            return;
        }
        const opened = await self.openWorkflowTab(id);
        if (opened) {
            self.clearAutosaveTimer();
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
            self.libraryError = '';
            self.showLibrary = false;
        }
    };

    readonly deleteWorkflow = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            if (self.workflowTabs.some(tab => tab.id === id)) {
                await self.closeWorkflowTab(id);
            }
            await self.designer.removeSaved(self.store, id);
            await self.refreshLibrary();
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
    };

    readonly closeLibrary = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showLibrary = false;
    };

    private async refreshLibrary(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.libraryItems = await self.designer.listSaved(self.store);
    }
}

export { createDefaultWorkflowDefinition };
