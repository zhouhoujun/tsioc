import { AfterViewInit, Attribute, Component, Computed, ElementRef, NoReactive, OnDestroy, ViewChild, noReact } from '@tsdi/components';
import {
    markElementRefRaw,
} from '@tsdi/components/common';
import {
    installDynamicFormStyles,
} from '@tsdi/components/common/dynamic-form';
import {
    installMenuBarStyles,
} from '@tsdi/components/common/menu-bar';
import { installTabBarStyles } from '@tsdi/components/common/tab-bar';
import {
    installWorkspaceLayoutStyles,
    WorkspaceLayoutComponent
} from '@tsdi/components/common/layout';
import { applyThemeToDocument, isThemeName, ThemeName } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { Inject, Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { ActivityContext } from '../../activities/Activity';
import { WorkflowNodeRegistry } from '../node-registry';
import { WorkflowDesigner } from '../workflow-designer';
import {
    NodePosition,
    VisualWorkflowDefinition,
    WorkflowAlignMode,
    WorkflowDistributeMode,
    WorkflowPaletteItem,
    WorkflowPaletteGroup
} from '../types';
import {
    buildWorkflowCanvasModel,
    buildWorkflowCanvasViewport,
    buildWorkflowInspectorModel,
    buildWorkflowDebugItems,
    buildWorkflowPalette,
    buildWorkflowRunHistory,
    buildWorkflowStatusModel,
    buildWorkflowToolbarModel,
    WORKFLOW_PORT_SPACING,
    WORKFLOW_PORT_START,
    workflowNodeFrame
} from '../workflow-view-models';
import { configNodesSignature } from '../workflow-config-nodes';
import { WorkflowCanvasPointerPayload } from './workflow-canvas';
import { WorkflowConfigDialogComponent } from './workflow-config-dialog.component';
import { WorkflowConfigNodesComponent } from './workflow-config-nodes.component';
import { WorkflowExpressionPanelComponent } from './workflow-expression-panel';
import { workflowShortcutRows } from '../workflow-shortcut-rows';
import { canCreateSubflow, handleSubflowFieldAction, subflowWorkflowId } from '../workflow-subflow-actions';
import { decodeWorkflowTypedValue } from '../workflow-typed-value';
import { patchConfigPath, readConfigPath } from '../workflow-config-path';
import { preloadWorkflowExpressions, validateWorkflowExpression } from '../workflow-expression';
import { revealWorkflowNode } from '../workflow-canvas-focus';
import { WorkflowGroupSettingsComponent } from './workflow-group-settings.component';
import { WorkflowInspectorComponent } from './workflow-inspector';
import { installWorkflowDesignerStyles } from './workflow-designer.styles';

/**
 * Reusable visual designer workspace.
 *
 * Renders toolbar, palette, canvas, inspector, run history/log and JSON panel
 * for one `WorkflowDesigner` document. The full `WorkflowDesignerComponent`
 * adds multi-document tabs and the workflow library on top; products such as
 * the microservice admin embed this component directly for a single document.
 */
const EMPTY_LOGS: any[] = [];

/** Compare a model cache key without building a string per read. */
function sameModelKey(previous: any[], next: any[]): boolean {
    if (previous === next) {
        return true;
    }
    if (!previous || !next || previous.length !== next.length) {
        return false;
    }
    for (let index = 0; index < next.length; index++) {
        if (previous[index] !== next[index]) {
            return false;
        }
    }
    return true;
}

@Component({
    selector: 'workflow-designer-preview',
    template: `
    <div class="workflow-designer-preview workflow-designer" data-theme="{{themeName}}">
        <workflow-toolbar :model="toolbarModel" :locale="locale" :action="handleToolbarAction"
            :theme="themeName" :themeChangeAction="themeSelectAction"
            :scheduleToggleAction="toggleSchedule"
            :hiddenActions="hiddenActions"></workflow-toolbar>
        <workspace-layout #workspaceLayout class="workflow-workspace" [bottomCollapsed]="true">
            <workspace-left>
                <workflow-palette :groups="paletteGroups" :locale="locale"
                    :addAction="addFromPalette" :dragStartAction="paletteDragStart"></workflow-palette>
            </workspace-left>
            <workspace-center>
                <div class="workflow-align-bar" v-if="alignBarVisible">
                    <button type="button" class="workflow-align-button"
                        v-for="item in alignActions" data-align="{{item.action}}"
                        [title]="item.label" [aria-label]="item.label"
                        @click="alignAction(item.action)">{{item.glyph}}</button>
                </div>
                <workflow-canvas :model="canvasModel" :locale="locale"
                    :pointerAction="handleCanvas" :panAction="handlePan"></workflow-canvas>
            </workspace-center>
            <workspace-right>
                <workflow-inspector #inspector :model="inspectorModel" :locale="locale"
                    :changeAction="inspectorChange" :restoreAction="inspectorRestore"
                    :actionAction="inspectorAction"
                    :codeSuggestions="codeSuggestions"></workflow-inspector>
            </workspace-right>
            <workspace-bottom>
                <workflow-run-history v-if="showRunHistory" :items="runHistory" :locale="locale"
                    :selectAction="selectRun" :clearAction="clearRunHistory"></workflow-run-history>
                <workflow-run-log v-if="showRunLogs" :items="runLogs" :debugItems="debugItems"
                    :visible="showLogs" :locale="locale" :closeAction="closeLogs"
                    :clearStateAction="clearRuntimeState"></workflow-run-log>
            </workspace-bottom>
        </workspace-layout>
        <div class="workflow-statusbar" v-if="showStatusbar">
            <span class="workflow-status-message">{{statusModel.message}}</span>
            <span class="workflow-status-error" v-if="statusModel.error">{{statusModel.error}}</span>
            <span class="workflow-status-spacer"></span>
            <span class="workflow-save-state" [class]="saveStateClass">{{saveStateLabel}}</span>
            <span class="workflow-status-selected">{{statusModel.selectedLabel}}</span>
            <span>{{statusModel.nodeCount}} {{nodeWord}} · {{designer.connections.length}} {{linkWord}}</span>
            <span>{{statusModel.executionLabel}}</span>
            <ui-progress class="workflow-status-progress" v-if="statusModel.progress > 0"
                :value="statusModel.progress" :max="100" :width="10"
                :ariaLabel="statusModel.executionLabel"></ui-progress>
            <span>{{statusModel.zoomLabel}}</span>
        </div>
        <div class="workflow-selection-box" v-if="selectionBox" [style]="selectionBoxStyle"></div>
        <div class="workflow-quick-add" v-if="showQuickAdd" @click="closeQuickAdd">
            <div class="workflow-quick-add-panel" @click="stopShortcutClick">
                <input class="workflow-quick-add-input" type="search"
                    placeholder="{{quickAddPlaceholder}}" [value]="quickAddQuery"
                    @input="quickAddInput" @keydown="quickAddKey" />
                <div class="workflow-quick-add-list">
                    <button v-for="(item, index) in quickAddItems" type="button"
                        class="workflow-quick-add-item" data-node-type="{{item.type}}"
                        [class]="quickAddItemClass(index)"
                        @click="chooseQuickAdd(item.type)">
                        <span class="workflow-quick-add-icon"><icon [name]="item.type" [glyph]="item.icon" size="sm"></icon></span>
                        <span class="workflow-quick-add-label">{{item.label}}</span>
                        <span class="workflow-quick-add-category">{{item.category}}</span>
                    </button>
                    <ui-empty class="workflow-quick-add-empty" v-if="!quickAddItems.length"
                        :title="quickAddEmpty"></ui-empty>
                </div>
            </div>
        </div>
        <div class="workflow-quick-add workflow-find" v-if="showFind" @click="closeFind">
            <div class="workflow-quick-add-panel workflow-find-panel" @click="stopShortcutClick">
                <input class="workflow-find-input" type="search"
                    placeholder="{{tr('findPlaceholder', 'Find a node by name, id or type')}}" [value]="findQuery"
                    @input="findInput" @keydown="findKey" />
                <div class="workflow-quick-add-list">
                    <button v-for="(item, index) in findResults" type="button"
                        class="workflow-quick-add-item workflow-find-item" data-find-node="{{item.id}}"
                        [class]="findItemClass(index)"
                        @click="chooseFind(index)">
                        <span class="workflow-quick-add-label">{{item.label}}</span>
                        <span class="workflow-quick-add-category">{{item.type}}</span>
                    </button>
                    <ui-empty class="workflow-quick-add-empty" v-if="!findResults.length"
                        :title="tr('findEmpty', 'No matching nodes.')"></ui-empty>
                </div>
            </div>
        </div>
        <workflow-group-settings #groupSettings :designer="designer" :locale="locale"
            :notifyAction="notifyDesignerChange"></workflow-group-settings>
        <workflow-config-nodes #configNodes :designer="designer" :registry="registry"
            :locale="locale" :action="configNodeAction"></workflow-config-nodes>
        <workflow-config-dialog #configDialog :designer="designer" :registry="registry"
            :locale="locale" :positionAction="nextConfigPosition"
            :notifyAction="notifyDesignerChange"></workflow-config-dialog>
        <workflow-expression-panel #expressionPanel :designer="designer" :locale="locale"
            :notifyAction="notifyChange"></workflow-expression-panel>
        <div class="workflow-node-menu-backdrop" v-if="showNodeMenu" @mousedown="closeNodeMenu"
            @contextmenu="closeNodeMenu"></div>
        <div class="workflow-node-menu" v-if="showNodeMenu" [style]="nodeMenuStyle">
            <button type="button" class="workflow-node-menu-item" @click="toggleMenuNode">{{nodeMenuToggleLabel}}</button>
            <button type="button" class="workflow-node-menu-item" v-if="selectionCount > 1"
                @click="groupMenuSelection">{{groupSelectionLabel}}</button>
            <button type="button" class="workflow-node-menu-item" v-if="canUngroupSelection"
                @click="ungroupMenuSelection">{{ungroupLabel}}</button>
            <button type="button" class="workflow-node-menu-item" v-if="referencedWorkflowId"
                data-subflow="true" @click="openReferencedWorkflow">{{tr('openSubflow', 'Open sub workflow')}}</button>
            <button type="button" class="workflow-node-menu-item" v-if="canCreateSubflow"
                data-subflow="create" @click="createSubflowMenuNode">{{tr('newSubflow', 'New sub workflow')}}</button>
            <button type="button" class="workflow-node-menu-item" @click="duplicateMenuNode">{{duplicateLabel}}</button>
            <button type="button" class="workflow-node-menu-item is-danger" @click="deleteMenuNode">{{deleteLabel}}</button>
        </div>
        <div class="workflow-json-panel" v-if="showJson">
            <div class="workflow-json-head">
                <span class="workflow-json-title">{{jsonTitle}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-btn workflow-btn-primary" @click="applyJson">{{applyLabel}}</button>
                <button class="workflow-btn" @click="toggleJson">{{closeLabel}}</button>
            </div>
            <textarea class="workflow-json-text" v-model="jsonText" rows="16"></textarea>
            <div class="workflow-json-error" v-if="jsonError">{{jsonError}}</div>
        </div>
        <div class="workflow-shortcuts" v-if="showShortcuts" @click="closeShortcuts">
            <div class="workflow-shortcuts-panel" @click="stopShortcutClick">
                <keymap-panel :title="shortcutsLabel" :items="shortcutItems"
                    :hint="tr('shortcutsHint', 'Press ? to toggle this panel')"></keymap-panel>
                <div class="workflow-shortcuts-actions">
                    <button class="workflow-btn" type="button" @click="closeShortcuts">{{tr('close', 'Close')}}</button>
                </div>
            </div>
        </div>
    </div>`
})
export class WorkflowDesignerPreviewComponent implements OnDestroy, AfterViewInit {
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() registry!: WorkflowNodeRegistry;
    @Attribute() locale = 'zh-CN';
    @Attribute() theme: ThemeName = 'light';
    /**
     * Apply the designer theme to the whole document. Embedded hosts (for
     * example the microservice admin) disable this so the host theme wins.
     */
    @Attribute() applyDocumentTheme = true;
    /** Optional host hook to persist a user-selected theme. */
    @Attribute() themeChangeAction?: (theme: ThemeName) => void;
    @Attribute() runContext: ActivityContext = {};
    @Attribute() autoRun = false;
    @Attribute() saveState: 'saved' | 'dirty' | 'saving' | 'error' = 'saved';
    /** Toolbar action names to hide (run/save/open-library/...). */
    @Attribute() hiddenActions: string[] = [];
    @Attribute() showRunHistory = true;
    @Attribute() showStatusbar = true;
    @Attribute() showRunLogs = true;
    /** Handles shell actions (save/open-library) in the host. */
    @Attribute() hostAction?: (action: string, payload?: string) => void;
    @ViewChild('expressionPanel') expressionPanel?: WorkflowExpressionPanelComponent;

    /** Open a referenced workflow document by id (host tab host). */
    @Attribute() openWorkflowAction?: (id: string) => void;
    /** Notify the host that the designer is dirty / an edit happened. */
    @Attribute() autosaveAction?: () => void;
    showShortcuts = false;
    showNodeMenu = false;
    selectionBox: { x: number; y: number; width: number; height: number } | undefined = undefined;
    showFind = false;
    findQuery = '';
    findIndex = 0;
    findResults: Array<{ id: string; label: string; type: string }> = [];
    showQuickAdd = false;
    quickAddQuery = '';
    quickAddIndex = 0;
    quickAddSpliceId = '';
    nodeMenuId = '';
    nodeMenuX = 0;
    nodeMenuY = 0;
    showJson = false;
    showLogs = false;
    @ViewChild('workspaceLayout', WorkspaceLayoutComponent) workspaceLayout?: WorkspaceLayoutComponent;
    /** Inspector exposes a flush hook so commands never run on stale edits. */
    @ViewChild(WorkflowInspectorComponent) inspector?: WorkflowInspectorComponent;
    @ViewChild(WorkflowConfigDialogComponent) configDialog?: WorkflowConfigDialogComponent;
    @ViewChild(WorkflowConfigNodesComponent) configNodes?: WorkflowConfigNodesComponent;
    @ViewChild(WorkflowGroupSettingsComponent) groupSettings?: WorkflowGroupSettingsComponent;
    jsonText = '';
    jsonError = '';
    private selfRef?: WorkflowDesignerPreviewComponent;
    private pendingNodeType?: string;
    @NoReactive() private documentRef?: any;

    @NoReactive() private canvasModelCache?: {
        definition: any;
        nodes: any;
        connections: any;
        selectionNode: string;
        selectionIds: string;
        selectionConnection: string;
        execution: any;
        draft: any;
        zoom: number;
        panX: number;
        panY: number;
        locale: string;
        revision: number;
        model: ReturnType<typeof buildWorkflowCanvasModel>;
    };
    @NoReactive() private toolbarModelCache?: { key: any[]; model: ReturnType<typeof buildWorkflowToolbarModel> };
    @NoReactive() private inspectorModelCache?: {
        nodeId: string;
        name: string;
        description: string;
        type: string;
        config: any;
        disabled: boolean;
        execution: any;
        locale: string;
        revision: number;
        configNodes: string;
        model: ReturnType<typeof buildWorkflowInspectorModel>;
    };
    @NoReactive() private statusModelCache?: { key: any[]; model: ReturnType<typeof buildWorkflowStatusModel> };
    @NoReactive() private codeSuggestionCache?: {
        nodes: any[];
        runContext: any;
        contributions: Map<any, string[]>;
        values: string[];
    };
    scheduling = false;
    @NoReactive() private scheduleHandle?: { stop(): void };

    constructor(
        @Optional() @Inject(DOCUMENT) document?: any,
        @Optional() private translator?: Translator,
        @Optional() private elementRef?: ElementRef
    ) {
        markElementRefRaw(elementRef);
        this.documentRef = document;
        try {
            if (document) {
                (document as any)[noReact] = true;
            }
        } catch {
            // Documents can reject expando properties; handlers still use the
            // raw constructor reference rather than reading it through a proxy.
        }
        installWorkflowDesignerStyles(document);
        installWorkspaceLayoutStyles(document);
        installDynamicFormStyles(document);
        installMenuBarStyles(document);
        installTabBarStyles(document);
        // Do not touch the document theme here: attribute bindings have not
        // been applied yet, so a dark host theme would be reset to light.
    }

    onAfterViewInit(): void {
        if (this.applyDocumentTheme !== false) {
            const doc = this.documentRef || (globalThis as { document?: Document }).document;
            applyThemeToDocument(doc, this.themeName);
        }
        // The bottom pane is a secondary surface: keep it collapsed until a
        // menu action (Logs) explicitly reveals it.
        this.workspaceLayout?.collapsePane?.('bottom');
    }

    onInit(): void {
        this.selfRef = this;
        if (!this.registry) {
            this.registry = new WorkflowNodeRegistry();
        }
        if (this.autoRun && this.designer) {
            void this.designer.run({ context: this.runContext });
        }
    }

    onDestroy(): void {
        this.scheduleHandle?.stop();
        this.scheduleHandle = undefined;
        this.scheduling = false;
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

    setTheme(theme: ThemeName): void {
        this.theme = isThemeName(theme) ? theme : 'light';
        if (this.applyDocumentTheme !== false) {
            const doc = this.documentRef || (globalThis as { document?: Document }).document;
            applyThemeToDocument(doc, this.theme);
        }
        this.themeChangeAction?.(this.themeName);
    }

    get isZh(): boolean { return this.localeValue === 'zh-CN'; }

    /** Template-facing translate helper (bindings cannot call the private method). */
    readonly tr = (key: string, fallback: string): string => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        return self.t(key, fallback);
    };

    private t(key: string, fallback: string): string {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        return translateWorkflow(self.translator, self.localeValue, `workflow.ui.${key}`, fallback);
    }

    get nodeWord(): string { return this.t('nodeWord', 'nodes'); }
    get linkWord(): string { return this.t('linkWord', 'links'); }
    get jsonTitle(): string { return this.t('jsonTitle', 'Workflow JSON (generated visually)'); }

    get applyLabel(): string {
        return this.t('apply', 'Apply');
    }

    get closeLabel(): string {
        return this.t('close', 'Close');
    }

    get duplicateLabel(): string {
        return this.t('duplicate', 'Duplicate');
    }

    get deleteLabel(): string {
        return this.t('delete', 'Delete');
    }

    get nodeMenuToggleLabel(): string {
        const node = this.designer?.nodes.find(item => item.id === this.nodeMenuId);
        return node?.disabled
            ? this.t('enableNode', 'Enable node')
            : this.t('disableNode', 'Disable node');
    }

    get nodeMenuStyle(): string {
        return `left:${this.nodeMenuX}px;top:${this.nodeMenuY}px`;
    }

    get alignBarVisible(): boolean {
        return (this.designer?.selectedNodeIds.length || 0) > 1;
    }

    get alignActions(): Array<{ action: string; glyph: string; label: string }> {
        return [
            { action: 'left', glyph: '⇤', label: this.t('alignLeft', 'Align left') },
            { action: 'center', glyph: '↔', label: this.t('alignCenter', 'Align center') },
            { action: 'right', glyph: '⇥', label: this.t('alignRight', 'Align right') },
            { action: 'top', glyph: '⇡', label: this.t('alignTop', 'Align top') },
            { action: 'middle', glyph: '↕', label: this.t('alignMiddle', 'Align middle') },
            { action: 'bottom', glyph: '⇣', label: this.t('alignBottom', 'Align bottom') },
            { action: 'distribute-horizontal', glyph: '⇹', label: this.t('distributeHorizontal', 'Distribute horizontally') },
            { action: 'distribute-vertical', glyph: '⇳', label: this.t('distributeVertical', 'Distribute vertically') }
        ];
    }

    alignAction(action: string): void {
        if (!this.designer) {
            return;
        }
        if (action.startsWith('distribute-')) {
            this.designer.distributeSelection(action.slice('distribute-'.length) as WorkflowDistributeMode);
        } else {
            this.designer.alignSelection(action as WorkflowAlignMode);
        }
        this.notifyChange();
    }

    get quickAddPlaceholder(): string { return this.t('quickAddPlaceholder', 'Search nodes to add'); }
    get quickAddEmpty(): string { return this.t('quickAddEmpty', 'No matching nodes.'); }

    get quickAddItems(): Array<{ type: string; label: string; icon: string; category: string }> {
        const query = String(this.quickAddQuery || '').trim().toLowerCase();
        const items: Array<{ type: string; label: string; icon: string; category: string }> = [];
        (this.paletteGroups || []).forEach(group => {
            (group.items || []).forEach(item => {
                items.push({
                    type: item.type,
                    label: item.label,
                    icon: item.icon,
                    category: group.label
                });
            });
        });
        const filtered = query
            ? items.filter(item =>
                [item.label, item.type, item.category]
                    .some(value => String(value || '').toLowerCase().includes(query))
            )
            : items;
        return filtered.slice(0, 60);
    }

    quickAddItemClass(index: number): Record<string, boolean> {
        return {
            'workflow-quick-add-item': true,
            'is-active': index === this.quickAddIndex
        };
    }

    openQuickAdd(): void {
        this.showQuickAdd = true;
        this.quickAddQuery = '';
        this.quickAddIndex = 0;
        this.quickAddSpliceId = '';
        setTimeout(() => {
            const document = (globalThis as { document?: Document }).document;
            (document?.querySelector?.('.workflow-quick-add-input') as any)?.focus?.();
        }, 0);
    }

    closeQuickAdd(): void {
        this.showQuickAdd = false;
        this.quickAddQuery = '';
        this.quickAddIndex = 0;
        this.quickAddSpliceId = '';
    }

    quickAddInput(event: any): void {
        this.quickAddQuery = String(event?.target?.value ?? '');
        this.quickAddIndex = 0;
    }

    quickAddKey(event: any): void {
        const key = String(event?.key || '');
        const items = this.quickAddItems;
        if (key === 'ArrowDown') {
            event?.preventDefault?.();
            this.quickAddIndex = Math.min(Math.max(0, items.length - 1), this.quickAddIndex + 1);
            return;
        }
        if (key === 'ArrowUp') {
            event?.preventDefault?.();
            this.quickAddIndex = Math.max(0, this.quickAddIndex - 1);
            return;
        }
        if (key === 'Escape') {
            event?.preventDefault?.();
            this.closeQuickAdd();
            return;
        }
        if (key === 'Enter') {
            event?.preventDefault?.();
            const item = items[this.quickAddIndex] || items[0];
            if (item) {
                this.chooseQuickAdd(item.type);
            }
        }
    }

    /** Match nodes on the canvas by name, id or type. */
    protected matchNodes(query: string): Array<{ id: string; label: string; type: string }> {
        const term = String(query || '').trim().toLowerCase();
        return this.designer.nodes
            .filter(node => {
                if (!term) {
                    return true;
                }
                return [node.id, node.name, node.type, node.description]
                    .some(value => String(value || '').toLowerCase().includes(term));
            })
            .slice(0, 40)
            .map(node => ({
                id: node.id,
                label: node.name || node.id,
                type: node.type
            }));
    }

    findItemClass(index: number): Record<string, boolean> {
        return {
            'workflow-quick-add-item': true,
            'is-active': index === this.findIndex
        };
    }

    refreshFind(): void {
        this.findResults = this.matchNodes(this.findQuery);
        this.findIndex = 0;
    }

    openFind(): void {
        this.showFind = true;
        this.findQuery = '';
        this.refreshFind();
        setTimeout(() => {
            const document = (globalThis as { document?: Document }).document;
            (document?.querySelector?.('.workflow-find-input') as any)?.focus?.();
        }, 0);
    }

    closeFind(): void {
        this.showFind = false;
        this.findQuery = '';
        this.findIndex = 0;
        this.findResults = [];
    }

    findInput(event: any): void {
        this.findQuery = String(event?.target?.value ?? '');
        this.refreshFind();
    }

    findKey(event: any): void {
        const key = String(event?.key || '');
        const items = this.findResults;
        if (key === 'ArrowDown') {
            event?.preventDefault?.();
            this.findIndex = Math.min(Math.max(0, items.length - 1), this.findIndex + 1);
            return;
        }
        if (key === 'ArrowUp') {
            event?.preventDefault?.();
            this.findIndex = Math.max(0, this.findIndex - 1);
            return;
        }
        if (key === 'Escape') {
            event?.preventDefault?.();
            this.closeFind();
            return;
        }
        if (key === 'Enter') {
            event?.preventDefault?.();
            this.chooseFind(this.findIndex);
        }
    }

    /** Select the matched node and bring it to the middle of the viewport. */
    chooseFind(index: number): void {
        const item = this.findResults[index] || this.findResults[0];
        if (!item) {
            return;
        }
        const node = this.designer.nodes.find(entry => entry.id === item.id);
        if (!node) {
            return;
        }
        revealWorkflowNode(this.designer, node.id, this.canvasViewport());
        this.closeFind();
        this.notifyChange();
    }

    chooseQuickAdd(type: string): void {
        if (!this.designer || !type) {
            return;
        }
        const definition = this.registry.get(type as any);
        const frame = definition
            ? workflowNodeFrame({
                type: definition.type,
                position: { x: 0, y: 0 },
                inputs: definition.inputs || [],
                outputs: definition.outputs || []
            } as any)
            : { width: 184, height: 64 };
        const spliceId = this.quickAddSpliceId;
        const midpoint = spliceId ? this.connectionMidpoint(spliceId) : undefined;
        let centerX: number;
        let centerY: number;
        if (midpoint) {
            centerX = midpoint.x;
            centerY = midpoint.y;
        } else {
            const rect = this.canvasRect();
            const zoom = this.designer.zoom || 1;
            const pan = this.designer.pan || { x: 0, y: 0 };
            centerX = rect ? (rect.width / zoom) / 2 - pan.x / zoom : 400;
            centerY = rect ? (rect.height / zoom) / 2 - pan.y / zoom : 240;
        }
        const position = {
            x: Math.round(centerX - frame.width / 2),
            y: Math.round(centerY - frame.height / 2)
        };
        if (spliceId) {
            this.designer.spliceNode(type as any, position, spliceId);
        } else {
            this.designer.addNode(type as any, position);
        }
        this.closeQuickAdd();
        this.notifyChange();
    }

    // ---------------------------------------------------------------------
    // Configuration nodes (shared brokers / TLS profiles)
    // ---------------------------------------------------------------------

    readonly inspectorAction = (key: string, actionId: string, nodeId?: string): void => {
        if (actionId === 'expression') {
            (this.selfRef || this).expressionPanel?.open(key, nodeId);
            return;
        }
        // The stored-workflow picker creates a child document or opens the
        // referenced workflow through the shell's tab host.
        if (handleSubflowFieldAction(this.designer, key, actionId, nodeId, this.hostAction, this.openWorkflowAction)) {
            return;
        }
        this.configDialog?.handleAction(key, actionId, nodeId);
    };

    /** Panel requests: edit a record, create one, or reveal it on the canvas. */
    readonly configNodeAction = (name: string, value: string): void => {
        if (name === 'edit') {
            this.configDialog?.open({ id: value });
        } else if (name === 'add') {
            this.designer.createConfigNode(value as any, this.nextAddPosition());
            this.notifyChange();
        } else {
            revealWorkflowNode(this.designer, value, this.canvasViewport());
        }
    };

    openConfigNodes(): void { this.configNodes?.open(); }

    /** Delete guard: config nodes still referenced by other nodes ask first. */
    requestDeleteNodes(nodeIds?: string[]): void {
        this.configDialog?.requestDelete(nodeIds);
    }

    readonly nextConfigPosition = (): NodePosition => this.nextAddPosition();

    readonly notifyDesignerChange = (): void => {
        this.notifyChange();
    };

    get selectionCount(): number {
        return this.designer?.selectedNodeIds.length || 0;
    }

    get referencedWorkflowId(): string {
        return subflowWorkflowId(this.designer?.nodes.find(item => item.id === this.nodeMenuId));
    }

    get canCreateSubflow(): boolean {
        return canCreateSubflow(this.designer?.nodes.find(item => item.id === this.nodeMenuId));
    }

    createSubflowMenuNode(): void {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.showNodeMenu = false;
        self.hostAction?.('new-subflow', self.nodeMenuId);
    }

    openReferencedWorkflow(): void {
        const id = this.referencedWorkflowId;
        this.showNodeMenu = false;
        if (id) {
            this.openWorkflowAction?.(id);
        }
        this.notifyChange();
    }

    get canUngroupSelection(): boolean {
        const selected = new Set(this.designer?.selectedNodeIds || []);
        return (this.designer?.definition.groups || [])
            .some(group => group.nodeIds.some(id => selected.has(id)));
    }

    get groupSelectionLabel(): string {
        return this.t('groupSelection', 'Group selection');
    }

    get ungroupLabel(): string {
        return this.t('ungroup', 'Ungroup');
    }

    groupMenuSelection(): void {
        if (this.designer) {
            this.designer.groupSelection();
        }
        this.showNodeMenu = false;
        this.notifyChange();
    }

    ungroupMenuSelection(): void {
        if (this.designer) {
            this.designer.ungroupSelection();
        }
        this.showNodeMenu = false;
        this.notifyChange();
    }

    get selectionBoxStyle(): string {
        const box = this.selectionBox;
        if (!box) {
            return '';
        }
        return `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`;
    }

    /** Drop run chips locally; the shell also clears persisted history. */
    readonly clearRunHistory = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.designer.clearExecutionHistory();
        self.hostAction?.('clear-runs');
    };

    closeNodeMenu(): void {
        this.showNodeMenu = false;
        this.notifyChange();
    }

    toggleMenuNode(): void {
        const node = this.designer?.nodes.find(item => item.id === this.nodeMenuId);
        if (!node) {
            this.showNodeMenu = false;
            return;
        }
        if (!this.designer.selectedNodeIds.includes(node.id)) {
            this.designer.selectNode(node.id);
        }
        this.designer.toggleSelectionDisabled();
        this.showNodeMenu = false;
        this.notifyChange();
    }

    duplicateMenuNode(): void {
        if (this.nodeMenuId) {
            this.designer.selectNode(this.nodeMenuId);
            this.designer.duplicateSelection();
        }
        this.showNodeMenu = false;
        this.notifyChange();
    }

    deleteMenuNode(): void {
        if (this.nodeMenuId) {
            this.designer.selectNode(this.nodeMenuId);
            this.showNodeMenu = false;
            this.requestDeleteNodes([this.nodeMenuId]);
            return;
        }
        this.showNodeMenu = false;
        this.notifyChange();
    }

    get saveStateClass(): string {
        return `workflow-save-state is-${this.effectiveSaveState}`;
    }

    /**
     * The designer is the source of truth. Programmatic edits (plugins, draft
     * restore, host RPCs) can dirty the document without a toolbar action, and
     * showing "Saved" then would be wrong.
     */
    private get effectiveSaveState(): 'saved' | 'dirty' | 'saving' | 'error' {
        const state = this.saveState || 'saved';
        return state === 'saved' && this.designer?.dirty ? 'dirty' : state;
    }

    get visibleActions(): string[] {
        return Array.isArray(this.hiddenActions) ? this.hiddenActions : [];
    }

    visibleAction(name: string): boolean {
        return !this.visibleActions.includes(name);
    }

    get saveStateLabel(): string {
        switch (this.effectiveSaveState) {
            case 'saving':
                return this.t('saveStateSaving', 'Saving…');
            case 'dirty':
                return this.t('saveStateDirty', 'Unsaved changes');
            case 'error':
                return this.t('saveStateError', 'Save failed');
            default:
                return this.t('saveStateSaved', 'Saved');
        }
    }

    get shortcutsLabel(): string {
        return this.t('shortcutsTitle', 'Keyboard shortcuts');
    }

    get shortcutItems(): Array<{ key: string; action: string }> {
        return this.shortcutRows.map(row => ({ key: row.keys, action: row.action }));
    }

    get shortcutRows(): Array<{ action: string; keys: string }> {
        return workflowShortcutRows((key, fallback) => this.t(key, fallback));
    }

    toggleShortcuts(): void {
        this.showShortcuts = !this.showShortcuts;
    }

    closeShortcuts(): void {
        this.showShortcuts = false;
    }

    stopShortcutClick(event: any): void {
        event?.stopPropagation?.();
    }

    @Computed()
    get paletteGroups(): WorkflowPaletteGroup[] {
        // `revision` is the registry's change token: reading it declares the
        // dependency that plugin installs bump. Locale/translator are read by
        // the builder itself.
        void this.registry.revision;
        return buildWorkflowPalette(this.registry, this.localeValue, this.translator);
    }

    get canvasModel() {
        const designer = this.designer;
        const definition = designer.definition;
        const nodes = definition?.nodes;
        const connections = definition?.connections;
        const selection = designer.selection;
        const selectionNode = selection?.nodeId || '';
        const selectionIds = (designer.selectedNodeIds || []).join(',');
        const selectionConnection = selection?.connectionId || '';
        const execution = designer.execution;
        const draft = designer.connectionDraft;
        const zoom = designer.zoom;
        const panX = designer.pan?.x || 0;
        const panY = designer.pan?.y || 0;
        const locale = this.localeValue;
        const revision = this.registry.revision;
        const cache = this.canvasModelCache;
        // O(1) cache check: document edits replace `definition`, and selection/
        // execution/draft are replaced immutably. Scanning every node here made
        // pan/zoom O(nodes) on large workflows (300 nodes ≈ 1s per frame).
        if (cache
            && cache.definition === definition
            && cache.nodes === nodes
            && cache.connections === connections
            && cache.selectionNode === selectionNode
            && cache.selectionIds === selectionIds
            && cache.selectionConnection === selectionConnection
            && cache.execution === execution
            && cache.draft === draft
            && cache.zoom === zoom
            && cache.panX === panX
            && cache.panY === panY
            && cache.locale === locale
            && cache.revision === revision) {
            return cache.model;
        }
        // Pan, zoom and wire dragging only move the viewport: keep the existing
        // node/edge projections instead of re-projecting the whole graph.
        const projectionUnchanged = !!cache
            && cache.definition === definition
            && cache.nodes === nodes
            && cache.connections === connections
            && cache.selectionNode === selectionNode
            && cache.selectionIds === selectionIds
            && cache.selectionConnection === selectionConnection
            && cache.execution === execution
            && cache.locale === locale
            && cache.revision === revision;
        const model = projectionUnchanged && cache
            ? buildWorkflowCanvasViewport(cache.model, designer)
            : buildWorkflowCanvasModel(designer, this.registry, locale, this.translator, cache?.model);
        this.canvasModelCache = {
            definition,
            nodes,
            connections,
            selectionNode,
            selectionIds,
            selectionConnection,
            execution,
            draft,
            zoom,
            panX,
            panY,
            locale,
            revision,
            model
        };
        return model;
    }

    get inspectorModel() {
        const node = this.designer.selectedNode;
        const execution = this.designer.execution;
        const locale = this.localeValue;
        const revision = this.registry.revision;
        const nodeId = node?.id || '';
        const name = node?.name || '';
        const description = node?.description || '';
        const type = node?.type || '';
        const config = node?.config;
        const disabled = !!node?.disabled;
        // Reference pickers resolve against sibling config nodes, so the cache
        // key must follow their id/name/summary even when the selected node's
        // own config object is unchanged.
        const configNodes = configNodesSignature(this.designer.definition, this.registry, type, this.designer.workflowLibrary?.options);
        const cache = this.inspectorModelCache;
        if (cache && cache.nodeId === nodeId && cache.name === name && cache.description === description
            && cache.type === type && cache.config === config && cache.disabled === disabled
            && cache.execution === execution && cache.locale === locale && cache.revision === revision
            && cache.configNodes === configNodes) {
            return cache.model;
        }
        const model = buildWorkflowInspectorModel(this.designer, this.registry, locale, this.translator);
        this.inspectorModelCache = {
            nodeId, name, description, type, config, disabled, execution, locale, revision, configNodes, model
        };
        return model;
    }

    /**
     * Not `@Computed`: the tool model must not depend on the document identity,
     * otherwise every drag frame (which replaces `definition`) would rebuild it.
     * The key compares cheap scalars instead.
     */
    get toolbarModel() {
        const key = this.toolbarModelKey();
        const cache = this.toolbarModelCache;
        if (cache && sameModelKey(cache.key, key)) {
            return cache.model;
        }
        const model = { ...buildWorkflowToolbarModel(this.designer, this.localeValue, this.translator), scheduling: this.scheduling };
        this.toolbarModelCache = { key, model };
        return model;
    }

    /** See `toolbarModel`: scalar key instead of `@Computed` document deps. */
    get statusModel() {
        const key = this.statusModelKey();
        const cache = this.statusModelCache;
        if (cache && sameModelKey(cache.key, key)) {
            return cache.model;
        }
        const model = buildWorkflowStatusModel(this.designer, this.localeValue, this.translator);
        this.statusModelCache = { key, model };
        return model;
    }

    @Computed()
    get debugItems() {
        // Inputs are immutable snapshots (execution), the locale and the
        // registry revision, so computed caching matches the previous key.
        void this.registry.revision;
        return buildWorkflowDebugItems(this.designer, this.registry, this.localeValue, this.translator);
    }

    @Computed()
    get runHistory() {
        // History is replaced (never spliced), so identity invalidation is exact.
        return buildWorkflowRunHistory(this.designer, this.localeValue, this.translator);
    }

    @Computed()
    get runLogs() {
        // Cached so an execution without logs does not allocate a fresh array
        // on every read.
        return this.designer.execution?.logs || EMPTY_LOGS;
    }

    /**
     * Workflow-aware completion paths for the function code editor. Values are
     * collected from node configs so `context.actions.<name>` and variable
     * fields autocomplete against the current document.
     */
    get codeSuggestions(): string[] {
        const nodes = this.designer.nodes;
        const runContext = this.runContext;
        const cache = this.codeSuggestionCache;
        // `nodes` is a fresh array per document edit but the node objects
        // themselves are immutable, so per-node contributions can be reused.
        // The previous implementation re-serialized every node's config on each
        // keystroke (O(nodes) string work for a one-node change).
        if (cache && cache.nodes === nodes && cache.runContext === runContext) {
            return cache.values;
        }
        const base = this.environmentCodeSuggestions();
        const contributions = new Map<any, string[]>();
        const values = new Set<string>(base);
        let recomputed = false;
        for (const node of nodes) {
            let contribution = cache?.contributions.get(node);
            if (!contribution) {
                contribution = this.nodeCodeSuggestions(node);
                recomputed = true;
            }
            contributions.set(node, contribution);
            contribution.forEach(value => values.add(value));
        }
        if (cache && !recomputed && cache.runContext === runContext) {
            // Every node was reused; the union is unchanged.
            this.codeSuggestionCache = { nodes, runContext, contributions, values: cache.values };
            return cache.values;
        }
        const list = Array.from(values).slice(0, 320);
        this.codeSuggestionCache = { nodes, runContext, contributions, values: list };
        return list;
    }

    /**
     * Runtime bindings and host environment variables available to function
     * code. `context` is the workflow context; hosts pass extra data through
     * `runContext` (for example `variables`, `services`, `inbound` or custom
     * keys), and those names complete as `context.<key>` and
     * `context.variables.<name>`.
     */
    private environmentCodeSuggestions(): string[] {
        const values: string[] = [
            'context', 'input', 'msg', 'variables',
            'context.variables', 'context.actions', 'context.state', 'context.event', 'context.events',
            'context.inbound', 'context.services', 'context.workflowStatus', 'context.eventBus', 'context.waitEvent',
            'input.variables', 'input.actions', 'input.state', 'input.data', 'input.value', 'input.result',
            'msg.variables', 'msg.actions', 'msg.inbound',
            'process.env',
            'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw',
            'await', 'async', 'function'
        ];
        const environment = (this.runContext || {}) as Record<string, any>;
        const add = (value: any): void => {
            if (typeof value === 'string' && value.trim()) {
                values.push(value.trim());
            }
        };
        Object.keys(environment).forEach(key => {
            if (typeof environment[key] === 'function') {
                return;
            }
            add(`context.${key}`);
        });
        const variables = environment.variables;
        if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
            Object.keys(variables).forEach(name => {
                add(`context.variables.${name}`);
                add(`input.variables.${name}`);
            });
        }
        return values;
    }

    private nodeCodeSuggestions(node: { config?: Record<string, any> }): string[] {
        const values: string[] = [];
        const add = (value: any): void => {
            if (typeof value === 'string' && value.trim()) {
                values.push(value.trim());
            }
        };
        const config = node.config || {};
        if (typeof config.action === 'string') {
            const action = config.action.replace(/^actions\./, '');
            add(`context.actions.${action}`);
            add(`input.actions.${action}`);
        }
        if (typeof config.field === 'string') {
            add(config.field);
            if (!config.field.includes('.')) {
                add(`variables.${config.field}`);
                add(`context.variables.${config.field}`);
            }
        }
        if (typeof config.target === 'string') {
            add(config.target.includes('.') ? config.target : `variables.${config.target}`);
            if (!config.target.includes('.')) {
                add(`context.variables.${config.target}`);
            }
        }
        if (config.values && typeof config.values === 'object') {
            Object.keys(config.values).forEach(name => {
                add(`variables.${name}`);
                add(`context.variables.${name}`);
                add(`input.variables.${name}`);
            });
        }
        if (config.result && typeof config.result === 'object') {
            Object.keys(config.result).forEach(name => add(`input.${name}`));
        }
        if (typeof config.event === 'string') {
            add(`context.events.${config.event}`);
        }
        return values;
    }

    private toolbarModelKey(): any[] {
        const designer = this.designer;
        return [
            this.localeValue,
            designer.definition?.name || '',
            designer.nodes?.length || 0,
            designer.connections?.length || 0,
            // `selection` is replaced immutably, so its identity covers the
            // primary node, the multi-selection and the selected connection.
            // Reading `selectedNodeIds` here would allocate on every read.
            designer.selection,
            designer.canUndo,
            designer.canRedo,
            designer.canResume,
            designer.running,
            this.scheduling,
            designer.zoom,
            designer.execution?.status || ''
        ];
    }

    private statusModelKey(): any[] {
        const designer = this.designer;
        const selected = designer.selectedNode;
        return [
            this.localeValue,
            designer.message || '',
            designer.messageParams,
            designer.error || '',
            designer.errorParams,
            designer.running,
            designer.nodes?.length || 0,
            selected?.id || '',
            selected?.name || '',
            selected?.type || '',
            this.registry.revision,
            designer.zoom,
            // Identity, not just the status: progress follows each node state.
            designer.execution
        ];
    }

    notifyChange(): void {
        this.autosaveAction?.();
    }

    readonly toggleSchedule = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        if (self.scheduleHandle) {
            self.scheduleHandle.stop();
            self.scheduleHandle = undefined;
            self.scheduling = false;
            self.notifyChange();
            return;
        }
        const service = self.designer.service;
        if (!service) {
            self.designer.error = 'Scheduling is not available in this host';
            self.notifyChange();
            return;
        }
        self.scheduling = true;
        self.scheduleHandle = service.startSchedule(self.designer.definition, {
            context: self.runContext,
            onResult: result => {
                const execution = result.data?.executionState;
                if (execution) {
                    self.designer.execution = execution;
                }
                self.notifyChange();
            },
            onError: error => {
                self.designer.error = error.message;
                self.notifyChange();
            }
        });
        self.notifyChange();
    };

    /** Expand the bottom pane when a menu action needs to show its content. */
    protected expandBottomPane(): void {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.workspaceLayout?.expandPane?.('bottom');
    }

    readonly handleToolbarAction = (action: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        // A burst-delayed inspector edit is still pending; commands must see it.
        self.inspector?.formBlur();
        switch (action) {
            case 'schedule':
                self.toggleSchedule();
                break;
            case 'run':
                void self.designer.run({ context: self.runContext });
                break;
            case 'resume':
                void self.resumeWorkflow();
                break;
            case 'cancel':
                void self.designer.cancel();
                break;
            case 'undo':
                self.designer.undo();
                break;
            case 'redo':
                self.designer.redo();
                break;
            case 'delete':
                self.requestDeleteNodes();
                break;
            case 'zoom-in':
                self.designer.zoomIn();
                break;
            case 'zoom-out':
                self.designer.zoomOut();
                break;
            case 'reset-view':
                self.fitView();
                break;
            case 'auto-layout':
                self.designer.autoLayout();
                break;
            case 'duplicate':
                self.designer.duplicateSelection();
                break;
            case 'toggle-logs':
                self.showLogs = !self.showLogs;
                if (self.showLogs) {
                    self.expandBottomPane();
                }
                break;
            case 'config-nodes':
                self.openConfigNodes();
                break;
            case 'save':
                self.hostAction?.('save');
                break;
            case 'open-library':
                self.hostAction?.('open-library');
                break;
            case 'clear':
                self.designer.clear();
                break;
            case 'toggle-json':
                self.toggleJson();
                break;
            case 'shortcuts':
                self.toggleShortcuts();
                break;
            default:
                break;
        }
        self.notifyChange();
    };

    /** Fit every node into the visible canvas; falls back to 100%/origin. */
    fitView(): void {
        const viewport = this.canvasViewport();
        const nodes = this.designer.nodes;
        if (!viewport || !nodes.length) {
            this.designer.resetView();
            return;
        }
        const padding = 48;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodes.forEach(node => {
            const frame = workflowNodeFrame(node);
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + frame.width);
            maxY = Math.max(maxY, node.position.y + frame.height);
        });
        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const zoom = Math.max(
            0.25,
            Math.min(1.25, Math.min(
                (viewport.width - padding * 2) / contentWidth,
                (viewport.height - padding * 2) / contentHeight
            ))
        );
        this.designer.setZoom(zoom);
        const applied = this.designer.zoom || 1;
        this.designer.pan = {
            x: Math.round((viewport.width - contentWidth * applied) / 2 - minX * applied),
            y: Math.round((viewport.height - contentHeight * applied) / 2 - minY * applied)
        };
        const host = this.elementRef?.nativeElement as any;
        const document = (globalThis as { document?: Document }).document;
        const canvas = host?.querySelector?.('.workflow-canvas')
            || document?.querySelector?.('.workflow-canvas');
        if (canvas) {
            canvas.scrollLeft = 0;
            canvas.scrollTop = 0;
        }
    }

    readonly addFromPalette = (item: WorkflowPaletteItem): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.designer.addNode(item.type, self.nextAddPosition());
        self.notifyChange();
    };

    /**
     * New nodes use the stable grid slot when it is visible; after panning, the
     * visible canvas center is used instead so the node never appears offscreen.
     */
    private nextAddPosition(): NodePosition {
        const index = this.designer.nodes.length;
        const fallback: NodePosition = {
            x: 120 + (index % 3) * 220,
            y: 110 + Math.floor(index / 3) * 130
        };
        const bounds = this.viewportBounds();
        let preferred = fallback;
        if (bounds) {
            const visible = fallback.x >= bounds.left
                && fallback.x + 184 <= bounds.right
                && fallback.y >= bounds.top
                && fallback.y + 64 <= bounds.bottom;
            if (!visible) {
                preferred = {
                    x: Math.round((bounds.left + bounds.right) / 2 - 92),
                    y: Math.round((bounds.top + bounds.bottom) / 2 - 32)
                };
            }
        }
        return this.findFreePosition(preferred);
    }

    private canvasViewport(): { width: number; height: number } | undefined {
        const host = this.elementRef?.nativeElement as any;
        const document = (globalThis as { document?: Document }).document;
        const canvas = host?.querySelector?.('.workflow-canvas')
            || document?.querySelector?.('.workflow-canvas')
            || host;
        const rect = canvas?.getBoundingClientRect?.();
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
            return undefined;
        }
        return { width: rect.width, height: rect.height };
    }

    private connectionEnds(connection: { sourceNodeId: string; sourcePort: string; targetNodeId: string; targetPort: string }) {
        const source = this.designer.nodes.find(node => node.id === connection.sourceNodeId);
        const target = this.designer.nodes.find(node => node.id === connection.targetNodeId);
        if (!source || !target) {
            return undefined;
        }
        const sourceFrame = workflowNodeFrame(source);
        const outputIndex = Math.max(0, (source.outputs || [])
            .findIndex(port => port.id === connection.sourcePort));
        const inputIndex = Math.max(0, (target.inputs || [])
            .findIndex(port => port.id === connection.targetPort));
        return {
            start: {
                x: source.position.x + sourceFrame.width,
                y: source.position.y + WORKFLOW_PORT_START + outputIndex * WORKFLOW_PORT_SPACING - 5
            },
            end: {
                x: target.position.x,
                y: target.position.y + WORKFLOW_PORT_START + inputIndex * WORKFLOW_PORT_SPACING - 5
            }
        };
    }

    private connectionMidpoint(connectionId: string): { x: number; y: number } | undefined {
        const connection = this.designer.connections.find(item => item.id === connectionId);
        if (!connection) {
            return undefined;
        }
        const ends = this.connectionEnds(connection);
        return ends
            ? { x: (ends.start.x + ends.end.x) / 2, y: (ends.start.y + ends.end.y) / 2 }
            : undefined;
    }

    /** Nearest edge under a world point, used to insert nodes on wires. */
    private connectionAt(point: { x: number; y: number }, maxDistance: number) {
        let nearest: { id: string } | undefined;
        let nearestDistance = maxDistance;
        for (const connection of this.designer.connections) {
            const ends = this.connectionEnds(connection);
            if (!ends) {
                continue;
            }
            const distance = this.pointToSegment(point, ends.start, ends.end);
            if (distance <= nearestDistance) {
                nearestDistance = distance;
                nearest = connection;
            }
        }
        return nearest;
    }

    private pointToSegment(
        point: { x: number; y: number },
        start: { x: number; y: number },
        end: { x: number; y: number }
    ): number {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = dx * dx + dy * dy;
        if (!length) {
            return Math.hypot(point.x - start.x, point.y - start.y);
        }
        const t = Math.max(0, Math.min(1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / length
        ));
        return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
    }

    private canvasRect(): { left: number; top: number; width: number; height: number } | undefined {
        const host = this.elementRef?.nativeElement as any;
        const document = (globalThis as { document?: Document }).document;
        const canvas = host?.querySelector?.('.workflow-canvas')
            || document?.querySelector?.('.workflow-canvas')
            || host;
        const rect = canvas?.getBoundingClientRect?.();
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
            return undefined;
        }
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }

    private zoomAtPoint(payload: WorkflowCanvasPointerPayload, rect?: { left: number; top: number }): void {
        const delta = Number(payload.deltaY) || 0;
        if (!delta) {
            return;
        }
        const designer = this.designer;
        const before = designer.zoom || 1;
        const factor = delta < 0 ? 1.1 : 0.9;
        const zoom = Math.max(0.2, Math.min(2.5, before * factor));
        const px = (Number(payload.clientX) || 0) - (rect?.left || 0);
        const py = (Number(payload.clientY) || 0) - (rect?.top || 0);
        const pan = designer.pan || { x: 0, y: 0 };
        const worldX = (px - pan.x) / before;
        const worldY = (py - pan.y) / before;
        designer.setZoom(zoom);
        const applied = designer.zoom || zoom;
        designer.pan = {
            x: Math.round(px - worldX * applied),
            y: Math.round(py - worldY * applied)
        };
    }

    private viewportBounds(): { left: number; top: number; right: number; bottom: number } | undefined {
        const viewport = this.canvasViewport();
        if (!viewport) {
            return undefined;
        }
        const zoom = this.designer.zoom || 1;
        const pan = this.designer.pan || { x: 0, y: 0 };
        return {
            left: -pan.x / zoom,
            top: -pan.y / zoom,
            right: (viewport.width - pan.x) / zoom,
            bottom: (viewport.height - pan.y) / zoom
        };
    }

    private findFreePosition(preferred: NodePosition): NodePosition {
        const stepX = 220;
        const stepY = 130;
        const offsets = [0, 1, -1, 2, -2, 3, -3];
        for (let row = 0; row < 30; row++) {
            for (const offset of offsets) {
                const candidate = {
                    x: preferred.x + offset * stepX,
                    y: preferred.y + row * stepY
                };
                const overlaps = this.designer.nodes.some(node =>
                    Math.abs(node.position.x - candidate.x) < 184
                    && Math.abs(node.position.y - candidate.y) < 64
                );
                if (!overlaps) {
                    return candidate;
                }
            }
        }
        return preferred;
    }

    readonly paletteDragStart = (event: any, item: WorkflowPaletteItem): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.pendingNodeType = item.type;
        if (event?.dataTransfer) {
            event.dataTransfer.setData('application/x-tsdi-workflow-node', item.type);
            event.dataTransfer.effectAllowed = 'copy';
        }
        self.designer.message = 'workflow.message.dropHint';
        self.designer.messageParams = { name: item.label };
    };

    readonly handlePan = (dx: number, dy: number): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.designer.panBy(dx, dy);
    };

    readonly selectRun = (executionId: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.designer.selectExecution(executionId);
    };

    async resumeWorkflow(): Promise<void> {
        await this.designer.resume({ context: this.runContext });
    }

    readonly clearRuntimeState = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.designer?.service?.clearNodeRuntimeState(self.designer.definition.id);
        self.notifyChange();
    };

    readonly closeLogs = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        self.showLogs = false;
    };

    private connectToNode(nodeId: string): void {
        const draft = this.designer.connectionDraft;
        if (!draft) {
            return;
        }
        if (draft.sourceNodeId === nodeId) {
            this.designer.cancelConnection();
            return;
        }
        const node = this.designer.nodes.find(item => item.id === nodeId);
        if (!node) {
            this.designer.cancelConnection();
            return;
        }
        const ports = draft.sourceSide === 'input' ? node.outputs : node.inputs;
        if (!ports?.length) {
            this.designer.cancelConnection();
            return;
        }
        this.designer.completeConnection(nodeId, ports[0].id);
    }

    readonly handleCanvas = (payload: WorkflowCanvasPointerPayload): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        const designer = self.designer;
        if (self.showNodeMenu && payload.type !== 'node-context') {
            self.showNodeMenu = false;
        }
        switch (payload.type) {
            case 'background-down':
                // Clicking empty canvas is the explicit "cancel wire" gesture.
                if (designer.connectionDraft) {
                    designer.cancelConnection();
                } else {
                    designer.clearSelection();
                }
                break;
            case 'pointer-move':
                if (payload.world) {
                    if (designer.drag) {
                        designer.dragNodeTo(payload.world);
                    } else if (designer.connectionDraft) {
                        designer.updateConnectionDraft(payload.world);
                    }
                }
                break;
            case 'pointer-up':
                if (designer.drag) {
                    designer.endNodeDrag();
                } else if (designer.connectionDraft) {
                    designer.cancelConnection();
                }
                break;
            case 'pointer-leave':
                if (designer.drag) {
                    designer.endNodeDrag();
                } else if (designer.connectionDraft) {
                    designer.cancelConnection();
                }
                break;
            case 'node-down':
                if ((payload.shiftKey || payload.ctrlKey || payload.metaKey) && payload.nodeId) {
                    designer.selectNode(payload.nodeId, { additive: true });
                } else if (designer.connectionDraft && payload.nodeId) {
                    // Clicking a target node while a wire is pending connects to
                    // its first compatible port instead of starting a node drag.
                    self.connectToNode(payload.nodeId);
                } else if (payload.nodeId && payload.world) {
                    designer.beginNodeDrag(payload.nodeId, payload.world);
                }
                break;
            case 'node-up':
                if (designer.drag) {
                    designer.endNodeDrag();
                } else if (designer.connectionDraft && payload.nodeId) {
                    // Releasing anywhere on the target node body is enough; the
                    // user does not have to hit the small port dot.
                    self.connectToNode(payload.nodeId);
                }
                break;
            case 'node-context':
                if (payload.nodeId) {
                    if (!designer.selectedNodeIds.includes(payload.nodeId)) {
                        designer.selectNode(payload.nodeId);
                    }
                    self.showNodeMenu = true;
                    self.nodeMenuId = payload.nodeId;
                    self.nodeMenuX = payload.clientX || 0;
                    self.nodeMenuY = payload.clientY || 0;
                    self.notifyChange();
                }
                break;
            case 'box-select-start':
                self.selectionBox = {
                    x: payload.clientX || 0,
                    y: payload.clientY || 0,
                    width: 0,
                    height: 0
                };
                break;
            case 'box-select-move': {
                const start = self.selectionBox;
                const x = payload.clientX || 0;
                const y = payload.clientY || 0;
                if (start) {
                    self.selectionBox = {
                        x: Math.min(start.x, x),
                        y: Math.min(start.y, y),
                        width: Math.abs(x - start.x),
                        height: Math.abs(y - start.y)
                    };
                }
                break;
            }
            case 'box-select': {
                self.selectionBox = undefined;
                const box = payload.box;
                if (box) {
                    const ids = self.canvasModel.nodes
                        .filter(node => node.x < box.x + box.width
                            && node.x + node.width > box.x
                            && node.y < box.y + box.height
                            && node.y + node.height > box.y)
                        .map(node => node.id);
                    designer.selectNodes(ids, payload.additive === true);
                }
                break;
            }
            case 'group-down': {
                const group = (designer.definition.groups || [])
                    .find(item => item.id === payload.groupId);
                if (group?.nodeIds?.length && payload.world) {
                    designer.selectNodes(group.nodeIds);
                    designer.beginNodeDrag(group.nodeIds[0], payload.world);
                }
                break;
            }
            case 'group-remove':
                if (payload.groupId) {
                    designer.removeGroup(payload.groupId);
                }
                break;
            case 'group-toggle':
                if (payload.groupId) {
                    designer.toggleGroupCollapsed(payload.groupId);
                }
                break;
            case 'group-rename': {
                const group = (designer.definition.groups || [])
                    .find(item => item.id === payload.groupId);
                if (group) {
                    self.groupSettings?.open(group.id);
                    self.notifyChange();
                }
                break;
            }
            case 'edge-dblclick':
                if (payload.connectionId) {
                    self.quickAddSpliceId = payload.connectionId;
                    self.openQuickAdd();
                    self.quickAddSpliceId = payload.connectionId;
                }
                break;
            case 'edge-click':
                if (payload.connectionId) {
                    designer.selectConnection(payload.connectionId);
                }
                break;
            case 'port-down': {
                const side = payload.portType === 'input' ? 'input' : 'output';
                if (!payload.nodeId || !payload.portId || !payload.world) {
                    break;
                }
                const draft = designer.connectionDraft;
                if (draft) {
                    if ((draft.sourceSide || 'output') !== side) {
                        // Second click on the opposite port completes immediately.
                        designer.completeConnection(payload.nodeId, payload.portId);
                        break;
                    }
                    designer.cancelConnection();
                }
                designer.beginConnection(payload.nodeId, payload.portId, payload.world, side);
                break;
            }
            case 'port-up': {
                const draft = designer.connectionDraft;
                if (!draft || !payload.nodeId || !payload.portId) {
                    break;
                }
                const side = payload.portType === 'input' ? 'input' : 'output';
                const sourceSide = draft.sourceSide || 'output';
                if (side !== sourceSide) {
                    designer.completeConnection(payload.nodeId, payload.portId);
                } else if (payload.nodeId !== draft.sourceNodeId || payload.portId !== draft.sourcePort) {
                    // Dropping on another same-side port aborts the draft; a
                    // click on the original port keeps it for click-to-connect.
                    designer.cancelConnection();
                }
                break;
            }
            case 'drop': {
                const type = payload.nodeType || self.pendingNodeType;
                self.pendingNodeType = undefined;
                if (type && payload.world) {
                    const definition = self.registry.get(type as any);
                    const frame = definition
                        ? workflowNodeFrame({
                            type: definition.type,
                            position: { x: 0, y: 0 },
                            inputs: definition.inputs || [],
                            outputs: definition.outputs || []
                        } as any)
                        : { width: 184, height: 64 };
                    const position = {
                        x: Math.round(payload.world.x - frame.width / 2),
                        y: Math.round(payload.world.y - frame.height / 2)
                    };
                    const connection = definition?.inputs?.length && definition?.outputs?.length
                        ? self.connectionAt(payload.world, 24)
                        : undefined;
                    if (connection) {
                        designer.spliceNode(type as any, position, connection.id);
                    } else {
                        designer.addNode(type as any, position);
                    }
                }
                break;
            }
            case 'key-down':
                self.handleKey(payload);
                break;
            case 'wheel': {
                const rect = self.canvasRect();
                if (payload.ctrlKey || payload.metaKey) {
                    self.zoomAtPoint(payload, rect);
                } else {
                    const shift = !!payload.shiftKey;
                    const rawX = Number(payload.deltaX) || 0;
                    const rawY = Number(payload.deltaY) || 0;
                    const dx = shift && !rawX ? rawY : rawX;
                    const dy = shift && !rawX ? 0 : rawY;
                    designer.panBy(-dx, -dy);
                }
                break;
            }
            default:
                break;
        }
        if (payload.type === 'pointer-up'
            || payload.type === 'node-up'
            || payload.type === 'drop'
            || payload.type === 'port-down'
            || payload.type === 'port-up'
            || payload.type === 'key-down') {
            self.notifyChange();
        }
    };

    readonly inspectorRestore = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
        const node = self.designer.selectedNode;
        if (node) {
            self.designer.resetNodeConfig(node.id);
            self.notifyChange();
        }
    };

    readonly inspectorChange = (key: string, value: any, type: string, nodeId?: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerPreviewComponent;
                const node = nodeId
            ? self.designer.nodes.find(item => item.id === nodeId)
            : self.designer.selectedNode;
        if (!node) {
            return;
        }
        if (key === 'name') {
            self.designer.renameNode(node.id, String(value));
            self.notifyChange();
            return;
        }
        if (key === 'description') {
            self.designer.updateNode(node.id, { description: String(value) });
            self.notifyChange();
            return;
        }
        if (key === 'enabled') {
            self.designer.updateNode(node.id, { disabled: value === false });
            self.notifyChange();
            return;
        }
        if (key === 'icon' || key === 'color') {
            const style = { ...(node.style || {}) };
            const next = String(value ?? '').trim();
            if (key === 'icon') {
                if (next) {
                    style.icon = next;
                } else {
                    delete style.icon;
                }
            } else if (next) {
                style.backgroundColor = next;
            } else {
                delete style.backgroundColor;
            }
            self.designer.updateNode(node.id, { style });
            self.notifyChange();
            return;
        }
        if (type === 'list') {
            self.designer.updateNodeConfig(node.id, {
                [key]: Array.isArray(value) ? value : []
            });
            self.notifyChange();
            return;
        }
        let parsed = value;
        if (type === 'json') {
            if (value && typeof value === 'object') {
                parsed = value;
            } else if (String(value ?? '').trim() === '') {
                parsed = undefined;
            } else {
                try {
                    parsed = JSON.parse(String(value));
                } catch (error) {
                    self.designer.error = `Invalid JSON: ${(error as Error).message}`;
                    return;
                }
            }
        } else if (type === 'number') {
            parsed = value === '' || value === undefined || value === null ? undefined : Number(value);
            if (typeof parsed === 'number' && !Number.isFinite(parsed)) {
                self.designer.error = 'Invalid number';
                return;
            }
        } else if (type === 'boolean') {
            parsed = !!value;
        } else if (type === 'list') {
            parsed = Array.isArray(value) ? value : [];
        } else {
            parsed = String(value ?? '');
        }
        self.designer.updateNodeConfig(node.id, { [key]: parsed });
        self.notifyChange();
    };

    toggleJson(): void {
        this.showJson = !this.showJson;
        if (this.showJson) {
            this.jsonText = this.designer.toJSON();
            this.jsonError = '';
        }
    }

    applyJson(): void {
        const loaded = this.designer.load(this.jsonText, true);
        if (loaded && this.designer.validate().valid) {
            this.jsonError = '';
            this.showJson = false;
            this.notifyChange();
        } else {
            this.jsonError = this.designer.error || 'Invalid workflow JSON';
        }
    }

    private handleKey(payload: WorkflowCanvasPointerPayload): void {
        const key = payload.key || '';
        if (key === 'Delete' || key === 'Backspace') {
            this.requestDeleteNodes();
            return;
        }
        if (key === 'Escape') {
            if (this.showNodeMenu) {
                this.closeNodeMenu();
                return;
            }
            this.designer.cancelConnection();
            this.designer.endNodeDrag();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'c' || key === 'C')) {
            this.designer.copySelection();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'x' || key === 'X')) {
            this.designer.cutSelection();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'v' || key === 'V')) {
            this.designer.pasteClipboard();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'k' || key === 'K')) {
            this.openQuickAdd();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'f' || key === 'F')) {
            this.openFind();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'g' || key === 'G')) {
            if (payload.shiftKey) {
                this.designer.ungroupSelection();
            } else {
                this.designer.groupSelection();
            }
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'e' || key === 'E')) {
            if (this.designer.toggleSelectionDisabled()) {
                this.notifyChange();
            }
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'z' || key === 'Z')) {
            if (payload.shiftKey) {
                this.designer.redo();
            } else {
                this.designer.undo();
            }
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'y' || key === 'Y')) {
            this.designer.redo();
            return;
        }
        if ((payload.ctrlKey || payload.metaKey) && (key === 'd' || key === 'D')) {
            this.designer.duplicateSelection();
        }
    }
}
