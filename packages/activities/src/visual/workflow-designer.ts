import { ActivityContext, ActivityResult } from '../activities/Activity';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from './i18n';
import {
    IVisualWorkflowNode,
    NodeConnection,
    NodePosition,
    VisualWorkflowDefinition,
    WorkflowConnectionDraft,
    WorkflowGroup,
    WorkflowExecutionEvent,
    WorkflowExecutionOptions,
    WorkflowAlignMode,
    WorkflowDistributeMode,
    WorkflowExecutionSnapshot,
    WorkflowNodeDragState,
    WorkflowSelection
} from './types';
import { WorkflowNodeRegistry, WorkflowLocale } from './node-registry';
import { hasCycle, validateVisualWorkflow } from './workflow-runtime';
import { workflowNodeFrame } from './workflow-geometry';
import { validateWorkflowConfigs } from './workflow-config-validation';
import { compileVisualWorkflow, CompiledWorkflow, layoutVisualWorkflow } from './workflow-compiler';
import { VisualWorkflowService } from './VisualWorkflowService';
import {
    WorkflowDefinitionStore,
    WorkflowDefinitionSummary,
    WorkflowRelease,
    WorkflowStoreSaveOptions
} from './workflow-store';

const HISTORY_LIMIT = 100;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

/** Nodes and internal connections copied from the canvas. */
export interface WorkflowClipboardSnapshot {
    nodes: IVisualWorkflowNode[];
    connections: NodeConnection[];
    groups: WorkflowGroup[];
    sourceWorkflowId: string;
    /** Cascading paste offset counter; reset on every copy. */
    pastes: number;
}

let workflowClipboard: WorkflowClipboardSnapshot | undefined;

export function getWorkflowClipboard(): WorkflowClipboardSnapshot | undefined {
    return workflowClipboard;
}

export function clearWorkflowClipboard(): void {
    workflowClipboard = undefined;
}

/** Clone plain config/style values while keeping functions/objects by reference. */
function cloneWorkflowValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(item => cloneWorkflowValue(item)) as unknown as T;
    }
    if (value && typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        if (proto === Object.prototype || proto === null) {
            const copy: Record<string, any> = {};
            Object.keys(value as Record<string, any>).forEach(key => {
                copy[key] = cloneWorkflowValue((value as Record<string, any>)[key]);
            });
            return copy as T;
        }
    }
    return value;
}

