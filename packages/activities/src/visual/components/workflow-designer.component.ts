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
import { diffWorkflowDefinitions, WorkflowDiffResult } from '../workflow-diff';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    WorkflowRelease,
    WorkflowVersionSummary,
    createDefaultWorkflowDefinitionStore,
    WorkflowMetrics
} from '../workflow-store';
import { installWorkflowDesignerStyles } from './workflow-designer.styles';
import { WorkflowDesignerPreviewComponent } from './workflow-designer-preview.component';
import { WORKFLOW_ACTION_BUS } from '../workflow-action-bus';
import { WorkflowPluginManager, WorkflowPluginManifest, WorkflowPluginNodeManifest } from '../../plugins/types';

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
            :openWorkflowAction="openReferencedWorkflow"
            :hiddenActions="previewHiddenActions"
            :autosaveAction="scheduleAutosave"></workflow-designer-preview>
        <workflow-library :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
        <div class="workflow-publish" v-if="showPublish">
            <div class="workflow-publish-panel">
                <div class="workflow-publish-head">
                    <span class="workflow-publish-title">{{publishTitle}}</span>
                    <button class="workflow-btn workflow-publish-close" type="button"
                        [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancelPublish">✕</button>
                </div>
                <div class="workflow-publish-name">{{designer.definition.name}}</div>
                <div class="workflow-publish-meta">{{publishMeta}}</div>
                <div class="workflow-publish-hint">{{publishHint}}</div>
                <div class="workflow-publish-error" v-if="publishError">{{publishError}}</div>
                <div class="workflow-publish-actions">
                    <button class="workflow-btn" type="button" @click="cancelPublish">{{cancelLabel}}</button>
                    <button class="workflow-btn workflow-btn-primary workflow-publish-confirm" type="button"
                        @click="confirmPublish">{{publishConfirmLabel}}</button>
                </div>
            </div>
        </div>
        <workflow-version-panel :items="versionItems" :release="versionRelease"
            :visible="showVersions" :locale="locale" :error="versionError"
            :diff="versionDiff" :diffVersion="versionDiffVersion"
            :restoreAction="restoreVersion" :compareAction="compareVersion"
            :releaseAction="releaseVersion"
            :closeDiffAction="closeVersionDiff" :closeAction="closeVersions"></workflow-version-panel>
        <div class="workflow-publish workflow-metrics" v-if="showMetrics">
            <div class="workflow-publish-panel workflow-metrics-panel">
                <div class="workflow-publish-head">
                    <span class="workflow-publish-title">{{metricsTitle}}</span>
                    <button class="workflow-btn workflow-publish-close" type="button"
                        [aria-label]="closeLabel" [title]="closeLabel" @click="closeMetrics">✕</button>
                </div>
                <div class="workflow-metrics-error" v-if="metricsError">{{metricsError}}</div>
                <div class="workflow-metrics-summary" v-if="metricsData">
                    <div class="workflow-metrics-stat">
                        <span>{{metricsRunsLabel}}</span><strong>{{metricsData.runs}}</strong>
                    </div>
                    <div class="workflow-metrics-stat">
                        <span>{{metricsSuccessLabel}}</span><strong>{{metricsSuccessRate}}%</strong>
                    </div>
                    <div class="workflow-metrics-stat">
                        <span>{{metricsAvgLabel}}</span><strong>{{metricsData.avgDurationMs}} ms</strong>
                    </div>
                    <div class="workflow-metrics-stat">
                        <span>{{metricsLastLabel}}</span><strong>{{metricsData.lastStatus || '-'}}</strong>
                    </div>
                </div>
                <div class="workflow-metrics-nodes" v-if="metricsData && metricsData.nodes.length">
                    <div class="workflow-metrics-node" v-for="node in metricsData.nodes" data-node-id="{{node.nodeId}}">
                        <span class="workflow-metrics-node-id">{{node.nodeId}}</span>
                        <span>{{node.runs}} runs</span>
                        <span v-if="node.failed">{{node.failed}} failed</span>
                        <span>{{node.avgDurationMs}} ms</span>
                    </div>
                </div>
                <div class="workflow-publish-actions">
                    <button class="workflow-btn" type="button" @click="closeMetrics">{{closeLabel}}</button>
                </div>
            </div>
        </div>
        <div class="workflow-publish workflow-settings" v-if="showSettings">
            <div class="workflow-publish-panel workflow-settings-panel">
                <div class="workflow-publish-head">
                    <span class="workflow-publish-title">{{settingsTitle}}</span>
                    <button class="workflow-btn workflow-publish-close" type="button"
                        [aria-label]="closeLabel" [title]="closeLabel" @click="closeSettings">✕</button>
                </div>
                <label class="workflow-group-field">
                    <span>{{descriptionLabel}}</span>
                    <textarea class="workflow-settings-description" rows="3"
                        [value]="settingsDescription" @input="settingsDescriptionInput"></textarea>
                </label>
                <label class="workflow-group-field">
                    <span>{{runTimeoutLabel}}</span>
                    <input class="workflow-settings-timeout" type="number" min="0" step="100"
                        [value]="settingsTimeout" @input="settingsTimeoutInput" />
                </label>
                <div class="workflow-publish-error" v-if="settingsError">{{settingsError}}</div>
                <div class="workflow-publish-actions">
                    <button class="workflow-btn" type="button" @click="closeSettings">{{cancelLabel}}</button>
                    <button class="workflow-btn workflow-btn-primary workflow-settings-save" type="button"
                        @click="saveSettings">{{saveLabel}}</button>
                </div>
            </div>
        </div>
        <div class="workflow-publish workflow-plugins" v-if="showPlugins">
            <div class="workflow-publish-panel workflow-plugins-panel">
                <div class="workflow-publish-head">
                    <span class="workflow-publish-title">{{pluginsTitle}}</span>
                    <button class="workflow-btn workflow-publish-close" type="button"
                        [aria-label]="closePluginsLabel" [title]="closePluginsLabel" @click="closePlugins">✕</button>
                </div>
                <div class="workflow-plugins-error" v-if="pluginError">{{pluginError}}</div>
                <div class="workflow-plugins-list" v-if="pluginItems.length">
                    <div class="workflow-plugin-row" v-for="item in pluginItems" data-plugin-id="{{item.id}}">
                        <div class="workflow-plugin-main">
                            <span class="workflow-plugin-title">{{item.name}}</span>
                            <span class="workflow-plugin-version" v-if="item.version">v{{item.version}}</span>
                            <span class="workflow-plugin-installed" v-if="item.installed">{{pluginInstalledLabel}}</span>
                            <div class="workflow-plugin-description" v-if="item.description">{{item.description}}</div>
                            <div class="workflow-plugin-nodes">{{pluginNodeCount(item)}}</div>
                        </div>
                        <button class="workflow-btn" type="button"
                            [disabled]="pluginBusyId === item.id"
                            @click="togglePlugin(item)">
                            {{item.installed ? pluginUninstallLabel : pluginInstallLabel}}
                        </button>
                    </div>
                </div>
                <div class="workflow-plugins-empty" v-else>{{pluginsEmptyLabel}}</div>
            </div>
        </div>
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
    /** Optional palette-manager bridge; hosts without it keep the static palette. */
    @Attribute() pluginManager?: WorkflowPluginManager;
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
    showVersions = false;
    showPublish = false;
    publishError = '';
    showMetrics = false;
    metricsData?: WorkflowMetrics;
    metricsError = '';
    showSettings = false;
    settingsDescription = '';
    settingsTimeout = '';
    settingsError = '';
    showPlugins = false;
    pluginItems: Array<WorkflowPluginManifest & { installed: boolean }> = [];
    pluginError = '';
    pluginBusyId = '';
    versionItems: WorkflowVersionSummary[] = [];
    versionRelease: WorkflowRelease | undefined = undefined;
    versionDiff: WorkflowDiffResult | undefined = undefined;
    versionDiffVersion: number | undefined = undefined;
    versionError = '';
    /** Set in onInit to the reactive component proxy (arrow callbacks capture the raw instance). */
    private selfRef?: WorkflowDesignerComponent;
    @NoReactive() private autosaveTimer?: any;
    @NoReactive() private autosaveInFlight = false;
    @NoReactive() private lastAutosaveAt = 0;
    @NoReactive() private unsavedSince?: number;
    @NoReactive() private keyHandler?: (event: any) => void;
    @NoReactive() private documentRef?: any;
    @NoReactive() private actionBusUnsubscribe?: () => void;
    @NoReactive() private readonly subflowParents = new Map<string, string>();
    private subflowVersion = 0;

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
        this.service?.setDefinitionResolver?.(id => this.store.get(id));
        this.actionBusUnsubscribe = WORKFLOW_ACTION_BUS.subscribe(
            (action: string) => this.toolbarAction(action)
        );
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
        this.actionBusUnsubscribe?.();
        this.actionBusUnsubscribe = undefined;
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
        const model = this.preview?.toolbarModel as WorkflowToolbarModel;
        if (!model) {
            return model;
        }
        // Read the version so breadcrumb menu changes are re-rendered after a
        // subflow tab is opened.
        void this.subflowVersion;
        const parent = this.subflowParents.get(this.designer.definition.id);
        return parent ? { ...model, subflowParent: parent } : model;
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

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        return translateWorkflow(this.translator, this.localeValue, `workflow.ui.${key}`, fallback, params);
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

        // Modal overlays own the keyboard: only their own dismiss keys apply, so
        // Delete/undo never mutate the canvas behind a confirmation dialog.
        if (self.showPublish) {
            if (key === 'Escape') {
                event.preventDefault();
                self.cancelPublish();
            }
            return;
        }
        if (self.showVersions) {
            if (key === 'Escape') {
                event.preventDefault();
                self.closeVersions();
            }
            return;
        }

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
        // Toolbar menus and shortcuts can run while an inspector edit is still
        // inside its burst delay; commit it before the command reads the document.
        self.preview?.inspector?.formBlur();
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
        if (action === 'publish') {
            void self.openPublish();
            return;
        }
        if (action === 'versions') {
            void self.openVersions();
            return;
        }
        if (action === 'clear-runs') {
            void self.clearRunHistory();
            return;
        }
        if (action === 'open-library') {
            void self.openLibrary();
            return;
        }
        if (action === 'back-subflow') {
            const parent = self.subflowParents.get(self.designer.definition.id);
            if (parent) {
                void self.openWorkflowTab(parent);
            }
            return;
        }
        if (action === 'settings') {
            self.openSettings();
            return;
        }
        if (action === 'metrics') {
            void self.openMetrics();
            return;
        }
        if (action === 'plugins') {
            void self.openPlugins();
            return;
        }
        self.preview?.handleToolbarAction(action);
    };

    readonly openReferencedWorkflow = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const parent = self.designer?.definition.id;
        const opened = await self.openWorkflowTab(id);
        if (opened && parent && parent !== id) {
            self.subflowParents.set(id, parent);
            self.subflowVersion += 1;
        } else if (!opened) {
            self.designer.error = self.libraryError || self.t(
                'notFound',
                'Workflow not found'
            ) + `: ${id}`;
        }
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

    get pluginsTitle(): string { return this.t('pluginsTitle', 'Workflow plugins'); }
    get closePluginsLabel(): string { return this.t('close', 'Close'); }
    get pluginInstallLabel(): string { return this.t('pluginInstall', 'Install'); }
    get pluginUninstallLabel(): string { return this.t('pluginUninstall', 'Uninstall'); }
    get pluginInstalledLabel(): string { return this.t('pluginInstalled', 'Installed'); }
    get pluginsEmptyLabel(): string { return this.t('pluginsEmpty', 'No plugins are available on this host.'); }

    pluginNodeCount(item: WorkflowPluginManifest): string {
        return this.t('pluginNodeCount', '{count} nodes', { count: item.nodes?.length || 0 });
    }

    readonly openPlugins = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showPlugins = true;
        self.pluginError = '';
        await self.refreshPlugins();
    };

    readonly closePlugins = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showPlugins = false;
        self.pluginError = '';
    };

    private async refreshPlugins(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.pluginManager) {
            self.pluginItems = [];
            self.pluginError = self.t(
                'pluginHostMissing',
                'This host does not expose a plugin manager.'
            );
            return;
        }
        try {
            const list = await self.pluginManager.list();
            const installed = new Set((list.installed || []).map(plugin => plugin.id));
            const merged = new Map<string, WorkflowPluginManifest & { installed: boolean }>();
            (list.available || []).forEach(plugin => {
                merged.set(plugin.id, { ...plugin, installed: installed.has(plugin.id) });
            });
            (list.installed || []).forEach(plugin => {
                merged.set(plugin.id, { ...plugin, installed: true });
            });
            self.pluginItems = Array.from(merged.values())
                .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
        } catch (error) {
            self.pluginError = (error as Error).message;
        }
    }

    readonly togglePlugin = (item: WorkflowPluginManifest & { installed: boolean }): void => {
        if (!item) {
            return;
        }
        if (item.installed) {
            void this.uninstallPlugin(item.id);
        } else {
            void this.installPlugin(item.id);
        }
    };

    readonly installPlugin = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.pluginManager || !id) {
            return;
        }
        self.pluginBusyId = id;
        self.pluginError = '';
        try {
            const result = await self.pluginManager.install(id);
            if (result.plugin) {
                self.registerPluginNodes(result.plugin);
            }
            await self.refreshPlugins();
        } catch (error) {
            self.pluginError = (error as Error).message;
        } finally {
            self.pluginBusyId = '';
        }
    };

    readonly uninstallPlugin = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.pluginManager || !id) {
            return;
        }
        const item = self.pluginItems.find(plugin => plugin.id === id);
        self.pluginBusyId = id;
        self.pluginError = '';
        try {
            await self.pluginManager.uninstall(id);
            if (item) {
                self.unregisterPluginNodes(item);
            }
            await self.refreshPlugins();
        } catch (error) {
            self.pluginError = (error as Error).message;
        } finally {
            self.pluginBusyId = '';
        }
    };

    private registerPluginNodes(plugin: WorkflowPluginManifest): void {
        const registry = this.designer?.registry || this.registry;
        (plugin.nodes || []).forEach(node => registry.register(node as any));
    }

    private unregisterPluginNodes(plugin: WorkflowPluginManifest): void {
        const registry = this.designer?.registry || this.registry;
        (plugin.nodes || []).forEach(node => registry.unregister(node.type));
    }

    /** Open the rename overlay for the active workflow document. */
    get metricsTitle(): string { return this.t('metrics', 'Execution metrics'); }
    get metricsRunsLabel(): string { return this.t('metricsRuns', 'Runs'); }
    get metricsSuccessLabel(): string { return this.t('metricsSuccess', 'Success'); }
    get metricsAvgLabel(): string { return this.t('metricsAvg', 'Average'); }
    get metricsLastLabel(): string { return this.t('metricsLast', 'Last status'); }
    get metricsSuccessRate(): number {
        const runs = this.metricsData?.runs || 0;
        return runs ? Math.round(((this.metricsData?.succeeded || 0) / runs) * 100) : 0;
    }

    readonly openMetrics = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.metricsError = '';
        self.metricsData = undefined;
        self.showMetrics = true;
        if (!self.store?.getMetrics) {
            self.metricsError = self.t('metricsUnavailable', 'This host does not expose execution metrics.');
            return;
        }
        try {
            self.metricsData = await self.store.getMetrics(self.designer.definition.id, 200);
            if (!self.metricsData) {
                self.metricsError = self.t('metricsUnavailable', 'This host does not expose execution metrics.');
            }
        } catch (error) {
            self.metricsError = (error as Error).message;
        }
        self.saveState = self.saveState;
    };

    readonly closeMetrics = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showMetrics = false;
        self.metricsError = '';
        self.metricsData = undefined;
    };

    get settingsTitle(): string { return this.t('settings', 'Workflow settings'); }
    get descriptionLabel(): string { return this.t('description', 'Description'); }
    get runTimeoutLabel(): string { return this.t('runTimeout', 'Run timeout'); }
    get saveLabel(): string { return this.t('save', 'Save'); }

    readonly openSettings = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.settingsDescription = self.designer?.definition.description || '';
        self.settingsTimeout = String(self.designer?.defaultTimeout || 0);
        self.settingsError = '';
        self.showSettings = true;
    };

    readonly closeSettings = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showSettings = false;
        self.settingsError = '';
    };

    readonly settingsDescriptionInput = (event: any): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.settingsDescription = String(event?.target?.value ?? '');
        self.settingsError = '';
    };

    readonly settingsTimeoutInput = (event: any): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.settingsTimeout = String(event?.target?.value ?? '0');
        self.settingsError = '';
    };

    readonly saveSettings = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.designer) {
            return;
        }
        const timeout = Number(self.settingsTimeout || 0);
        if (!Number.isFinite(timeout) || timeout < 0) {
            self.settingsError = self.t('timeoutInvalid', 'Enter a timeout of 0 or more milliseconds');
            return;
        }
        self.designer.updateSettings({
            description: self.settingsDescription,
            timeout
        });
        self.showSettings = false;
        self.settingsError = '';
        self.scheduleAutosave();
    };

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
        self.preview?.inspector?.formBlur();
        self.clearAutosaveTimer();
        self.saveState = 'saving';
        try {
            // Explicit saves record a version when the store supports it;
            // autosave keeps writing the draft only.
            await self.designer.saveTo(self.store, { version: true });
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

    /**
     * Publish the active document. Run and webhook entry points execute the
     * released version from then on; the draft keeps autosaving.
     */
    readonly publishWorkflow = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.preview?.inspector?.formBlur();
        self.clearAutosaveTimer();
        self.saveState = 'saving';
        try {
            const release = await self.designer.publishTo(self.store);
            if (!release) {
                self.saveState = self.designer.dirty ? 'dirty' : 'saved';
                return;
            }
            const active = self.activeTab();
            if (active) {
                active.persisted = true;
            }
            self.syncActiveTabId();
            self.libraryError = '';
            self.lastAutosaveAt = Date.now();
            self.unsavedSince = undefined;
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
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

    get publishTitle(): string { return this.t('publishTitle', 'Publish workflow'); }
    get publishConfirmLabel(): string { return this.t('publish', 'Publish'); }
    get publishHint(): string {
        return this.t(
            'publishHint',
            'Run and webhook entry points will execute this version. Later draft edits stay unpublished.'
        );
    }
    get publishMeta(): string {
        const definition = this.designer.definition;
        const nodes = definition.nodes?.length || 0;
        const connections = definition.connections?.length || 0;
        const base = this.isZh
            ? `${nodes} 个节点 · ${connections} 条连接`
            : `${nodes} nodes · ${connections} connections`;
        const release = this.versionRelease;
        if (!release) {
            return base;
        }
        return this.isZh
            ? `${base} · 当前发布 v${release.version}`
            : `${base} · currently v${release.version}`;
    }

    /**
     * Ask before publishing: it changes what production entry points execute,
     * so a mis-click must not be enough.
     */
    readonly openPublish = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.preview?.inspector?.formBlur();
        const validation = self.designer.validate();
        if (!validation.valid) {
            self.designer.error = validation.errors.join('; ');
            return;
        }
        self.publishError = '';
        try {
            const store = self.store;
            if (typeof store?.listVersions === 'function') {
                const list = await store.listVersions(self.designer.definition.id, 1);
                self.versionRelease = list.release;
            }
        } catch {
            // Release info is advisory; the publish request validates again.
        }
        self.showPublish = true;
    };

    readonly cancelPublish = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showPublish = false;
        self.publishError = '';
    };

    readonly confirmPublish = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showPublish = false;
        await self.publishWorkflow();
        if (self.saveState === 'error') {
            self.publishError = self.libraryError || self.designer.error || '';
        }
    };

    /** Open the version history overlay for the active document. */
    readonly openVersions = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showVersions = true;
        self.versionError = '';
        const store = self.store;
        if (typeof store?.listVersions !== 'function') {
            self.versionItems = [];
            self.versionRelease = undefined;
            self.versionError = self.t('versionUnsupported', 'This host does not keep version history');
            return;
        }
        try {
            const list = await store.listVersions(self.designer.definition.id);
            self.versionItems = list.items || [];
            self.versionRelease = list.release;
        } catch (error) {
            self.versionItems = [];
            self.versionError = (error as Error).message;
        }
    };

    readonly closeVersions = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showVersions = false;
        self.versionDiff = undefined;
        self.versionDiffVersion = undefined;
    };

    /** Compare a snapshot with the current draft and show the structural diff. */
    readonly compareVersion = async (version: number): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const store = self.store;
        if (typeof store?.getVersion !== 'function') {
            return;
        }
        try {
            const snapshot = await store.getVersion(self.designer.definition.id, version);
            if (!snapshot) {
                self.versionError = self.t('versionMissing', 'Version not found');
                return;
            }
            self.versionError = '';
            self.versionDiffVersion = version;
            self.versionDiff = diffWorkflowDefinitions(snapshot, self.designer.definition);
        } catch (error) {
            self.versionError = (error as Error).message;
        }
    };

    /** Make an existing version the release pointer without touching the draft. */
    readonly releaseVersion = async (version: number): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            const release = await self.designer.releaseVersion(self.store, version);
            if (!release) {
                self.versionError = self.designer.error || '';
                return;
            }
            self.versionRelease = release;
            self.versionError = '';
            self.versionItems = self.versionItems.map(item => item.version === version
                ? { ...item, kind: 'publish' }
                : item);
        } catch (error) {
            self.versionError = (error as Error).message;
        }
    };

    /** Clear persisted run history for the open document. */
    readonly clearRunHistory = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const store = self.store;
        if (typeof store?.clearExecutions !== 'function') {
            return;
        }
        try {
            await store.clearExecutions(self.designer.definition.id);
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
    };

    readonly closeVersionDiff = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.versionDiff = undefined;
        self.versionDiffVersion = undefined;
    };

    /** Copy a snapshot back into the editable draft (the release pointer stays). */
    readonly restoreVersion = async (version: number): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const store = self.store;
        if (typeof store?.restoreVersion !== 'function') {
            return;
        }
        try {
            const definition = await store.restoreVersion(self.designer.definition.id, version);
            if (!definition) {
                self.versionError = self.t('versionMissing', 'Version not found');
                return;
            }
            self.designer.load(definition);
            self.versionError = '';
            self.showVersions = false;
            self.versionDiff = undefined;
            self.versionDiffVersion = undefined;
            self.saveState = self.designer.dirty ? 'dirty' : 'saved';
            self.syncActiveTabId();
        } catch (error) {
            self.versionError = (error as Error).message;
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
