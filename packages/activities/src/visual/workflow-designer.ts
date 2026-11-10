import { ActivityContext, ActivityResult } from '../activities/Activity';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from './i18n';
import {
    IVisualWorkflowNode,
    NodeConnection,
    NodePosition,
    VisualWorkflowDefinition,
    WorkflowConnectionDraft,
    WorkflowExecutionEvent,
    WorkflowExecutionOptions,
    WorkflowExecutionSnapshot,
    WorkflowNodeDragState,
    WorkflowSelection
} from './types';
import { WorkflowNodeRegistry, WorkflowLocale } from './node-registry';
import { hasCycle, validateVisualWorkflow } from './workflow-runtime';
import { compileVisualWorkflow, CompiledWorkflow, layoutVisualWorkflow } from './workflow-compiler';
import { VisualWorkflowService } from './VisualWorkflowService';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    WorkflowStoreSaveOptions
} from './workflow-store';

const HISTORY_LIMIT = 100;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

export interface WorkflowDesignerRunOptions extends WorkflowExecutionOptions {
    context?: ActivityContext;
}

export interface WorkflowDesignerOptions {
    definition?: VisualWorkflowDefinition;
    service?: VisualWorkflowService;
    registry?: WorkflowNodeRegistry;
}

function cloneDefinition(definition: VisualWorkflowDefinition): VisualWorkflowDefinition {
    return JSON.parse(JSON.stringify(definition));
}

function nowId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Build the default editor document: start → task → condition → branches → end.
 * Generated through the same public designer API so it is a valid user flow.
 */
export function createDefaultWorkflowDefinition(
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): VisualWorkflowDefinition {
    const t = (key: string, fallback: string): string =>
        translateWorkflow(translator, locale, `workflow.demo.${key}`, fallback);
    const make = (type: IVisualWorkflowNode['type'], id: string, name: string, x: number, y: number, config?: Record<string, any>) =>
        registry.createNode(type, { x, y }, { id, name, config });

    const start = make('start', 'start_1', t('start', locale === 'zh-CN' ? '开始' : 'Start'), 80, 220);
    const fetch = make('task', 'task_1', t('loadInput', locale === 'zh-CN' ? '读取输入' : 'Load input'), 330, 220, {
        action: 'loadInput',
        result: { approved: true }
    });
    const condition = make('condition', 'condition_1', t('approved', locale === 'zh-CN' ? '是否通过' : 'Approved?'), 590, 220, {
        field: 'approved',
        operator: 'truthy'
    });
    const approve = make('task', 'task_2', t('approve', locale === 'zh-CN' ? '通过处理' : 'Approve'), 850, 120, {
        result: { approved: true }
    });
    const reject = make('task', 'task_3', t('reject', locale === 'zh-CN' ? '拒绝处理' : 'Reject'), 850, 320, {
        result: { approved: false }
    });
    const end = make('end', 'end_1', t('end', locale === 'zh-CN' ? '结束' : 'End'), 1110, 220);

    const connection = (id: string, source: string, sourcePort: string, target: string): NodeConnection => ({
        id,
        sourceNodeId: source,
        sourcePort,
        targetNodeId: target,
        targetPort: 'in'
    });

    return {
        id: 'workflow_demo',
        name: t('name', locale === 'zh-CN' ? '审批流程示例' : 'Approval workflow'),
        description: t('description', locale === 'zh-CN'
            ? '拖拽节点、连接端口并运行，实时查看执行路径。'
            : 'Drag nodes, connect ports, run it, and inspect the live path.'),
        version: '1.0.0',
        nodes: [start, fetch, condition, approve, reject, end],
        connections: [
            connection('conn_1', 'start_1', 'out', 'task_1'),
            connection('conn_2', 'task_1', 'out', 'condition_1'),
            connection('conn_3', 'condition_1', 'true', 'task_2'),
            connection('conn_4', 'condition_1', 'false', 'task_3'),
            connection('conn_5', 'task_2', 'out', 'end_1'),
            connection('conn_6', 'task_3', 'out', 'end_1')
        ],
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };
}

/**
 * Renderer-neutral workflow designer model. It owns editing, validation,
 * connection drafting, undo/redo, serialization and live execution snapshots;
 * DOM/TUI/console components only project this state.
 */
