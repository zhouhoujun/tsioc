import { Attribute, Component, ElementRef, ReactiveEffect, reactive } from '@tsdi/components';
import { installWorkspaceLayoutStyles, markElementRefRaw } from '@tsdi/components/common';
import { applyThemeToDocument, isThemeName, ThemeName } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { Inject, Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { ActivityContext } from '../../activities/Activity';
import { WorkflowNodeRegistry } from '../node-registry';
import { VisualWorkflowService } from '../VisualWorkflowService';
import { createDefaultWorkflowDefinition, WorkflowDesigner } from '../workflow-designer';
import {
    NodePosition,
    VisualWorkflowDefinition,
    WorkflowPaletteItem,
    WorkflowPaletteGroup
} from '../types';
import {
    buildWorkflowCanvasModel,
    buildWorkflowInspectorModel,
    buildWorkflowPalette,
    buildWorkflowRunHistory,
    buildWorkflowStatusModel,
    buildWorkflowToolbarModel,
    workflowNodeFrame
} from '../workflow-view-models';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    createDefaultWorkflowDefinitionStore
} from '../workflow-store';
import { WorkflowCanvasPointerPayload } from './workflow-canvas';
import { installWorkflowDesignerStyles } from './workflow-designer.styles';
/**
 * Root visual workflow designer.
 *
 * Composition:
 *  - palette (generic node components, drag to canvas or click to add),
 *  - canvas (drag nodes, drag between ports to connect, pan/zoom),
 *  - inspector (edit node config),
 *  - toolbar/status bar (run, stop, undo/redo, JSON import/export),
 *  - live execution path (node/edge state from VisualWorkflowService events).
 *
 * Visual styling lives in `workflow-designer.styles.ts`; templates only carry
 * semantic class names and layout data.
 */
@Component({
    selector: 'workflow-designer',
    template: `
    <div class="workflow-designer" data-theme="{{themeName}}">
        <workflow-toolbar :model="toolbarModel" :locale="locale" :action="toolbarAction"
            :theme="themeName" :toggleThemeAction="toggleTheme"></workflow-toolbar>
        <workspace-layout class="workflow-workspace">
            <workspace-left>
                <workflow-palette :groups="paletteGroups" :locale="locale"
                    :addAction="addFromPalette" :dragStartAction="paletteDragStart"></workflow-palette>
            </workspace-left>
            <workspace-center>
                <workflow-canvas :model="canvasModel" :locale="locale"
                    :pointerAction="handleCanvas" :panAction="handlePan"></workflow-canvas>
            </workspace-center>
            <workspace-right>
                <workflow-inspector :model="inspectorModel" :locale="locale"
                    :changeAction="inspectorChange"></workflow-inspector>
            </workspace-right>
            <workspace-bottom>
                <workflow-run-history :items="runHistory" :locale="locale"
                    :selectAction="selectRun"></workflow-run-history>
                <div class="workflow-statusbar">
                    <span class="workflow-status-message">{{statusModel.message}}</span>
                    <span class="workflow-status-error" v-if="statusModel.error">{{statusModel.error}}</span>
                    <span class="workflow-status-spacer"></span>
                    <span class="workflow-status-selected">{{statusModel.selectedLabel}}</span>
                    <span>{{statusModel.nodeCount}} {{nodeWord}}</span>
                    <span>{{statusModel.executionLabel}}</span>
                    <span>{{statusModel.zoomLabel}}</span>
                </div>
                <workflow-run-log :items="runLogs" :visible="showLogs" :locale="locale"
                    :closeAction="closeLogs"></workflow-run-log>
            </workspace-bottom>
        </workspace-layout>
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
        <workflow-library :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
    </div>`
})
export class WorkflowDesignerComponent {
    @Attribute() locale = 'zh-CN';
    @Attribute() theme: ThemeName = 'light';
    /** Optional host hook to persist a user-selected theme. */
    @Attribute() themeChangeAction?: (theme: ThemeName) => void;
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() initialDefinition?: VisualWorkflowDefinition | string;
    @Attribute() runContext: ActivityContext = {};
    @Attribute() autoRun = false;
    @Attribute() store: WorkflowDefinitionStore = createDefaultWorkflowDefinitionStore();

    readonly registry: WorkflowNodeRegistry;
    private readonly service?: VisualWorkflowService;

    showJson = false;
    showLogs = false;
    showLibrary = false;
    libraryError = '';
    libraryItems: WorkflowDefinitionSummary[] = [];
    jsonText = '';
    /** Set in onInit to the reactive component proxy (arrow callbacks capture the raw instance). */
    private selfRef?: any;
    jsonError = '';
    private pendingNodeType?: string;

