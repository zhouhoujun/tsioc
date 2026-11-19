import { Attribute, batchReactiveUpdates, Component, Computed, ElementRef, NoReactive, OnDestroy, ReactiveEffect, ViewChild, noReact, reactive } from '@tsdi/components';
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
import { ToastService } from '@tsdi/components/common/toast';
import { WorkflowDesignerToasts } from './workflow-designer-toasts';
import { WorkflowAuditPanelComponent } from './workflow-audit-panel';
import { WorkflowCredentialPanelComponent } from './workflow-credential-panel';
import { WorkflowMetricsPanelComponent } from './workflow-metrics-panel';
import { WorkflowDeploymentsPanelComponent } from './workflow-deployments-panel';
import { WorkflowSettingsPanelComponent } from './workflow-settings-panel';
import { WorkflowPublishPanelComponent } from './workflow-publish-panel';
import { WorkflowRenamePanelComponent } from './workflow-rename-panel';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    WorkflowRelease,
    WorkflowVersionSummary,
    createDefaultWorkflowDefinitionStore,
    WorkflowMetrics,
    WorkflowDeploymentStatus,
    WorkflowAuditEntry,
    WorkflowMetricsTrendPoint
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
            <ui-breadcrumb class="workflow-breadcrumb" v-if="subflowTrail.length"
                :items="subflowTrail" :action="openBreadcrumb"></ui-breadcrumb>
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
        <workflow-library v-if="showLibrary" :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
        <workflow-publish-panel v-if="showPublish" :workflowName="designer.definition.name"
            :meta="publishMeta" :hint="publishHint" :error="publishError" :locale="locale"
            :confirmAction="confirmPublishPressed" :cancelAction="cancelPublishPressed"></workflow-publish-panel>
        <workflow-version-panel v-if="showVersions" :items="versionItems" :release="versionRelease"
            :visible="showVersions" :locale="locale" :error="versionError"
            :diff="versionDiff" :diffVersion="versionDiffVersion"
            :restoreAction="restoreVersion" :compareAction="compareVersion"
            :releaseAction="releaseVersion"
            :closeDiffAction="closeVersionDiff" :closeAction="closeVersions"></workflow-version-panel>
        <workflow-audit-panel v-if="showAudit" :items="auditItems" :busy="auditBusy"
            :error="auditError" :locale="locale"
            :refreshAction="auditPanelRefresh" :closeAction="auditPanelClose"></workflow-audit-panel>
        <workflow-credential-panel v-if="showCredentials" :names="credentialNames"
            :busy="credentialBusy" :error="credentialError"
            :draftName="credentialName" :draftValue="credentialValue" :locale="locale"
            :nameAction="credentialNameAction" :valueAction="credentialValueAction"
            :saveAction="credentialPanelSave" :removeAction="credentialPanelRemove"
            :refreshAction="credentialPanelRefresh" :closeAction="credentialPanelClose"></workflow-credential-panel>
        <workflow-deployments-panel v-if="showDeployments" :items="deploymentItems"
            :busy="deploymentBusy" :error="deploymentError" :locale="locale"
            :startAllAction="startAllDeploymentsPressed" :stopAllAction="stopAllDeploymentsPressed"
            :toggleAction="deploymentToggleAction" :closeAction="closeDeploymentsPressed"></workflow-deployments-panel>
        <workflow-metrics-panel v-if="showMetrics" :data="metricsData" :trend="metricsTrend"
            :rate="metricsRate" :windowMs="metricsWindow" :error="metricsError" :locale="locale"
            :windowAction="setMetricsWindowAction" :closeAction="closeMetricsPressed"></workflow-metrics-panel>
        <workflow-settings-panel v-if="showSettings" :description="settingsDescription"
            :timeout="settingsTimeout" :error="settingsError" :locale="locale"
            :descriptionAction="settingsDescriptionAction" :timeoutAction="settingsTimeoutAction"
            :saveAction="saveSettingsPressed" :cancelAction="closeSettingsPressed"></workflow-settings-panel>
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
                            <ui-badge class="workflow-plugin-installed" v-if="item.installed"
                                :label="pluginInstalledLabel" tone="success" dot></ui-badge>
                            <div class="workflow-plugin-description" v-if="item.description">{{item.description}}</div>
                            <div class="workflow-plugin-nodes">{{pluginNodeCount(item)}}</div>
                        </div>
                        <ui-button className="workflow-btn" size="xs"
                            :label="item.installed ? pluginUninstallLabel : pluginInstallLabel"
                            :disabled="pluginBusyId === item.id" :action="pluginToggleAction(item)"></ui-button>
                    </div>
                </div>
                <ui-empty class="workflow-plugins-empty" v-else icon="plugin" :title="pluginsEmptyLabel"></ui-empty>
            </div>
        </div>
        <workflow-rename-panel v-if="showRename" :value="renameValue" :error="renameError"
            :locale="locale" :valueAction="renameInputAction" :keyAction="renameKeyAction"
            :confirmAction="commitRenamePressed" :cancelAction="cancelRenamePressed"></workflow-rename-panel>
        <div class="workflow-toast" v-if="toasts.enabled">
            <ui-toast-stack :items="toasts.items" :closeAction="dismissToast"></ui-toast-stack>
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
    private readonly toasts: WorkflowDesignerToasts;
    private tabSourceCache?: { key: string; source: TabBarSource };
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
    showCredentials = false;
    credentialNames: string[] = [];
    credentialName = '';
    credentialValue = '';
    credentialError = '';
    credentialBusy = false;
    showAudit = false;
    auditItems: WorkflowAuditEntry[] = [];
    auditError = '';
    auditBusy = false;
    showDeployments = false;
    deploymentItems: WorkflowDeploymentStatus[] = [];
    deploymentError = '';
    deploymentBusy = false;
    showMetrics = false;
    metricsData?: WorkflowMetrics;
    metricsTrend: WorkflowMetricsTrendPoint[] = [];
    metricsWindow = 86400000;
    metricsRate = 0;
    metricsMaxRuns = 0;
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
    /** Subflow tab -> parent workflow; replaced (not mutated) on write. */
    private subflowParents: Record<string, { id: string; name: string }> = {};

    readonly registry: WorkflowNodeRegistry;
    private readonly service?: VisualWorkflowService;

    constructor(
        @Optional() registry?: WorkflowNodeRegistry,
        @Optional() service?: VisualWorkflowService,
        @Optional() @Inject(DOCUMENT) document?: any,
        @Optional() private translator?: Translator,
        @Optional() effect?: ReactiveEffect,
        @Optional() private elementRef?: ElementRef,
        @Optional() toastService?: ToastService
    ) {
        this.toasts = new WorkflowDesignerToasts(toastService, (key, fallback, params) => this.t(key, fallback, params));
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
        // The strip lives inside this surface; drop its transient queue so a
        // remounted designer never inherits stale confirmations.
        this.toasts.clear();
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
        // `subflowParents` is replaced on write, so this read is tracked and the
        // breadcrumb updates without a manual invalidation counter.
        const parent = this.subflowParents[this.designer?.definition.id];
        return parent ? { ...model, subflowParent: parent.name || parent.id } : model;
    }

    get workflowTabSource(): TabBarSource {
        // The source object must stay stable between changes (a new object on
        // every read feeds the tab-bar loop and its parent effect), so cache it
        // against the label signature; renaming or switching a tab changes the
        // signature and the binding re-renders.
        const key = this.tabSourceKey();
        const cache = this.tabSourceCache;
        if (cache && cache.key === key) {
            return cache.source;
        }
        const labels = this.workflowTabs.map(tab => ({
            id: tab.id,
            label: tab.designer.definition.name || this.t('newWorkflow', 'New workflow'),
            active: tab.id === this.activeTabId
        }));
        const source: TabBarSource = {
            visible: true,
            items: labels,
            showCreate: true,
            createLabel: '+',
            select: id => { void this.activateWorkflowTab(id); },
            close: id => { void this.closeWorkflowTab(id); },
            create: () => { void this.createWorkflowTab(); }
        };
        this.tabSourceCache = { key, source };
        return source;
    }

    get openWorkflowCount(): number {
        return this.workflowTabs.length;
    }

    private tabSourceKey(): string {
        return `${this.activeTabId}|${this.workflowTabs
            .map(tab => `${tab.id}:${tab.designer?.definition?.name || ''}`)
            .join('|')}`;
    }

    /** Replace the tab list: array identity is what bindings observe. */
    private setWorkflowTabs(tabs: WorkflowDocumentTab[]): void {
        this.workflowTabs = tabs;
        this.tabSourceCache = undefined;
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
        batchReactiveUpdates(() => {
            self.setWorkflowTabs([...self.workflowTabs, tab]);
            self.setActiveTab(tab);
        });
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
            batchReactiveUpdates(() => {
                self.setWorkflowTabs([...self.workflowTabs, tab]);
                self.setActiveTab(tab);
            });
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
        const active = loaded.find(tab => tab.id === activeId) || loaded[0];
        batchReactiveUpdates(() => {
            self.setWorkflowTabs(loaded);
            self.setActiveTab(active);
        });
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
        self.activateDocument(tab);
        self.emitTabs();
    }

    private async closeWorkflowTab(id: string): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const index = self.workflowTabs.findIndex(tab => tab.id === id);
        if (index < 0) {
            return;
        }
        const tab = self.workflowTabs[index];
        self.setWorkflowTabs(self.workflowTabs.filter((_, position) => position !== index));
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


    /** Template-facing translate helper (bindings cannot call the private method). */
    readonly tr = (key: string, fallback: string): string => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        return self.t(key, fallback);
    };

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        return translateWorkflow(self.translator, self.localeValue, `workflow.ui.${key}`, fallback, params);
    }

    clearAutosaveTimer(): void {
        if (this.autosaveTimer !== undefined) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = undefined;
        }
    }

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
            const parent = self.subflowParents[self.designer.definition.id];
            if (parent) {
                void self.openWorkflowTab(parent.id);
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
        if (action === 'deployments') {
            void self.openDeployments();
            return;
        }
        if (action === 'audit') {
            void self.openAudit();
            return;
        }
        if (action === 'credentials') {
            void self.openCredentials();
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
            const name = (self.workflowTabs.find(tab => tab.id === parent)?.designer?.definition?.name) || parent;
            self.subflowParents = { ...self.subflowParents, [id]: { id: parent, name } };
        } else if (!opened) {
            self.designer.error = self.libraryError || self.t(
                'notFound',
                'Workflow not found'
            ) + `: ${id}`;
        }
    };

    readonly previewHostAction = (action: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.toolbarAction(action);
    };

    fitView(): void {
        this.preview?.fitView();
    }

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

    async openLibrary(): Promise<void> {
        try {
            this.libraryItems = await this.designer.listSaved(this.store);
            this.libraryError = '';
        } catch (error) {
            this.libraryError = (error as Error).message;
        }
        this.showLibrary = true;
    }

    async openPlugins(): Promise<void> {
        this.showPlugins = true;
        this.pluginError = '';
        await this.refreshPlugins();
    }

    closePlugins(): void {
        this.showPlugins = false;
        this.pluginError = '';
    }

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

    togglePlugin(item: WorkflowPluginManifest & { installed: boolean }): void {
        if (!item) {
            return;
        }
        if (item.installed) {
            void this.uninstallPlugin(item.id);
        } else {
            void this.installPlugin(item.id);
        }
    }

    async installPlugin(id: string): Promise<void> {
        if (!this.pluginManager || !id) {
            return;
        }
        this.pluginBusyId = id;
        this.pluginError = '';
        try {
            const result = await this.pluginManager.install(id);
            if (result.plugin) {
                this.registerPluginNodes(result.plugin);
            }
            await this.refreshPlugins();
            this.toasts.plugin(result.plugin?.name || id, true);
        } catch (error) {
            this.pluginError = (error as Error).message;
        } finally {
            this.pluginBusyId = '';
        }
    }

    async uninstallPlugin(id: string): Promise<void> {
        if (!this.pluginManager || !id) {
            return;
        }
        const item = this.pluginItems.find(plugin => plugin.id === id);
        this.pluginBusyId = id;
        this.pluginError = '';
        try {
            await this.pluginManager.uninstall(id);
            if (item) {
                this.unregisterPluginNodes(item);
            }
            await this.refreshPlugins();
            this.toasts.plugin(item?.name || id, false);
        } catch (error) {
            this.pluginError = (error as Error).message;
        } finally {
            this.pluginBusyId = '';
        }
    }

    private registerPluginNodes(plugin: WorkflowPluginManifest): void {
        const registry = this.designer?.registry || this.registry;
        (plugin.nodes || []).forEach(node => registry.register(node as any));
    }

    private unregisterPluginNodes(plugin: WorkflowPluginManifest): void {
        const registry = this.designer?.registry || this.registry;
        (plugin.nodes || []).forEach(node => registry.unregister(node.type));
    }

    /** Open the rename overlay for the active workflow document. */

    readonly cancelPublishPressed = (): void => (this.selfRef || this).cancelPublish();

    readonly confirmPublishPressed = (): void => {
        void (this.selfRef || this).confirmPublish();
    };

    readonly startAllDeploymentsPressed = (): void => {
        void (this.selfRef || this).startAllDeployments();
    };

    readonly stopAllDeploymentsPressed = (): void => {
        void (this.selfRef || this).stopAllDeployments();
    };

    readonly closeDeploymentsPressed = (): void => {
        void (this.selfRef || this).closeDeployments();
    };

    readonly setMetricsWindowAction = (windowMs: number): void => {
        void (this.selfRef || this).setMetricsWindow(windowMs);
    };

    readonly closeMetricsPressed = (): void => (this.selfRef || this).closeMetrics();

    readonly closeSettingsPressed = (): void => (this.selfRef || this).closeSettings();

    get pluginsTitle(): string { return this.t('pluginsTitle', 'Workflow plugins'); }
    get pluginInstallLabel(): string { return this.t('pluginInstall', 'Install'); }
    get pluginUninstallLabel(): string { return this.t('pluginUninstall', 'Uninstall'); }
    get pluginInstalledLabel(): string { return this.t('pluginInstalled', 'Installed'); }
    get pluginsEmptyLabel(): string { return this.t('pluginsEmpty', 'No plugins are available on this host.'); }
    get closePluginsLabel(): string { return this.t('close', 'Close'); }

    pluginNodeCount(item: WorkflowPluginManifest): string {
        return this.t('pluginNodeCount', '{count} nodes', { count: item.nodes?.length || 0 });
    }

    readonly closePluginsPressed = (): void => {
        void (this.selfRef || this).closePlugins();
    };

    readonly saveSettingsPressed = (): void => (this.selfRef || this).saveSettings();

    readonly cancelRenamePressed = (): void => (this.selfRef || this).cancelRename();

    readonly commitRenamePressed = (): void => (this.selfRef || this).commitRename();

    readonly deploymentToggleAction = (item: WorkflowDeploymentStatus): (() => void) =>
        () => (this.selfRef || this).toggleDeployment(item);

    readonly renameInputAction = (value: string): void => {
        (this.selfRef || this).renameInput({ target: { value } } as any);
    };

    readonly renameKeyAction = (event: any): void => {
        (this.selfRef || this).renameKey(event);
    };

    readonly settingsDescriptionAction = (value: string): void => {
        (this.selfRef || this).settingsDescriptionInput({ target: { value } } as any);
    };

    readonly settingsTimeoutAction = (value: string): void => {
        (this.selfRef || this).settingsTimeoutInput({ target: { value } } as any);
    };

    readonly dismissToast = (id: string): void => {
        (this.selfRef || this).toasts.dismiss(id);
    };

    readonly pluginToggleAction = (item: WorkflowPluginManifest & { installed: boolean }): (() => void) =>
        () => (this.selfRef || this).togglePlugin(item);

    readonly auditPanelRefresh = (): void => { void (this.selfRef || this).refreshAudit(); };

    readonly auditPanelClose = (): void => { (this.selfRef || this).closeAudit(); };

    readonly credentialNameAction = (value: string): void => {
        (this.selfRef || this).credentialNameInput({ target: { value } } as any);
    };
    readonly credentialValueAction = (value: string): void => {
        (this.selfRef || this).credentialValueInput({ target: { value } } as any);
    };

    readonly credentialPanelSave = (): void => {
        void (this.selfRef || this).saveCredential();
    };

    readonly credentialPanelRemove = (name: string): void => {
        void (this.selfRef || this).removeCredential(name);
    };

    readonly credentialPanelRefresh = (): void => {
        void (this.selfRef || this).refreshCredentials();
    };

    readonly credentialPanelClose = (): void => {
        (this.selfRef || this).closeCredentials();
    };

    async openAudit(): Promise<void> {
        this.showAudit = true;
        this.auditError = '';
        await this.refreshAudit();
    }

    closeAudit(): void {
        this.showAudit = false;
        this.auditError = '';
    }

    async refreshAudit(): Promise<void> {
        if (!this.store?.listAudit) {
            this.auditItems = [];
            this.auditError = this.t('auditUnavailable', 'This host does not expose an audit log.');
            return;
        }
        this.auditBusy = true;
        this.auditError = '';
        try {
            this.auditItems = await this.store.listAudit({
                workflowId: this.designer.definition.id,
                limit: 100
            });
        } catch (error) {
            this.auditError = (error as Error).message;
        } finally {
            this.auditBusy = false;
        }
    }


    credentialNameInput(event: any): void {
        this.credentialName = String(event?.target?.value ?? '');
        this.credentialError = '';
    }

    credentialValueInput(event: any): void {
        this.credentialValue = String(event?.target?.value ?? '');
        this.credentialError = '';
    }

    /** Swap the active document (tab switch) with one binding pass. */
    private activateDocument(tab: WorkflowDocumentTab): void {
        batchReactiveUpdates(() => this.setActiveTab(tab));
    }

    async openCredentials(): Promise<void> {
        this.showCredentials = true;
        this.credentialError = '';
        this.credentialName = '';
        this.credentialValue = '';
        await this.refreshCredentials();
    }

    closeCredentials(): void {
        this.showCredentials = false;
        this.credentialError = '';
        // The typed secret never lingers once the dialog closes.
        this.credentialValue = '';
    }

    async refreshCredentials(): Promise<void> {
        if (!this.store?.listCredentials) {
            this.credentialNames = [];
            this.credentialError = this.t('credentialsUnavailable', 'This host does not expose credential storage.');
            return;
        }
        this.credentialBusy = true;
        this.credentialError = '';
        try {
            this.credentialNames = await this.store.listCredentials();
        } catch (error) {
            this.credentialError = (error as Error).message;
        } finally {
            this.credentialBusy = false;
        }
    }

    async saveCredential(): Promise<void> {
        const name = this.credentialName.trim();
        if (!this.store?.setCredential) {
            this.credentialError = this.t('credentialsUnavailable', 'This host does not expose credential storage.');
            return;
        }
        if (!name) {
            this.credentialError = this.t('credentialNameRequired', 'Enter a credential name.');
            return;
        }
        if (!this.credentialValue) {
            this.credentialError = this.t('credentialValueRequired', 'Enter the secret value to store.');
            return;
        }
        this.credentialBusy = true;
        this.credentialError = '';
        try {
            await this.store.setCredential(name, this.credentialValue);
            this.credentialValue = '';
            this.credentialName = '';
            await this.refreshCredentials();
        } catch (error) {
            this.credentialError = (error as Error).message;
        } finally {
            this.credentialBusy = false;
        }
    }

    async removeCredential(name: string): Promise<void> {
        const id = String(name || '').trim();
        if (!id || !this.store?.removeCredential) {
            return;
        }
        this.credentialBusy = true;
        this.credentialError = '';
        try {
            await this.store.removeCredential(id);
            await this.refreshCredentials();
        } catch (error) {
            this.credentialError = (error as Error).message;
        } finally {
            this.credentialBusy = false;
        }
    }

    @Computed()
    @Computed()
    get subflowTrail(): Array<{ id?: string; label: string; disabled?: boolean }> {
        const current = this.designer?.definition;
        const parent = current ? this.subflowParents[current.id] : undefined;
        if (!parent) {
            return [];
        }
        return [
            { id: parent.id, label: parent.name || parent.id },
            { label: current.name || current.id, disabled: true }
        ];
    }

    readonly openBreadcrumb = (item: { id?: string; label: string; disabled?: boolean }): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (item?.id) {
            void self.openWorkflowTab(item.id);
        }
    };


    async openDeployments(): Promise<void> {
        this.showDeployments = true;
        this.deploymentError = '';
        await this.refreshDeployments();
    }

    closeDeployments(): void {
        this.showDeployments = false;
        this.deploymentError = '';
    }

    private async refreshDeployments(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!self.store?.listDeployments) {
            self.deploymentItems = [];
            self.deploymentError = self.t('deploymentsUnavailable', 'This host does not expose a deployment manager.');
            return;
        }
        try {
            self.deploymentItems = await self.store.listDeployments();
        } catch (error) {
            self.deploymentError = (error as Error).message;
        }
    }

    async startAllDeployments(): Promise<void> {
        if (!this.store?.startDeployments) {
            return;
        }
        this.deploymentBusy = true;
        this.deploymentError = '';
        try {
            await this.store.startDeployments();
            await this.refreshDeployments();
            this.toasts.allDeployments(true);
        } catch (error) {
            this.deploymentError = (error as Error).message;
        } finally {
            this.deploymentBusy = false;
        }
    }

    async stopAllDeployments(): Promise<void> {
        if (!this.store?.stopDeployments) {
            return;
        }
        this.deploymentBusy = true;
        this.deploymentError = '';
        try {
            await this.store.stopDeployments();
            await this.refreshDeployments();
            this.toasts.allDeployments(false);
        } catch (error) {
            this.deploymentError = (error as Error).message;
        } finally {
            this.deploymentBusy = false;
        }
    }

    async toggleDeployment(item: WorkflowDeploymentStatus): Promise<void> {
        this.deploymentBusy = true;
        this.deploymentError = '';
        try {
            if (item.running) {
                await this.store.stopDeployments?.([item.workflowId]);
            } else {
                await this.store.startDeployments?.([item.workflowId]);
            }
            await this.refreshDeployments();
            this.toasts.deployment(item.workflowId, item.running);
        } catch (error) {
            this.deploymentError = (error as Error).message;
        } finally {
            this.deploymentBusy = false;
        }
    }

    async openMetrics(): Promise<void> {
        this.metricsError = '';
        this.metricsData = undefined;
        this.metricsTrend = [];
        this.metricsRate = 0;
        this.showMetrics = true;
        await this.loadMetrics();
    }

    async setMetricsWindow(windowMs: number): Promise<void> {
        this.metricsWindow = windowMs;
        await this.loadMetrics();
    }

    async loadMetrics(): Promise<void> {
        if (!this.store?.getMetrics) {
            this.metricsError = this.t('metricsUnavailable', 'This host does not expose execution metrics.');
            return;
        }
        this.metricsError = '';
        try {
            const data = await this.store.getMetrics(this.designer.definition.id, {
                limit: 200,
                windowMs: this.metricsWindow,
                buckets: 12
            });
            this.metricsData = data;
            this.metricsTrend = data?.trend || [];
            this.metricsMaxRuns = this.metricsTrend.reduce((max, point) => Math.max(max, point.runs), 0);
            const runs = data?.runs || 0;
            this.metricsRate = runs ? Math.round(((data?.succeeded || 0) / runs) * 100) : 0;
            if (!data) {
                this.metricsError = this.t('metricsUnavailable', 'This host does not expose execution metrics.');
            }
        } catch (error) {
            this.metricsError = (error as Error).message;
        }
    }

    /** Bar width relative to the busiest bucket in the window. */
    readonly trendStyle = (point: WorkflowMetricsTrendPoint): string => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        if (!point?.runs) {
            return 'width:0%';
        }
        const max = Math.max(1, self.metricsMaxRuns);
        return `width:${Math.max(4, Math.round((point.runs / max) * 100))}%`;
    };

    readonly formatTrendTime = (start: number): string => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const date = new Date(Number(start) || 0);
        const pad = (value: number) => String(value).padStart(2, '0');
        const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        return self.metricsWindow > 86400000
            ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
            : time;
    };

    closeMetrics(): void {
        this.showMetrics = false;
        this.metricsError = '';
        this.metricsData = undefined;
        this.metricsTrend = [];
        this.metricsRate = 0;
    }


    openSettings(): void {
        this.settingsDescription = this.designer?.definition.description || '';
        this.settingsTimeout = String(this.designer?.defaultTimeout || 0);
        this.settingsError = '';
        this.showSettings = true;
    }

    closeSettings(): void {
        this.showSettings = false;
        this.settingsError = '';
    }

    settingsDescriptionInput(event: any): void {
        this.settingsDescription = String(event?.target?.value ?? '');
        this.settingsError = '';
    }

    settingsTimeoutInput(event: any): void {
        this.settingsTimeout = String(event?.target?.value ?? '0');
        this.settingsError = '';
    }

    saveSettings(): void {
        if (!this.designer) {
            return;
        }
        const timeout = Number(this.settingsTimeout || 0);
        if (!Number.isFinite(timeout) || timeout < 0) {
            this.settingsError = this.t('timeoutInvalid', 'Enter a timeout of 0 or more milliseconds');
            return;
        }
        this.designer.updateSettings({
            description: this.settingsDescription,
            timeout
        });
        this.showSettings = false;
        this.settingsError = '';
        this.scheduleAutosave();
    }

    openRename(): void {
        this.renameValue = this.designer?.definition?.name || '';
        this.renameError = '';
        this.showRename = true;
    }

    renameInput(event: any): void {
        this.renameValue = String(event?.target?.value ?? '');
        this.renameError = '';
    }

    renameKey(event: any): void {
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
    }

    cancelRename(): void {
        this.showRename = false;
        this.renameError = '';
    }

    commitRename(): void {
        const name = String(this.renameValue || '').trim();
        if (!name) {
            this.renameError = this.t('renameEmpty', 'Enter a workflow name');
            return;
        }
        const tab = this.activeTab();
        if (!tab) {
            this.showRename = false;
            return;
        }
        tab.designer.renameWorkflow(name);
        this.showRename = false;
        this.renameError = '';
        // The tab label and toolbar title derive from the definition name, so
        // rebuild the cached tab source and let autosave persist the rename.
        this.emitTabs();
        this.scheduleAutosave();
    }

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
    async publishWorkflow(): Promise<void> {
        this.preview?.inspector?.formBlur();
        this.clearAutosaveTimer();
        this.saveState = 'saving';
        try {
            const release = await this.designer.publishTo(this.store);
            if (!release) {
                this.saveState = this.designer.dirty ? 'dirty' : 'saved';
                return;
            }
            const active = this.activeTab();
            if (active) {
                active.persisted = true;
            }
            this.syncActiveTabId();
            this.libraryError = '';
            this.lastAutosaveAt = Date.now();
            this.unsavedSince = undefined;
            this.saveState = this.designer.dirty ? 'dirty' : 'saved';
            this.toasts.published(release.version);
        } catch (error) {
            this.saveState = 'error';
            this.libraryError = (error as Error).message;
        }
    }

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
    async openPublish(): Promise<void> {
        this.preview?.inspector?.formBlur();
        const validation = this.designer.validate();
        if (!validation.valid) {
            this.designer.error = validation.errors.join('; ');
            return;
        }
        this.publishError = '';
        try {
            const store = this.store;
            if (typeof store?.listVersions === 'function') {
                const list = await store.listVersions(this.designer.definition.id, 1);
                this.versionRelease = list.release;
            }
        } catch {
            // Release info is advisory; the publish request validates again.
        }
        this.showPublish = true;
    }

    cancelPublish(): void {
        this.showPublish = false;
        this.publishError = '';
    }

    async confirmPublish(): Promise<void> {
        this.showPublish = false;
        await this.publishWorkflow();
        if (this.saveState === 'error') {
            this.publishError = this.libraryError || this.designer.error || '';
        }
    }

    /** Open the version history overlay for the active document. */
    async openVersions(): Promise<void> {
        this.showVersions = true;
        this.versionError = '';
        const store = this.store;
        if (typeof store?.listVersions !== 'function') {
            this.versionItems = [];
            this.versionRelease = undefined;
            this.versionError = this.t('versionUnsupported', 'This host does not keep version history');
            return;
        }
        try {
            const list = await store.listVersions(this.designer.definition.id);
            this.versionItems = list.items || [];
            this.versionRelease = list.release;
        } catch (error) {
            this.versionItems = [];
            this.versionError = (error as Error).message;
        }
    }

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
    async clearRunHistory(): Promise<void> {
        const store = this.store;
        if (typeof store?.clearExecutions !== 'function') {
            return;
        }
        try {
            await store.clearExecutions(this.designer.definition.id);
        } catch (error) {
            this.libraryError = (error as Error).message;
        }
    }

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