export class WorkflowDesigner {
    definition: VisualWorkflowDefinition;
    selection: WorkflowSelection = {};
    zoom = 1;
    pan: NodePosition = { x: 0, y: 0 };
    connectionDraft?: WorkflowConnectionDraft;
    drag?: WorkflowNodeDragState;
    execution?: WorkflowExecutionSnapshot;
    executionHistory: WorkflowExecutionSnapshot[] = [];
    selectedExecutionId?: string;
    checkpoint?: WorkflowExecutionSnapshot;
    running = false;
    dirty = false;
    gridSize = 10;
    snapToGrid = true;
    message = '';
    error = '';
    messageParams: Record<string, any> = {};
    errorParams: Record<string, any> = {};

    readonly registry: WorkflowNodeRegistry;
    readonly service?: VisualWorkflowService;

    private undoStack: string[] = [];
    private redoStack: string[] = [];
    private dragStartSnapshot?: string;
    private activeExecutionId?: string;

    constructor(options: WorkflowDesignerOptions = {}) {
        this.registry = options.registry || new WorkflowNodeRegistry();
        this.service = options.service;
        this.definition = options.definition || createDefaultWorkflowDefinition(this.registry);
        this.normalize();
    }

    get nodes(): IVisualWorkflowNode[] {
        return this.definition.nodes;
    }

    get connections(): NodeConnection[] {
        return this.definition.connections;
    }

    get selectedNode(): IVisualWorkflowNode | undefined {
        if (!this.selection.nodeId) {
            return undefined;
        }
        return this.definition.nodes.find(node => node.id === this.selection.nodeId);
    }