    constructor(
        @Optional() registry?: WorkflowNodeRegistry,
        @Optional() service?: VisualWorkflowService,
        @Optional() @Inject(DOCUMENT) document?: any,
        @Optional() private translator?: Translator,
        @Optional() effect?: ReactiveEffect,
        @Optional() private elementRef?: ElementRef
    ) {
        markElementRefRaw(elementRef);
        this.registry = registry || new WorkflowNodeRegistry();
        this.service = service;
        // Install before the instance is wrapped by the reactive proxy: reading
        // a Document through the proxy would wrap its DOM internals.
        installWorkflowDesignerStyles(document);
        installWorkspaceLayoutStyles(document);
        applyThemeToDocument(document, this.themeName);
        const rawDesigner = new WorkflowDesigner({
            registry: this.registry,
            service,
            definition: createDefaultWorkflowDefinition(this.registry, this.localeValue, translator)
        });
        // Callback fields are arrow functions and capture the raw component
        // instance, so the designer must carry the same reactive effect as the
        // root component. Every callback then writes through this proxy and
        // updates the canvas/inspector bindings.
        this.designer = effect ? reactive(rawDesigner, effect) : rawDesigner;
    }

    onInit(): void {
        this.selfRef = this;
        if (this.initialDefinition) {
            this.designer.load(this.initialDefinition);
        }
        if (this.autoRun) {
            void this.designer.run({ context: this.runContext });
        }
    }

    get localeValue(): 'zh-CN' | 'en' {
        return String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
    }

    get themeName(): ThemeName {
        return isThemeName(this.theme) ? this.theme : 'light';
    }

    setTheme(theme: ThemeName): void {
        this.theme = isThemeName(theme) ? theme : 'light';
        const doc = (globalThis as { document?: Document }).document;
        applyThemeToDocument(doc, this.theme);
        this.themeChangeAction?.(this.themeName);
    }

    get isZh(): boolean {
        return this.localeValue === 'zh-CN';
    }

    private t(key: string, fallback: string): string {
        return translateWorkflow(this.translator, this.localeValue, `workflow.ui.${key}`, fallback);
    }

    get nodeWord(): string {
        return this.t('nodeWord', 'nodes');
    }

    get jsonTitle(): string {
        return this.t('jsonTitle', 'Workflow JSON (generated visually)');
    }

    get applyLabel(): string {
        return this.t('apply', 'Apply');
    }

    get closeLabel(): string {
        return this.t('close', 'Close');
    }

    get paletteGroups(): WorkflowPaletteGroup[] {
        return buildWorkflowPalette(this.registry, this.localeValue, this.translator);
    }

    get canvasModel() {
        return buildWorkflowCanvasModel(this.designer, this.registry, this.localeValue, this.translator);
    }

    get inspectorModel() {
        return buildWorkflowInspectorModel(this.designer, this.registry, this.localeValue, this.translator);
    }

    get toolbarModel() {
        return buildWorkflowToolbarModel(this.designer, this.localeValue, this.translator);
    }

    get statusModel() {
        return buildWorkflowStatusModel(this.designer, this.localeValue, this.translator);
    }

    get runHistory() {
        return buildWorkflowRunHistory(this.designer, this.localeValue, this.translator);
    }

    get runLogs() {
        return this.designer.execution?.logs || [];
    }