function cloneClipboardNode(node: IVisualWorkflowNode): IVisualWorkflowNode {
    return {
        ...node,
        position: { ...node.position },
        dimension: node.dimension ? { ...node.dimension } : undefined,
        inputs: node.inputs?.map(port => ({ ...port })),
        outputs: node.outputs?.map(port => ({ ...port })),
        config: cloneWorkflowValue(node.config || {}),
        style: node.style ? cloneWorkflowValue(node.style) : undefined
    };
}

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

    const start = make('start', 'start_1', t('start', 'Start'), 80, 220);
    const fetch = make('task', 'task_1', t('loadInput', 'Load input'), 330, 220, {
        action: 'loadInput',
        result: { approved: true }
    });
    const condition = make('condition', 'condition_1', t('approved', 'Approved?'), 590, 220, {
        field: 'approved',
        operator: 'truthy'
    });
    const approve = make('task', 'task_2', t('approve', 'Approve'), 850, 120, {
        result: { approved: true }
    });
    const reject = make('task', 'task_3', t('reject', 'Reject'), 850, 320, {
        result: { approved: false }
    });
    const end = make('end', 'end_1', t('end', 'End'), 1110, 220);

    const connection = (id: string, source: string, sourcePort: string, target: string): NodeConnection => ({
        id,
        sourceNodeId: source,
        sourcePort,
        targetNodeId: target,
        targetPort: 'in'
    });

    return {
        id: 'workflow_demo',
        name: t('name', 'Approval workflow'),
        description: t('description', 'Drag nodes, connect ports, run it, and inspect the live path.'),
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
 * Blank document used by the tab bar's `+` action. Unlike the starter example
 * it contains no nodes or connections, so the canvas shows the onboarding hint
 * until the user adds the first node.
 */
export function createBlankWorkflowDefinition(
    locale: WorkflowLocale = 'zh-CN',
    name?: string
): VisualWorkflowDefinition {
    const now = new Date().toISOString();
    return {
        id: 'workflow_new',
        name: name || 'New workflow',
        description: '',
        version: '1.0.0',
        nodes: [],
        connections: [],
        metadata: {
            createdAt: now,
            updatedAt: now
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
    /** Display name recorded on explicit saves and releases (host-provided). */
    author = '';
    gridSize = 10;
    snapToGrid = true;
    message = '';
    error = '';
    messageParams: Record<string, any> = {};
    errorParams: Record<string, any> = {};

    readonly registry: WorkflowNodeRegistry;
    readonly service?: VisualWorkflowService;

    /**
     * History stores immutable definition objects instead of serialized JSON.
     * Node/connection edits already replace only the objects they touch, so
     * pushing the current definition is O(1); serializing the whole document on
     * every keystroke cost ~10ms at 300 nodes.
     */
    private undoStack: VisualWorkflowDefinition[] = [];
    private redoStack: VisualWorkflowDefinition[] = [];
    private dragStartSnapshot?: VisualWorkflowDefinition;
    private activeExecutionId?: string;
    /**
     * Serialized document as of the last successful save (or load). Saving is
     * skipped when the document is byte-identical, which keeps `Ctrl+S` and
     * overlapping autosaves from writing the same payload twice.
     */
    private savedSnapshot?: string;
    private savedSummary?: WorkflowDefinitionSummary;

    constructor(options: WorkflowDesignerOptions = {}) {
        this.registry = options.registry || new WorkflowNodeRegistry();
        this.service = options.service;
        this.definition = this.normalize(options.definition || createDefaultWorkflowDefinition(this.registry));
    }

    get nodes(): IVisualWorkflowNode[] {
        return this.definition.nodes;
    }

    get connections(): NodeConnection[] {
        return this.definition.connections;
    }

    get selectedNode(): IVisualWorkflowNode | undefined {
        const id = this.selection.nodeId || this.selectedNodeIds[this.selectedNodeIds.length - 1];
        if (!id) {
            return undefined;
        }
        return this.definition.nodes.find(node => node.id === id);
    }

    /** All selected node ids, filtered against the current document. */
    get selectedNodeIds(): string[] {
        const ids = (this.selection.nodeIds || [])
            .filter(id => this.definition.nodes.some(node => node.id === id));
        if (ids.length) {
            return ids;
        }
        return this.selection.nodeId
            && this.definition.nodes.some(node => node.id === this.selection.nodeId)
            ? [this.selection.nodeId]
            : [];
    }

    get selectedNodes(): IVisualWorkflowNode[] {
        const ids = new Set(this.selectedNodeIds);
        return this.definition.nodes.filter(node => ids.has(node.id));
    }

    get selectionCount(): number {
        return this.selectedNodeIds.length;
    }

    get groups(): WorkflowGroup[] {
        return this.definition.groups || [];
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

    /**
     * Insert a new node on an existing wire: source → new node → target.
     * The replacement is one undoable edit.
     */
    spliceNode(
        type: IVisualWorkflowNode['type'],
        position: NodePosition,
        connectionId: string
    ): IVisualWorkflowNode | undefined {
        const definition = this.registry.get(type);
        if (!definition || definition.singleton) {
            return undefined;
        }
        const connection = this.definition.connections.find(item => item.id === connectionId);
        if (!connection) {
            return undefined;
        }
        if (!(definition.inputs || []).length || !(definition.outputs || []).length) {
            return undefined;
        }
        const node = this.registry.createNode(type, {
            x: Math.round(position.x),
            y: Math.round(position.y)
        }, {
            id: this.nextNodeId(type)
        });
        const used = new Set(this.definition.connections.map(item => item.id));
        const nextConnectionId = (): string => {
            let index = 1;
            while (used.has(`conn_${index}`)) {
                index += 1;
            }
            const id = `conn_${index}`;
            used.add(id);
            return id;
        };
        const connections: NodeConnection[] = [];
        this.definition.connections.forEach(item => {
            if (item.id !== connectionId) {
                connections.push(item);
                return;
            }
            connections.push({
                id: nextConnectionId(),
                sourceNodeId: connection.sourceNodeId,
                sourcePort: connection.sourcePort,
                targetNodeId: node.id,
                targetPort: (node.inputs || [])[0]?.id || 'in'
            });
            connections.push({
                id: nextConnectionId(),
                sourceNodeId: node.id,
                sourcePort: (node.outputs || [])[0]?.id || 'out',
                targetNodeId: connection.targetNodeId,
                targetPort: connection.targetPort
            });
        });
        this.commit(current => ({
            ...current,
            nodes: [...current.nodes, node],
            connections,
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = { nodeId: node.id, nodeIds: [node.id] };
        this.setMessage('workflow.message.inserted', { name: node.name });
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
            ...(current.groups
                ? {
                    groups: current.groups
                        .map(group => ({
                            ...group,
                            nodeIds: group.nodeIds.filter(id => id !== nodeId)
                        }))
                        .filter(group => group.nodeIds.length)
                }
                : {}),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        const remaining = this.selectedNodeIds.filter(id => id !== nodeId);
        if (remaining.length !== this.selectedNodeIds.length) {
            this.setSelection({ nodeIds: remaining });
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

    /** Rename the open workflow document (the id stays stable). */
    renameWorkflow(name: string): boolean {
        const next = String(name ?? '').trim();
        if (!next || next === this.definition.name) {
            return false;
        }
        this.commit(current => ({
            ...current,
            name: next,
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.renamed', { name: next });
        return true;
    }

    setSelection(selection: WorkflowSelection): void {
        const requested = (selection.nodeIds?.length
            ? selection.nodeIds
            : selection.nodeId
                ? [selection.nodeId]
                : []
        ).filter(id => this.definition.nodes.some(node => node.id === id));
        const nodeIds = Array.from(new Set(requested));
        const primary = selection.nodeId && nodeIds.includes(selection.nodeId)
            ? selection.nodeId
            : nodeIds[nodeIds.length - 1];
        this.selection = {
            ...(nodeIds.length ? { nodeId: primary, nodeIds } : {}),
            ...(selection.connectionId && !nodeIds.length ? { connectionId: selection.connectionId } : {})
        };
        this.clearError();
    }

    /** Select one node; `additive` toggles it in the current node selection. */
    selectNode(nodeId: string, options: { additive?: boolean } = {}): void {
        if (!options.additive) {
            this.setSelection({ nodeId });
            return;
        }
        const current = this.selectedNodeIds;
        const next = current.includes(nodeId)
            ? current.filter(id => id !== nodeId)
            : [...current, nodeId];
        this.setSelection({ nodeIds: next, nodeId: current.includes(nodeId) ? next[next.length - 1] : nodeId });
    }

    /** Replace or extend the selection (used by box selection). */
    selectNodes(nodeIds: string[], additive = false): void {
        const current = additive ? this.selectedNodeIds : [];
        const next = Array.from(new Set([...current, ...nodeIds.filter(Boolean)]));
        this.setSelection({ nodeIds: next, nodeId: next[next.length - 1] });
    }

    /** Enable or disable every selected node in one undo entry. */
    setSelectionDisabled(disabled: boolean): boolean {
        const ids = new Set(this.selectedNodeIds);
        if (!ids.size) {
            return false;
        }
        this.commit(current => ({
            ...current,
            nodes: current.nodes.map(node =>
                ids.has(node.id) ? { ...node, disabled } : node
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        return true;
    }

    toggleSelectionDisabled(): boolean {
        const nodes = this.selectedNodes;
        if (!nodes.length) {
            return false;
        }
        return this.setSelectionDisabled(!nodes.every(node => node.disabled === true));
    }

    selectConnection(connectionId: string): void {
        this.setSelection({ connectionId });
    }

    clearSelection(): void {
        this.selection = {};
    }

    deleteSelection(): boolean {
        const nodeIds = this.selectedNodeIds;
        if (nodeIds.length > 1) {
            const ids = new Set(nodeIds);
            this.commit(current => ({
                ...current,
                nodes: current.nodes.filter(node => !ids.has(node.id)),
                connections: current.connections.filter(connection =>
                    !ids.has(connection.sourceNodeId) && !ids.has(connection.targetNodeId)
                ),
                ...(current.groups
                    ? {
                        groups: current.groups
                            .map(group => ({
                                ...group,
                                nodeIds: group.nodeIds.filter(id => !ids.has(id))
                            }))
                            .filter(group => group.nodeIds.length)
                    }
                    : {}),
                metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
            }));
            this.selection = {};
            this.setMessage('workflow.message.nodesRemoved', { count: nodeIds.length });
            return true;
        }
        if (nodeIds.length === 1) {
            return this.removeNode(nodeIds[0]);
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
        const selected = this.selectedNodeIds;
        const dragIds = selected.includes(nodeId) ? selected : [nodeId];
        // Re-selecting an already selected node must not broadcast a redundant
        // state write (it reruns every bound view for no visible change).
        if (!selected.includes(nodeId)) {
            this.selection = { nodeId, nodeIds: [nodeId] };
        } else if (this.selection.connectionId) {
            this.selection = { nodeId: this.selection.nodeId || nodeId, nodeIds: selected };
        }
        const origins: Record<string, NodePosition> = {};
        dragIds.forEach(id => {
            const item = this.definition.nodes.find(entry => entry.id === id);
            if (item) {
                origins[id] = { ...item.position };
            }
        });
        this.drag = {
            nodeId,
            nodeIds: dragIds,
            origins,
            startX: node.position.x,
            startY: node.position.y,
            offsetX: world.x - node.position.x,
            offsetY: world.y - node.position.y,
            moved: false
        };
        // The undo snapshot is only needed once the node actually moves; a plain
        // click used to serialize the whole document on mousedown.
        this.dragStartSnapshot = undefined;
        return true;
    }

    dragNodeTo(world: NodePosition): void {
        if (!this.drag) {
            return;
        }
        const x = Math.round(world.x - this.drag.offsetX);
        const y = Math.round(world.y - this.drag.offsetY);
        const snapped = this.snapPosition({ x, y });
        const primary = this.definition.nodes.find(node => node.id === this.drag!.nodeId);
        if (snapped.x === primary?.position.x && snapped.y === primary?.position.y) {
            return;
        }
        if (!this.dragStartSnapshot) {
            this.dragStartSnapshot = this.definition;
        }
        this.drag.moved = true;
        const origins = this.drag.origins || {};
        const originX = origins[this.drag.nodeId]?.x ?? primary?.position.x ?? snapped.x;
        const originY = origins[this.drag.nodeId]?.y ?? primary?.position.y ?? snapped.y;
        const deltaX = snapped.x - originX;
        const deltaY = snapped.y - originY;
        const moving = new Set(this.drag.nodeIds || [this.drag.nodeId]);
        this.applyDefinition({
            ...this.definition,
            nodes: this.definition.nodes.map(node => {
                if (!moving.has(node.id)) {
                    return node;
                }
                const origin = origins[node.id] || node.position;
                return { ...node, position: { x: origin.x + deltaX, y: origin.y + deltaY } };
            })
        });
    }

    endNodeDrag(): boolean {
        const moved = !!this.drag?.moved;
        if (moved && this.dragStartSnapshot) {
            this.pushHistory(this.dragStartSnapshot);
            this.redoStack = [];
            // Drag moves update the document in place while the pointer moves;
            // stamp the timestamp once the gesture is committed instead of on
            // every pointermove (which forced a full canvas re-render).
            this.definition = {
                ...this.definition,
                metadata: { ...(this.definition.metadata || {}), updatedAt: new Date().toISOString() }
            };
            this.dirty = true;
        }
        this.drag = undefined;
        this.dragStartSnapshot = undefined;
        return moved;
    }

    cancelNodeDrag(): void {
        if (this.drag && this.dragStartSnapshot && this.drag.moved) {
            this.applyDefinition(this.dragStartSnapshot);
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
        const previous = this.undoStack.pop();
        if (!previous) {
            return false;
        }
        this.redoStack.push(this.definition);
        this.applyDefinition(previous);
        this.pruneSelection();
        this.dirty = true;
        this.setMessage('workflow.message.undo');
        return true;
    }

    redo(): boolean {
        const next = this.redoStack.pop();
        if (!next) {
            return false;
        }
        this.undoStack.push(this.definition);
        this.applyDefinition(next);
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
    /** Align every selected node to the selection bounds. */
    alignSelection(mode: WorkflowAlignMode): boolean {
        const nodes = this.selectedNodes;
        if (nodes.length < 2) {
            return false;
        }
        const frames = nodes.map(node => ({ node, ...workflowNodeFrame(node) }));
        const minX = Math.min(...frames.map(frame => frame.node.position.x));
        const maxX = Math.max(...frames.map(frame => frame.node.position.x + frame.width));
        const minY = Math.min(...frames.map(frame => frame.node.position.y));
        const maxY = Math.max(...frames.map(frame => frame.node.position.y + frame.height));
        const positions = new Map<string, NodePosition>();
        frames.forEach(frame => {
            const { node, width, height } = frame;
            let { x, y } = node.position;
            switch (mode) {
                case 'left':
                    x = minX;
                    break;
                case 'center':
                    x = Math.round((minX + maxX) / 2 - width / 2);
                    break;
                case 'right':
                    x = maxX - width;
                    break;
                case 'top':
                    y = minY;
                    break;
                case 'middle':
                    y = Math.round((minY + maxY) / 2 - height / 2);
                    break;
                case 'bottom':
                    y = maxY - height;
                    break;
            }
            positions.set(node.id, { x, y });
        });
        this.commit(current => ({
            ...current,
            nodes: current.nodes.map(node =>
                positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.aligned');
        return true;
    }

    /** Space three or more selected nodes evenly between the outer two. */
    distributeSelection(axis: WorkflowDistributeMode): boolean {
        const nodes = this.selectedNodes;
        if (nodes.length < 3) {
            return false;
        }
        const horizontal = axis === 'horizontal';
        const frames = nodes
            .map(node => ({ node, ...workflowNodeFrame(node) }))
            .sort((a, b) => horizontal
                ? a.node.position.x - b.node.position.x
                : a.node.position.y - b.node.position.y
            );
        const start = horizontal
            ? frames[0].node.position.x
            : frames[0].node.position.y;
        const last = frames[frames.length - 1];
        const end = horizontal
            ? last.node.position.x + last.width
            : last.node.position.y + last.height;
        const total = frames.reduce((sum, frame) => sum + (horizontal ? frame.width : frame.height), 0);
        const gap = (end - start - total) / (frames.length - 1);
        let cursor = start;
        const positions = new Map<string, NodePosition>();
        frames.forEach(frame => {
            positions.set(frame.node.id, horizontal
                ? { x: Math.round(cursor), y: frame.node.position.y }
                : { x: frame.node.position.x, y: Math.round(cursor) }
            );
            cursor += (horizontal ? frame.width : frame.height) + gap;
        });
        this.commit(current => ({
            ...current,
            nodes: current.nodes.map(node =>
                positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.distributed');
        return true;
    }

    /** Wrap the current node selection in a named frame. */
    groupSelection(name?: string): WorkflowGroup | undefined {
        const nodeIds = this.selectedNodeIds;
        if (!nodeIds.length) {
            return undefined;
        }
        const existing = this.groups;
        const used = new Set(existing.map(group => group.id));
        let index = 1;
        while (used.has(`group_${index}`)) {
            index += 1;
        }
        const group: WorkflowGroup = {
            id: `group_${index}`,
            name: String(name || '').trim() || `Group ${existing.length + 1}`,
            nodeIds: [...nodeIds],
            color: '#60a5fa'
        };
        this.commit(current => ({
            ...current,
            groups: [...(current.groups || []), group],
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.grouped', { name: group.name });
        return group;
    }

    /** Collapse/expand a frame; collapsing clears selection of its nodes. */
    setGroupCollapsed(groupId: string, collapsed?: boolean): boolean {
        const group = this.groups.find(item => item.id === groupId);
        if (!group) {
            return false;
        }
        const next = collapsed === undefined ? group.collapsed !== true : collapsed === true;
        if (next === (group.collapsed === true)) {
            return false;
        }
        this.commit(current => ({
            ...current,
            groups: (current.groups || []).map(item =>
                item.id === groupId ? { ...item, collapsed: next } : item
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        if (next) {
            const members = new Set(group.nodeIds);
            const remaining = this.selectedNodeIds.filter(id => !members.has(id));
            if (remaining.length !== this.selectedNodeIds.length) {
                this.setSelection({ nodeIds: remaining });
            }
        }
        return true;
    }

    toggleGroupCollapsed(groupId: string): boolean {
        return this.setGroupCollapsed(groupId);
    }

    /** Update a frame's name/color. Empty names are rejected. */
    updateGroup(groupId: string, patch: { name?: string; color?: string }): boolean {
        const group = this.groups.find(item => item.id === groupId);
        if (!group) {
            return false;
        }
        const name = patch.name === undefined ? group.name : String(patch.name).trim();
        if (!name) {
            return false;
        }
        const color = patch.color === undefined ? group.color : String(patch.color).trim();
        this.commit(current => ({
            ...current,
            groups: (current.groups || []).map(item =>
                item.id === groupId
                    ? { ...item, name, color: color || item.color }
                    : item
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        return true;
    }

    renameGroup(groupId: string, name: string): boolean {
        return this.updateGroup(groupId, { name });
    }

    setGroupColor(groupId: string, color: string): boolean {
        return this.updateGroup(groupId, { color });
    }

    /** Remove a frame while keeping its nodes on the canvas. */
    removeGroup(groupId: string): boolean {
        const group = this.groups.find(item => item.id === groupId);
        if (!group) {
            return false;
        }
        this.commit(current => ({
            ...current,
            groups: (current.groups || []).filter(item => item.id !== groupId),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.ungrouped', { name: group.name });
        return true;
    }

    /** Remove every frame that contains one of the selected nodes. */
    ungroupSelection(): boolean {
        const selected = new Set(this.selectedNodeIds);
        if (!selected.size) {
            return false;
        }
        const groups = this.groups;
        const remaining = groups.filter(group => !(group.nodeIds || []).some(id => selected.has(id)));
        if (remaining.length === groups.length) {
            return false;
        }
        this.commit(current => ({
            ...current,
            groups: (current.groups || []).filter(group =>
                !(group.nodeIds || []).some(id => selected.has(id))
            ),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.setMessage('workflow.message.ungrouped', { name: '' });
        return true;
    }

    /** Copy the selected nodes and the connections between them. */
    copySelection(): number {
        const nodes = this.selectedNodes;
        if (!nodes.length) {
            return 0;
        }
        const ids = new Set(nodes.map(node => node.id));
        workflowClipboard = {
            nodes: nodes.map(cloneClipboardNode),
            connections: this.definition.connections
                .filter(connection => ids.has(connection.sourceNodeId) && ids.has(connection.targetNodeId))
                .map(connection => ({ ...connection })),
            groups: (this.definition.groups || [])
                .filter(group => group.nodeIds.length > 0 && group.nodeIds.every(id => ids.has(id)))
                .map(group => ({ ...group, nodeIds: [...group.nodeIds] })),
            sourceWorkflowId: this.definition.id,
            pastes: 0
        };
        this.setMessage('workflow.message.copied', { count: nodes.length });
        return nodes.length;
    }

    cutSelection(): number {
        const count = this.copySelection();
        if (!count) {
            return 0;
        }
        this.deleteSelection();
        this.setMessage('workflow.message.cut', { count });
        return count;
    }

    /** Paste the shared clipboard into this document, remapping ids. */
    pasteClipboard(): IVisualWorkflowNode[] {
        const clip = workflowClipboard;
        if (!clip?.nodes.length) {
            return [];
        }
        clip.pastes += 1;
        const offset = this.gridSize * 2 * clip.pastes;
        const usedNodes = new Set(this.definition.nodes.map(node => node.id));
        const usedConnections = new Set(this.definition.connections.map(connection => connection.id));
        const nextNodeId = (type: string): string => {
            let index = 1;
            while (usedNodes.has(`${type}_${index}`)) {
                index += 1;
            }
            const id = `${type}_${index}`;
            usedNodes.add(id);
            return id;
        };
        const nextConnectionId = (): string => {
            let index = 1;
            while (usedConnections.has(`conn_${index}`)) {
                index += 1;
            }
            const id = `conn_${index}`;
            usedConnections.add(id);
            return id;
        };

        const existingTypes = new Set(this.definition.nodes.map(node => node.type));
        const idMap = new Map<string, string>();
        const pasted = clip.nodes
            .filter(node => {
                const definition = this.registry.get(node.type);
                if (definition?.singleton && existingTypes.has(node.type)) {
                    return false;
                }
                existingTypes.add(node.type);
                return true;
            })
            .map(node => {
                const created = this.registry.createNode(
                    node.type,
                    { x: node.position.x + offset, y: node.position.y + offset },
                    {
                        id: nextNodeId(node.type),
                        name: node.name,
                        config: cloneWorkflowValue(node.config || {})
                    }
                );
                created.description = node.description;
                created.style = node.style ? cloneWorkflowValue(node.style) : undefined;
                created.disabled = node.disabled === true;
                created.dimension = node.dimension ? { ...node.dimension } : undefined;
                created.inputs = node.inputs?.map(port => ({ ...port }));
                created.outputs = node.outputs?.map(port => ({ ...port }));
                idMap.set(node.id, created.id);
                return created;
            });

        if (!pasted.length) {
            return [];
        }

        const pastedConnections = clip.connections
            .filter(connection => idMap.has(connection.sourceNodeId) && idMap.has(connection.targetNodeId))
            .map(connection => ({
                ...connection,
                id: nextConnectionId(),
                sourceNodeId: idMap.get(connection.sourceNodeId)!,
                targetNodeId: idMap.get(connection.targetNodeId)!
            }));

        const usedGroups = new Set(this.groups.map(group => group.id));
        const nextGroupId = (): string => {
            let index = 1;
            while (usedGroups.has(`group_${index}`)) {
                index += 1;
            }
            const id = `group_${index}`;
            usedGroups.add(id);
            return id;
        };
        const pastedGroups = (clip.groups || [])
            .map(group => ({
                ...group,
                id: nextGroupId(),
                nodeIds: group.nodeIds.map(id => idMap.get(id)).filter((id): id is string => !!id),
                collapsed: false
            }))
            .filter(group => group.nodeIds.length > 0);

        this.commit(current => ({
            ...current,
            nodes: [...current.nodes, ...pasted],
            connections: [...current.connections, ...pastedConnections],
            ...(pastedGroups.length
                ? { groups: [...(current.groups || []), ...pastedGroups] }
                : {}),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = {
            nodeId: pasted[pasted.length - 1].id,
            nodeIds: pasted.map(node => node.id)
        };
        this.setMessage('workflow.message.pasted', { count: pasted.length });
        return pasted;
    }

    duplicateSelection(): IVisualWorkflowNode | undefined {
        const roots = this.selectedNodes;
        if (!roots.length) {
            return undefined;
        }
        const offset = this.gridSize * 2;
        const usedNodes = new Set(this.definition.nodes.map(node => node.id));
        const usedConnections = new Set(this.definition.connections.map(connection => connection.id));
        const nextNodeId = (type: string): string => {
            let index = 1;
            while (usedNodes.has(`${type}_${index}`)) {
                index += 1;
            }
            const id = `${type}_${index}`;
            usedNodes.add(id);
            return id;
        };
        const nextConnectionId = (): string => {
            let index = 1;
            while (usedConnections.has(`conn_${index}`)) {
                index += 1;
            }
            const id = `conn_${index}`;
            usedConnections.add(id);
            return id;
        };

        const idMap = new Map<string, string>();
        const duplicates = roots.map(node => {
            const duplicate = this.registry.createNode(node.type, {
                x: node.position.x + offset,
                y: node.position.y + offset
            }, {
                id: nextNodeId(node.type),
                name: `${node.name} copy`,
                config: { ...(node.config || {}) }
            });
            duplicate.description = node.description;
            duplicate.style = { ...(node.style || {}) };
            duplicate.disabled = node.disabled === true;
            idMap.set(node.id, duplicate.id);
            return duplicate;
        });
        const duplicateConnections = this.definition.connections
            .filter(connection => idMap.has(connection.sourceNodeId) && idMap.has(connection.targetNodeId))
            .map(connection => ({
                ...connection,
                id: nextConnectionId(),
                sourceNodeId: idMap.get(connection.sourceNodeId)!,
                targetNodeId: idMap.get(connection.targetNodeId)!
            }));

        const usedGroups = new Set(this.groups.map(group => group.id));
        const nextGroupId = (): string => {
            let index = 1;
            while (usedGroups.has(`group_${index}`)) {
                index += 1;
            }
            const id = `group_${index}`;
            usedGroups.add(id);
            return id;
        };
        const duplicateGroups = this.groups
            .filter(group => group.nodeIds.length > 0 && group.nodeIds.every(id => idMap.has(id)))
            .map(group => ({
                ...group,
                id: nextGroupId(),
                nodeIds: group.nodeIds.map(id => idMap.get(id)!),
                collapsed: false
            }));

        this.commit(current => ({
            ...current,
            nodes: [...current.nodes, ...duplicates],
            connections: [...current.connections, ...duplicateConnections],
            ...(duplicateGroups.length
                ? { groups: [...(current.groups || []), ...duplicateGroups] }
                : {}),
            metadata: { ...(current.metadata || {}), updatedAt: new Date().toISOString() }
        }));
        this.selection = {
            nodeId: duplicates[duplicates.length - 1].id,
            nodeIds: duplicates.map(node => node.id)
        };
        this.setMessage('workflow.message.duplicated', { name: duplicates[0].name });
        return duplicates[0];
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

    /** Replace the run history, for example with snapshots loaded from a host. */
    setExecutionHistory(snapshots: WorkflowExecutionSnapshot[]): void {
        this.executionHistory = (snapshots || []).filter(item => !!item?.executionId).slice(0, 20);
        this.selectedExecutionId = undefined;
        this.execution = undefined;
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
            this.pushHistory(this.definition);
            this.redoStack = [];
        }
        this.definition = this.normalize(parsed);
        this.selection = {};
        this.execution = undefined;
        this.checkpoint = undefined;
        this.dirty = false;
        this.savedSnapshot = JSON.stringify(this.definition);
        this.savedSummary = undefined;
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
        const savedSnapshot = JSON.stringify(definition);
        // Nothing changed since the last successful save (for example `Ctrl+S`
        // on an untouched document, or an autosave that raced a manual save).
        // Skipping the write also skips the round trip and the store's rewrite
        // of the whole document.
        if (!options.as && this.savedSnapshot === savedSnapshot) {
            this.dirty = false;
            const summary = this.savedSummary || this.summarizeSaved(definition);
            this.setMessage('workflow.message.saved', { name: definition.name });
            return summary;
        }
        // Explicit saves record an immutable version; autosave only rewrites the
        // draft so it does not grow the history on every pause.
        const versioned = !options.as && options.version === true && typeof store.saveVersion === 'function';
        let summary: WorkflowDefinitionSummary;
        let versionNumber: number | undefined;
        if (versioned) {
            const version = await store.saveVersion!(definition, this.author ? { createdBy: this.author } : undefined);
            versionNumber = version.version;
            summary = {
                id: definition.id,
                name: definition.name,
                description: definition.description,
                nodeCount: definition.nodes?.length || 0,
                connectionCount: definition.connections?.length || 0,
                updatedAt: version.createdAt
            };
        } else {
            summary = await store.save(definition);
        }
        // Persisting is asynchronous and autosave can overlap user edits. Never
        // clobber the document with the pre-request snapshot; only adopt it when
        // the definition is unchanged, otherwise keep the newer edits dirty.
        const current = this.definition;
        let unchanged = current === definition;
        if (!unchanged && (options.name || options.as)) {
            // Rename/save-as always sends a copy, so identity says nothing;
            // compare content once (user-initiated, not on the autosave path).
            unchanged = JSON.stringify(current) === savedSnapshot;
        }
        if (unchanged) {
            this.definition = definition;
        } else if (options.as) {
            // Save-as must still switch the open document to its new id/name.
            this.definition = { ...current, id: definition.id, name: definition.name };
        }
        this.savedSnapshot = savedSnapshot;
        this.savedSummary = summary;
        this.dirty = !unchanged;
        this.setMessage(
            options.as
                ? 'workflow.message.savedAs'
                : versionNumber ? 'workflow.message.versionSaved' : 'workflow.message.saved',
            { name: definition.name, version: versionNumber }
        );
        return summary;
    }

    /**
     * Publish the open document: record an immutable version and point run and
     * webhook entry points at it. Later draft edits stay unpublished.
     */
    async publishTo(
        store: WorkflowDefinitionStore,
        options: { publishedBy?: string } = {}
    ): Promise<WorkflowRelease | undefined> {
        if (typeof store.publish !== 'function') {
            this.setError('workflow.error.publishUnsupported');
            return undefined;
        }
        const validation = this.validate();
        if (!validation.valid) {
            this.setError(validation.errors.join('; '));
            return undefined;
        }
        const result = await store.publish(this.definition, {
            publishedBy: options.publishedBy || this.author || undefined
        });
        this.savedSnapshot = JSON.stringify(this.definition);
        this.savedSummary = undefined;
        this.dirty = false;
        this.setError('');
        this.setMessage('workflow.message.published', { version: result.release.version });
        return result.release;
    }

    /** Summary shape returned when a no-op save skips the store round trip. */
    private summarizeSaved(definition: VisualWorkflowDefinition): WorkflowDefinitionSummary {
        return {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            nodeCount: definition.nodes?.length || 0,
            connectionCount: definition.connections?.length || 0,
            updatedAt: definition.metadata?.updatedAt || new Date().toISOString()
        };
    }

    /**
     * Promote an existing version to the release pointer without touching the
     * draft: the standard rollback path.
     */
    async releaseVersion(
        store: WorkflowDefinitionStore,
        version: number,
        options: { publishedBy?: string } = {}
    ): Promise<WorkflowRelease | undefined> {
        if (typeof store.publishVersion !== 'function') {
            this.setError('workflow.error.publishUnsupported');
            return undefined;
        }
        const release = await store.publishVersion(this.definition.id, version, {
            publishedBy: options.publishedBy || this.author || undefined
        });
        this.setError('');
        this.setMessage('workflow.message.published', { version: release.version });
        return release;
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
        const graph = validateVisualWorkflow(this.definition);
        const configIssues = validateWorkflowConfigs(this.definition, this.registry)
            .map(issue => `${issue.nodeName} · ${issue.label}: ${issue.message}`);
        const errors = [...graph.errors, ...configIssues];
        return { valid: errors.length === 0, errors };
    }

    markSaved(): void {
        this.dirty = false;
        this.savedSnapshot = JSON.stringify(this.definition);
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

    /**
     * Normalize a definition into a fully populated, immutable document.
     *
     * Returns a new object (and new node/connection arrays) instead of mutating
     * the assigned definition in place: view models key their caches on
     * definition identity, so in-place normalization left stale projections
     * (for example nodes rendered without their registry ports until the next
     * interaction).
     */
    private normalize(definition: VisualWorkflowDefinition): VisualWorkflowDefinition {
        const nodes = (definition.nodes || []).map(node => {
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
        const connections = (definition.connections || []).map(connection => ({
            ...connection,
            sourcePort: connection.sourcePort || 'out',
            targetPort: connection.targetPort || 'in'
        }));
        const nodeIds = new Set(nodes.map(node => node.id));
        const groups = (definition.groups || [])
            .map(group => ({
                ...group,
                id: group.id || nowId('group'),
                name: group.name || group.id || 'Group',
                nodeIds: (group.nodeIds || []).filter(id => nodeIds.has(id))
            }))
            .filter(group => group.nodeIds.length);
        return {
            ...definition,
            id: definition.id || nowId('workflow'),
            name: definition.name || 'Unnamed Workflow',
            nodes,
            connections,
            ...(definition.groups || groups.length ? { groups } : {})
        };
    }

    private commit(mutator: (definition: VisualWorkflowDefinition) => VisualWorkflowDefinition): void {
        this.pushHistory(this.definition);
        this.redoStack = [];
        this.applyDefinition(mutator(this.definition));
        this.dirty = true;
    }

    private applyDefinition(definition: VisualWorkflowDefinition): void {
        // No metadata stamping here: this runs for transient projections such as
        // pointermove drags. Replacing the definition object (or its metadata)
        // on every move re-triggered every canvas binding; commits stamp
        // `updatedAt` themselves.
        this.definition = definition;
    }

    private pushHistory(definition: VisualWorkflowDefinition): void {
        this.undoStack.push(definition);
        if (this.undoStack.length > HISTORY_LIMIT) {
            this.undoStack.shift();
        }
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