    get selectedConnection(): NodeConnection | undefined {
        if (!this.selection.connectionId) {
            return undefined;
        }
        return this.definition.connections.find(connection => connection.id === this.selection.connectionId);
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get canResume(): boolean {
        return !!this.checkpoint
            && !this.running
            && this.checkpoint.status !== 'completed';
    }

    get resumeExecutionId(): string | undefined {
        return this.checkpoint?.executionId;
    }

    get executionId(): string | undefined {
        return this.activeExecutionId;
    }

    get isConnecting(): boolean {
        return !!this.connectionDraft;
    }

    get isDragging(): boolean {
        return !!this.drag;
    }

    // ---------------------------------------------------------------------
    // Editing
    // ---------------------------------------------------------------------

    addNode(
        type: IVisualWorkflowNode['type'],
        position: NodePosition,
        options: { name?: string; config?: Record<string, any> } = {}
    ): IVisualWorkflowNode | undefined {
        const definition = this.registry.get(type);
        if (!definition) {
            this.setError('workflow.error.unknownType', { type });
            return undefined;
        }
        if (definition.singleton && this.definition.nodes.some(node => node.type === type)) {
            this.setError('workflow.error.singleton', { label: definition.label });
            return undefined;
        }
        const node = this.registry.createNode(type, position, {
            id: this.nextNodeId(type),
            ...options
        });
        this.commit(current => ({
            ...current,
            nodes: [...current.nodes, node],
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = { nodeId: node.id };
        this.clearError();
        this.setMessage('workflow.message.added', { name: node.name });
        return node;
    }

    removeNode(nodeId: string): boolean {
        if (!this.definition.nodes.some(node => node.id === nodeId)) {
            return false;
        }
        this.commit(current => ({
            ...current,
            nodes: current.nodes.filter(node => node.id !== nodeId),
            connections: current.connections.filter(connection =>
                connection.sourceNodeId !== nodeId && connection.targetNodeId !== nodeId
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        if (this.selection.nodeId === nodeId) {
            this.selection = {};
        }
        this.setMessage('workflow.message.nodeRemoved');
        return true;
    }

    moveNode(nodeId: string, position: NodePosition): boolean {
        const x = Number.isFinite(position?.x) ? position.x : 0;
        const y = Number.isFinite(position?.y) ? position.y : 0;
        const node = this.definition.nodes.find(item => item.id === nodeId);
        if (!node) {
            return false;
        }
        const rounded = this.snapPosition({ x, y });
        if (node.position.x === rounded.x && node.position.y === rounded.y) {
            return false;
        }
        this.applyDefinition({
            ...this.definition,
            nodes: this.definition.nodes.map(item =>
                item.id === nodeId ? { ...item, position: rounded } : item
            )
        });
        return true;
    }

    updateNode(nodeId: string, patch: Partial<IVisualWorkflowNode>): boolean {
        const node = this.definition.nodes.find(item => item.id === nodeId);
        if (!node) {
            return false;
        }
        this.commit(current => ({
            ...current,
            nodes: current.nodes.map(item => item.id === nodeId ? { ...item, ...patch, id: item.id } : item),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.nodeUpdated');
        return true;
    }

    updateNodeConfig(nodeId: string, patch: Record<string, any>): boolean {
        const node = this.definition.nodes.find(item => item.id === nodeId);
        if (!node) {
            return false;
        }
        return this.updateNode(nodeId, {
            config: { ...(node.config || {}), ...patch }
        });
    }

    /** Restore a node's config to the registry defaults. */
    resetNodeConfig(nodeId: string): boolean {
        const node = this.definition.nodes.find(item => item.id === nodeId);
        if (!node) {
            return false;
        }
        return this.updateNode(nodeId, {
            config: this.registry.defaultConfig(node.type)
        });
    }

    renameNode(nodeId: string, name: string): boolean {
        return this.updateNode(nodeId, { name: String(name || '').trim() || nodeId });
    }

    setSelection(selection: WorkflowSelection): void {
        this.selection = { ...selection };
        this.clearError();
    }

    selectNode(nodeId: string): void {
        this.setSelection({ nodeId });
    }

    selectConnection(connectionId: string): void {
        this.setSelection({ connectionId });
    }

    clearSelection(): void {
        this.selection = {};
    }

    deleteSelection(): boolean {
        if (this.selection.nodeId) {
            return this.removeNode(this.selection.nodeId);
        }
        if (this.selection.connectionId) {
            return this.removeConnection(this.selection.connectionId);
        }
        return false;
    }

    addConnection(
        sourceNodeId: string,
        sourcePort: string | undefined,
        targetNodeId: string,
        targetPort: string | undefined
    ): NodeConnection | undefined {
        const source = this.definition.nodes.find(node => node.id === sourceNodeId);
        const target = this.definition.nodes.find(node => node.id === targetNodeId);
        if (!source || !target) {
            this.setError('workflow.error.endpoints');
            return undefined;
        }
        if (sourceNodeId === targetNodeId) {
            this.setError('workflow.error.selfLink');
            return undefined;
        }
        const resolvedSourcePort = sourcePort || source.outputs?.[0]?.id || 'out';
        const resolvedTargetPort = targetPort || target.inputs?.[0]?.id || 'in';
        if (source.outputs?.length && !source.outputs.some(port => port.id === resolvedSourcePort)) {
            this.setError('workflow.error.unknownOutput', { port: resolvedSourcePort });
            return undefined;
        }
        if (target.inputs?.length && !target.inputs.some(port => port.id === resolvedTargetPort)) {
            this.setError('workflow.error.unknownInput', { port: resolvedTargetPort });
            return undefined;
        }
        const duplicate = this.definition.connections.find(connection =>
            connection.sourceNodeId === sourceNodeId
            && connection.sourcePort === resolvedSourcePort
            && connection.targetNodeId === targetNodeId
            && connection.targetPort === resolvedTargetPort
        );
        if (duplicate) {
            this.selection = { connectionId: duplicate.id };
            return duplicate;
        }

        const connection: NodeConnection = {
            id: this.nextConnectionId(),
            sourceNodeId,
            sourcePort: resolvedSourcePort,
            targetNodeId,
            targetPort: resolvedTargetPort
        };
        const next: VisualWorkflowDefinition = {
            ...this.definition,
            connections: [...this.definition.connections, connection]
        };
        if (hasCycle(next)) {
            this.setError('workflow.error.cycle');
            return undefined;
        }
        this.commit(() => ({
            ...next,
            metadata: { ...(next.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = { connectionId: connection.id };
        this.clearError();
        this.setMessage('workflow.message.connected');
        return connection;
    }

    removeConnection(connectionId: string): boolean {
        if (!this.definition.connections.some(connection => connection.id === connectionId)) {
            return false;
        }
        this.commit(current => ({
            ...current,
            connections: current.connections.filter(connection => connection.id !== connectionId),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        if (this.selection.connectionId === connectionId) {
            this.selection = {};
        }
        this.setMessage('workflow.message.connectionRemoved');
        return true;
    }

    // ---------------------------------------------------------------------
    // Drag / connect gestures (called by canvas components)
    // ---------------------------------------------------------------------

    beginNodeDrag(nodeId: string, world: NodePosition): boolean {
        const node = this.definition.nodes.find(item => item.id === nodeId);
        if (!node) {
            return false;
        }
        this.selection = { nodeId };
        this.drag = {
            nodeId,
            startX: node.position.x,
            startY: node.position.y,
            offsetX: world.x - node.position.x,
            offsetY: world.y - node.position.y,
            moved: false
        };
        this.dragStartSnapshot = this.snapshot();
        return true;
    }

    dragNodeTo(world: NodePosition): void {
        if (!this.drag) {
            return;
        }
        const x = Math.round(world.x - this.drag.offsetX);
        const y = Math.round(world.y - this.drag.offsetY);
        const snapped = this.snapPosition({ x, y });
        if (snapped.x === this.definition.nodes.find(node => node.id === this.drag!.nodeId)?.position.x
            && snapped.y === this.definition.nodes.find(node => node.id === this.drag!.nodeId)?.position.y) {
            return;
        }
        this.drag.moved = true;
        this.applyDefinition({
            ...this.definition,
            nodes: this.definition.nodes.map(node =>
                node.id === this.drag!.nodeId ? { ...node, position: snapped } : node
            )
        });
    }

    endNodeDrag(): boolean {
        const moved = !!this.drag?.moved;
        if (moved && this.dragStartSnapshot) {
            this.pushHistory(this.dragStartSnapshot);
            this.redoStack = [];
            this.dirty = true;
        }
        this.drag = undefined;
        this.dragStartSnapshot = undefined;
        return moved;
    }

    cancelNodeDrag(): void {
        if (this.drag && this.dragStartSnapshot && this.drag.moved) {
            this.applyDefinition(JSON.parse(this.dragStartSnapshot));
        }
        this.drag = undefined;
        this.dragStartSnapshot = undefined;
    }

    beginConnection(
        nodeId: string,
        sourcePort: string,
        world: NodePosition,
        sourceSide: 'input' | 'output' = 'output'
    ): boolean {
        const node = this.definition.nodes.find(item => item.id === nodeId);
        const ports = sourceSide === 'input' ? node?.inputs : node?.outputs;
        if (!node || !(ports || []).some(port => port.id === sourcePort)) {
            return false;
        }
        this.connectionDraft = {
            sourceNodeId: nodeId,
            sourcePort,
            sourceSide,
            x: world.x,
            y: world.y
        };
        this.setMessage('workflow.message.connectHint');
        return true;
    }

    updateConnectionDraft(world: NodePosition): void {
        if (!this.connectionDraft) {
            return;
        }
        this.connectionDraft = { ...this.connectionDraft, x: world.x, y: world.y };
    }

    completeConnection(targetNodeId: string, targetPort?: string): NodeConnection | undefined {
        const draft = this.connectionDraft;
        if (!draft) {
            return undefined;
        }
        this.connectionDraft = undefined;
        // Starting from an input creates the same directed connection as an
        // output-to-input drag; only the interaction direction is reversed.
        if (draft.sourceSide === 'input') {
            return this.addConnection(targetNodeId, targetPort, draft.sourceNodeId, draft.sourcePort);
        }
        return this.addConnection(draft.sourceNodeId, draft.sourcePort, targetNodeId, targetPort);
    }

    cancelConnection(): void {
        const wasConnecting = !!this.connectionDraft;
        this.connectionDraft = undefined;
        if (wasConnecting) {
            this.setMessage('workflow.message.connectionCancelled');
        }
    }

    // ---------------------------------------------------------------------
    // View / history / document
    // ---------------------------------------------------------------------

    setZoom(zoom: number): void {
        const value = Number(zoom);
        if (!Number.isFinite(value)) {
            return;
        }
        this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));
    }

    zoomIn(): void {
        this.setZoom(this.zoom + 0.1);
    }

    zoomOut(): void {
        this.setZoom(this.zoom - 0.1);
    }

    panBy(dx: number, dy: number): void {
        this.pan = {
            x: Math.round(this.pan.x + (Number(dx) || 0)),
            y: Math.round(this.pan.y + (Number(dy) || 0))
        };
    }

    resetView(): void {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
    }

    undo(): boolean {
        const snapshot = this.undoStack.pop();
        if (!snapshot) {
            return false;
        }
        this.redoStack.push(this.snapshot());
        this.applyDefinition(JSON.parse(snapshot));
        this.pruneSelection();
        this.dirty = true;
        this.setMessage('workflow.message.undo');
        return true;
    }

    redo(): boolean {
        const snapshot = this.redoStack.pop();
        if (!snapshot) {
            return false;
        }
        this.undoStack.push(this.snapshot());
        this.applyDefinition(JSON.parse(snapshot));
        this.pruneSelection();
        this.dirty = true;
        this.setMessage('workflow.message.redo');
        return true;
    }

    clear(): void {
        const definition: VisualWorkflowDefinition = {
            id: this.definition.id,
            name: this.definition.name,
            description: this.definition.description,
            version: this.definition.version || '1.0.0',
            nodes: [],
            connections: [],
            metadata: { ...(this.definition.metadata || {}), updatedAt: new Date().toISOString() }
        };
        this.commit(() => definition);
        this.selection = {};
        this.execution = undefined;
        this.checkpoint = undefined;
        this.setMessage('workflow.message.cleared');
    }

    /**
     * Compile the editable document into the immutable plan used by the
     * execution kernel.
     */
    compile(): CompiledWorkflow {
        return compileVisualWorkflow(this.definition);
    }

    /**
     * Re-arrange nodes in left-to-right layers derived from the entry node.
     */
    autoLayout(): boolean {
        if (!this.definition.nodes.length) {
            return false;
        }
        const positions = layoutVisualWorkflow(this.definition);
        this.commit(current => ({
            ...current,
            nodes: current.nodes.map(node => ({
                ...node,
                position: positions[node.id] || node.position
            })),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.layout');
        return true;
    }

    /**
     * Duplicate the selected node with a new id and a small offset.
     */
    duplicateSelection(): IVisualWorkflowNode | undefined {
        const node = this.selectedNode;
        if (!node) {
            return undefined;
        }
        const duplicate = this.registry.createNode(node.type, {
            x: node.position.x + this.gridSize * 2,
            y: node.position.y + this.gridSize * 2
        }, {
            id: this.nextNodeId(node.type),
            name: `${node.name} copy`,
            config: { ...(node.config || {}) }
        });
        duplicate.description = node.description;
        duplicate.style = { ...(node.style || {}) };
        this.commit(current => ({
            ...current,
            nodes: [...current.nodes, duplicate],
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = { nodeId: duplicate.id };
        this.setMessage('workflow.message.duplicated', { name: duplicate.name });
        return duplicate;
    }

    selectExecution(executionId: string): boolean {
        const snapshot = this.executionHistory.find(item => item.executionId === executionId);
        if (!snapshot) {
            return false;
        }
        this.execution = snapshot;
        this.selectedExecutionId = executionId;
        return true;
    }

    clearExecutionHistory(): void {
        this.executionHistory = [];
        this.selectedExecutionId = undefined;
        this.execution = undefined;
    }

    load(definition: VisualWorkflowDefinition | string, resetHistory = true): boolean {
        let parsed: VisualWorkflowDefinition;
        try {
            parsed = typeof definition === 'string' ? JSON.parse(definition) : cloneDefinition(definition);
        } catch (error) {
            this.setError((error as Error).message);
            return false;
        }
        const validation = validateVisualWorkflow(parsed);
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) {
            this.setError('workflow.error.invalidDocument');
            return false;
        }
        if (resetHistory) {
            this.undoStack = [];
            this.redoStack = [];
        } else {
            this.pushHistory(this.snapshot());
            this.redoStack = [];
        }
        this.definition = parsed;
        this.normalize();
        this.selection = {};
        this.execution = undefined;
        this.checkpoint = undefined;
        this.dirty = false;
        this.setError(validation.valid ? '' : validation.errors.join('; '));
        this.setMessage('workflow.message.loaded');
        return true;
    }

    toJSON(): string {
        return JSON.stringify(this.definition, null, 2);
    }

    async saveTo(
        store: WorkflowDefinitionStore,
        options: WorkflowStoreSaveOptions = {}
    ): Promise<WorkflowDefinitionSummary> {
        let definition: VisualWorkflowDefinition = options.name
            ? { ...this.definition, name: options.name }
            : this.definition;
        if (options.as) {
            definition = {
                ...definition,
                id: `workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
            };
        }
        const summary = await store.save(definition);
        this.definition = definition;
        this.normalize();
        this.dirty = false;
        this.setMessage(options.as ? 'workflow.message.savedAs' : 'workflow.message.saved', {
            name: definition.name
        });
        return summary;
    }

    async openFrom(store: WorkflowDefinitionStore, id: string): Promise<boolean> {
        const definition = await store.get(id);
        if (!definition) {
            this.setError('workflow.error.notFound', { id });
            return false;
        }
        return this.load(definition, true);
    }

    listSaved(store: WorkflowDefinitionStore): Promise<WorkflowDefinitionSummary[]> {
        return store.list();
    }

    async removeSaved(store: WorkflowDefinitionStore, id: string): Promise<boolean> {
        return store.remove(id);
    }

    serialize(): string {
        return this.toJSON();
    }

    validate(): { valid: boolean; errors: string[] } {
        return validateVisualWorkflow(this.definition);
    }

    markSaved(): void {
        this.dirty = false;
    }

    // ---------------------------------------------------------------------
    // Execution
    // ---------------------------------------------------------------------

    async run(options: WorkflowDesignerRunOptions = {}): Promise<ActivityResult> {
        if (this.running) {
            return { success: false, error: new Error('workflow.error.running') };
        }
        const validation = this.validate();
        if (!validation.valid) {
            this.setError(validation.errors.join('; '));
            return { success: false, error: new Error(this.error) };
        }
        if (!this.service) {
            const error = new Error('workflow.error.noService');
            this.setError(error.message);
            return { success: false, error };
        }

        this.running = true;
        this.clearError();
        this.setMessage('workflow.message.running');
        this.execution = undefined;
        if (!options.resumeFrom) {
            this.checkpoint = undefined;
        }
        try {
            const result = await this.service.execute(this.definition, options.context || {}, {
                ...options,
                onEvent: (event: WorkflowExecutionEvent) => {
                    this.activeExecutionId = event.executionId;
                    this.execution = event.snapshot;
                    options.onEvent?.(event);
                },
                onCheckpoint: snapshot => {
                    // Only running snapshots are resumable. Terminal checkpoints
                    // mark pending nodes as skipped and must not replace the last
                    // frontier captured before cancellation/failure.
                    if (snapshot.status === 'running') {
                        this.checkpoint = snapshot;
                    }
                    options.onCheckpoint?.(snapshot);
                }
            });
            const state = result.data?.executionState as WorkflowExecutionSnapshot | undefined;
            if (state) {
                this.execution = state;
                this.recordExecution(state);
            }
            if (result.success) {
                this.checkpoint = undefined;
            }
            this.activeExecutionId = result.data?.executionId as string | undefined;
            this.running = false;
            this.setMessage(result.success ? 'workflow.message.completed' : 'workflow.message.failed');
            if (!result.success) {
                this.setError(result.error?.message || 'workflow.message.failed');
            }
            return result;
        } catch (error) {
            this.running = false;
            this.setError((error as Error).message);
            this.setMessage('workflow.message.failed');
            return { success: false, error: error as Error };
        }
    }

    async cancel(): Promise<void> {
        if (this.activeExecutionId && this.service) {
            await this.service.cancelExecution(this.activeExecutionId);
        }
        this.running = false;
        this.setMessage('workflow.message.cancelled');
    }

    /**
     * Continue from the last checkpoint. Completed nodes are replayed on the
     * canvas but are not executed again.
     */
    async resume(options: WorkflowDesignerRunOptions = {}): Promise<ActivityResult> {
        if (!this.checkpoint) {
            return { success: false, error: new Error('workflow.error.noCheckpoint') };
        }
        return this.run({ ...options, resumeFrom: this.checkpoint });
    }

    clearCheckpoint(): void {
        this.checkpoint = undefined;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private normalize(): void {
        if (!this.definition.id) {
            this.definition.id = nowId('workflow');
        }
        if (!this.definition.name) {
            this.definition.name = 'Unnamed Workflow';
        }
        this.definition.nodes = (this.definition.nodes || []).map(node => {
            const registered = this.registry.get(node.type);
            const fallback = registered?.defaultConfig;
            return {
                ...node,
                position: node.position || { x: 0, y: 0 },
                dimension: node.dimension || { width: 184, height: 64 },
                inputs: node.inputs?.length ? node.inputs : (registered?.inputs || []).map(port => ({ ...port })),
                outputs: node.outputs?.length ? node.outputs : (registered?.outputs || []).map(port => ({ ...port })),
                config: { ...(fallback || {}), ...(node.config || {}) },
                style: {
                    backgroundColor: registered?.color,
                    textColor: registered?.textColor || '#ffffff',
                    ...(node.style || {})
                }
            };
        });
        this.definition.connections = (this.definition.connections || []).map(connection => ({
            ...connection,
            sourcePort: connection.sourcePort || 'out',
            targetPort: connection.targetPort || 'in'
        }));
    }

    private commit(mutator: (definition: VisualWorkflowDefinition) => VisualWorkflowDefinition): void {
        this.pushHistory(this.snapshot());
        this.redoStack = [];
        this.applyDefinition(mutator(this.definition));
        this.dirty = true;
    }

    private applyDefinition(definition: VisualWorkflowDefinition): void {
        this.definition = {
            ...definition,
            metadata: { ...(definition.metadata || {}), updatedAt: new Date().toISOString() }
        };
    }

    private pushHistory(snapshot: string): void {
        this.undoStack.push(snapshot);
        if (this.undoStack.length > HISTORY_LIMIT) {
            this.undoStack.shift();
        }
    }

    private snapshot(): string {
        return JSON.stringify(this.definition);
    }

    private recordExecution(snapshot: WorkflowExecutionSnapshot): void {
        // Replace immutably: splicing the reactive array emits transient sparse
        // states that v-for renders as undefined contexts.
        const history = (this.executionHistory || []).filter(
            item => item && item.executionId !== snapshot.executionId
        );
        this.executionHistory = [snapshot, ...history].slice(0, 20);
        this.selectedExecutionId = snapshot.executionId;
    }

    private snapPosition(position: NodePosition): NodePosition {
        const x = Number.isFinite(position?.x) ? position.x : 0;
        const y = Number.isFinite(position?.y) ? position.y : 0;
        if (!this.snapToGrid || !(this.gridSize > 0)) {
            return { x: Math.round(x), y: Math.round(y) };
        }
        const grid = this.gridSize;
        return {
            x: Math.round(x / grid) * grid,
            y: Math.round(y / grid) * grid
        };
    }

    private setMessage(key: string, params: Record<string, any> = {}): void {
        this.message = key;
        this.messageParams = params;
    }

    private setError(key: string, params: Record<string, any> = {}): void {
        this.error = key;
        this.errorParams = params;
    }

    private clearError(): void {
        this.error = '';
        this.errorParams = {};
    }

    private pruneSelection(): void {
        if (this.selection.nodeId && !this.definition.nodes.some(node => node.id === this.selection.nodeId)) {
            this.selection = {};
        }
        if (this.selection.connectionId
            && !this.definition.connections.some(connection => connection.id === this.selection.connectionId)) {
            this.selection = {};
        }
    }

    private nextNodeId(type: string): string {
        const used = new Set(this.definition.nodes.map(node => node.id));
        let index = 1;
        while (used.has(`${type}_${index}`)) {
            index++;
        }
        return `${type}_${index}`;
    }

    private nextConnectionId(): string {
        const used = new Set(this.definition.connections.map(connection => connection.id));
        let index = 1;
        while (used.has(`conn_${index}`)) {
            index++;
        }
        return `conn_${index}`;
    }

    setExecutionId(executionId: string | undefined): void {
        this.activeExecutionId = executionId;
    }
}