    readonly toolbarAction = (action: string): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        switch (action) {
            case 'run':
                void this.designer.run({ context: this.runContext });
                break;
            case 'resume':
                void self.resumeWorkflow();
                break;
            case 'cancel':
                void this.designer.cancel();
                break;
            case 'undo':
                this.designer.undo();
                break;
            case 'redo':
                this.designer.redo();
                break;
            case 'delete':
                this.designer.deleteSelection();
                break;
            case 'zoom-in':
                this.designer.zoomIn();
                break;
            case 'zoom-out':
                this.designer.zoomOut();
                break;
            case 'reset-view':
                self.fitView();
                break;
            case 'auto-layout':
                this.designer.autoLayout();
                break;
            case 'duplicate':
                this.designer.duplicateSelection();
                break;
            case 'toggle-logs':
                self.showLogs = !self.showLogs;
                break;
            case 'toggle-theme':
                self.toggleTheme();
                break;
            case 'save':
                void self.saveWorkflow();
                break;
            case 'open-library':
                void self.openLibrary();
                break;
            case 'clear':
                this.designer.clear();
                break;
            case 'toggle-json':
                self.toggleJson();
                break;
            default:
                break;
        }
    };

    /** Fit every node into the visible canvas; falls back to 100%/origin. */
    readonly fitView = (): void => {
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
    };

    readonly addFromPalette = (item: WorkflowPaletteItem): void => {
        this.designer.addNode(item.type, this.nextAddPosition());
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
        const canvas = host?.querySelector?.('.workflow-canvas') || host;
        const rect = canvas?.getBoundingClientRect?.();
        if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
            return undefined;
        }
        return { width: rect.width, height: rect.height };
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

    readonly paletteDragStart = (_event: any, item: WorkflowPaletteItem): void => {
        this.pendingNodeType = item.type;
        this.designer.message = 'workflow.message.dropHint';
        this.designer.messageParams = { name: item.label };
    };

    readonly handlePan = (dx: number, dy: number): void => {
        this.designer.panBy(dx, dy);
    };

    readonly selectRun = (executionId: string): void => {
        this.designer.selectExecution(executionId);
    };

    readonly toggleTheme = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        const order: ThemeName[] = ['light', 'dark', 'solarized', 'high-contrast'];
        const index = order.indexOf(self.themeName);
        self.setTheme(order[(index + 1) % order.length]);
    };

    readonly resumeWorkflow = async (): Promise<void> => {
        await this.designer.resume({ context: this.runContext });
    };

    readonly closeLogs = (): void => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        self.showLogs = false;
    };

    readonly openLibrary = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            self.libraryItems = await this.designer.listSaved(this.store);
            self.libraryError = '';
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
        self.showLibrary = true;
    };

    readonly saveWorkflow = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            await this.designer.saveTo(this.store);
            self.libraryError = '';
            await self.refreshLibrary();
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
    };

    readonly saveWorkflowAs = async (): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            await this.designer.saveTo(this.store, {
                as: true,
                name: `${this.designer.definition.name} copy`
            });
            self.libraryError = '';
            await self.refreshLibrary();
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
    };

    readonly loadWorkflow = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            const loaded = await this.designer.openFrom(this.store, id);
            if (loaded) {
                self.libraryError = '';
                self.showLibrary = false;
            } else {
                self.libraryError = this.designer.error;
            }
        } catch (error) {
            self.libraryError = (error as Error).message;
        }
    };

    readonly deleteWorkflow = async (id: string): Promise<void> => {
        const self = (this.selfRef || this) as WorkflowDesignerComponent;
        try {
            await this.designer.removeSaved(this.store, id);
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
        self.libraryItems = await this.designer.listSaved(this.store);
    }

    readonly handleCanvas = (payload: WorkflowCanvasPointerPayload): void => {
        const designer = this.designer;
        switch (payload.type) {
            case 'background-down':
                designer.clearSelection();
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
                }
                break;
            case 'node-down':
                if (payload.nodeId && payload.world) {
                    designer.beginNodeDrag(payload.nodeId, payload.world);
                }
                break;
            case 'node-up':
                if (designer.drag) {
                    designer.endNodeDrag();
                }
                break;
            case 'edge-click':
                if (payload.connectionId) {
                    designer.selectConnection(payload.connectionId);
                }
                break;
            case 'port-down':
                if (payload.portType === 'output' && payload.nodeId && payload.portId && payload.world) {
                    designer.beginConnection(payload.nodeId, payload.portId, payload.world);
                }
                break;
            case 'port-up':
                if (payload.portType === 'input' && payload.nodeId && payload.portId && designer.connectionDraft) {
                    designer.completeConnection(payload.nodeId, payload.portId);
                }
                break;
            case 'drop': {
                const type = payload.nodeType || this.pendingNodeType;
                this.pendingNodeType = undefined;
                if (type && payload.world) {
                    designer.addNode(type as any, {
                        x: Math.round(payload.world.x - 92),
                        y: Math.round(payload.world.y - 32)
                    });
                }
                break;
            }
            case 'key-down':
                this.handleKey(payload);
                break;
            default:
                break;
        }
    };

    readonly inspectorChange = (key: string, value: any, type: string): void => {
        const node = this.designer.selectedNode;
        if (!node) {
            return;
        }
        if (key === 'name') {
            this.designer.renameNode(node.id, String(value));
            return;
        }
        if (key === 'description') {
            this.designer.updateNode(node.id, { description: String(value) });
            return;
        }
        let parsed = value;
        if (type === 'json') {
            if (String(value ?? '').trim() === '') {
                parsed = undefined;
            } else {
                try {
                    parsed = JSON.parse(String(value));
                } catch (error) {
                    this.designer.error = `Invalid JSON: ${(error as Error).message}`;
                    return;
                }
            }
        } else if (type === 'number') {
            parsed = value === '' || value === undefined || value === null ? undefined : Number(value);
            if (typeof parsed === 'number' && !Number.isFinite(parsed)) {
                this.designer.error = 'Invalid number';
                return;
            }
        } else if (type === 'boolean') {
            parsed = !!value;
        } else {
            parsed = String(value ?? '');
        }
        this.designer.updateNodeConfig(node.id, { [key]: parsed });
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
        } else {
            this.jsonError = this.designer.error || 'Invalid workflow JSON';
        }
    }

    private handleKey(payload: WorkflowCanvasPointerPayload): void {
        const key = payload.key || '';
        if (key === 'Delete' || key === 'Backspace') {
            this.designer.deleteSelection();
            return;
        }
        if (key === 'Escape') {
            this.designer.cancelConnection();
            this.designer.endNodeDrag();
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

export { createDefaultWorkflowDefinition };
