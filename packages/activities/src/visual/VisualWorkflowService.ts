/* eslint-disable no-case-declarations */
import { Injectable, Injector, Optional } from '@tsdi/ioc';
import { InterceptorLike, InterceptorResolver } from '@tsdi/core';
import { ActivityContext, ActivityResult } from '../activities/Activity';
import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition,
    EdgeExecutionState,
    WorkflowExecutionEvent,
    WorkflowExecutionEventType,
    WorkflowExecutionSnapshot,
    WorkflowExecutionState,
    WorkflowExecutionOptions
} from './types';
import { WorkflowNodeRegistry } from './node-registry';
import {
    resolveWorkflowValue,
    validateVisualWorkflow,
    VisualNodeRuntimeHost
} from './workflow-runtime';
import { compileVisualWorkflow, CompiledWorkflow } from './workflow-compiler';
import { VisualNodeActivityAdapter } from './VisualNodeActivityAdapter';
import {
    createVisualNodeHandler,
    VisualExecutionPathInterceptor,
    VisualNodeExecutionInput,
    VisualNodeHandlerLike
} from './visual-node-handler';
import { WorkflowNodePolicyInterceptor } from './workflow-interceptors';

const DEFAULT_HISTORY_LIMIT = 30;
const MAX_LOG_ENTRIES = 300;

/**
 * Convert an execution state (contains Maps) into a plain snapshot that can be
 * rendered reactively by the designer.
 */
export function toWorkflowExecutionSnapshot(state: WorkflowExecutionState): WorkflowExecutionSnapshot {
    const nodeStates: WorkflowExecutionSnapshot['nodeStates'] = {};
    state.nodeStates?.forEach((value, key) => {
        nodeStates[key] = {
            ...value,
            result: value.result
                ? {
                    success: value.result.success,
                    data: value.result.data,
                    error: value.result.error?.message as any
                }
                : undefined
        };
    });
    const edgeStates: WorkflowExecutionSnapshot['edgeStates'] = {};
    state.edgeStates?.forEach((value, key) => {
        edgeStates[key] = { ...value };
    });
    return {
        executionId: state.executionId,
        workflowId: state.workflowId,
        status: state.status,
        currentNodeId: state.currentNodeId,
        startTime: state.startTime,
        endTime: state.endTime,
        error: state.error?.message,
        nodeStates,
        edgeStates,
        activeNodeIds: [...(state.activeNodeIds || [])],
        logs: [...(state.logs || [])]
    };
}

/**
 * Visual workflow execution engine.
 *
 * The engine keeps the original `execute(definition, context)` contract while
 * adding:
 *  - per-node/per-edge execution states,
 *  - a real-time event stream (`onEvent`),
 *  - retained execution history for post-run inspection,
 *  - pluggable generic node definitions through {@link WorkflowNodeRegistry}.
 */
@Injectable()
export class VisualWorkflowService {
    private readonly executions = new Map<string, WorkflowExecutionState>();
    private readonly registry: WorkflowNodeRegistry;
    private readonly pathInterceptor = new VisualExecutionPathInterceptor();
    private readonly policyInterceptor = new WorkflowNodePolicyInterceptor();
    private readonly interceptors: InterceptorLike<VisualNodeExecutionInput, any>[] = [];

    constructor(
        private injector: Injector,
        @Optional() registry?: WorkflowNodeRegistry
    ) {
        this.registry = registry || new WorkflowNodeRegistry();
        const resolver = this.injector.get(InterceptorResolver, null);
        if (resolver) {
            resolver.addInterceptor(VisualNodeActivityAdapter, this.pathInterceptor);
            resolver.addInterceptor(VisualNodeActivityAdapter, this.policyInterceptor);
        }
    }

    /** Base chain shared by core resolver and embedded fallback. */
    private nodeInterceptors(): InterceptorLike<VisualNodeExecutionInput, any>[] {
        return [this.pathInterceptor, this.policyInterceptor, ...this.interceptors];
    }

    private get resolver(): InterceptorResolver | undefined {
        return this.injector.get(InterceptorResolver, null) ?? undefined;
    }

    /**
     * Register a core interceptor for generated visual node execution. The
     * interceptor follows the same `Interceptor` contract used by HTTP
     * handlers, events and other framework handlers.
     */
    use(interceptor: InterceptorLike<VisualNodeExecutionInput, any>, order?: number): this {
        if (!this.interceptors.includes(interceptor as any)) {
            this.interceptors.push(interceptor);
        }
        this.resolver?.addInterceptor(VisualNodeActivityAdapter, interceptor, order);
        return this;
    }

    remove(interceptor: InterceptorLike<VisualNodeExecutionInput, any>): this {
        const index = this.interceptors.indexOf(interceptor as any);
        if (index >= 0) {
            this.interceptors.splice(index, 1);
        }
        this.resolver?.removeInterceptor(VisualNodeActivityAdapter, interceptor);
        return this;
    }

    getInterceptorResolver(): InterceptorResolver | undefined {
        return this.resolver;
    }

    async execute(
        definition: VisualWorkflowDefinition,
        context: ActivityContext = {},
        options: WorkflowExecutionOptions = {}
    ): Promise<ActivityResult> {
        const executionId = options.executionId
            || options.resumeFrom?.executionId
            || this.generateExecutionId();
        const state = options.resumeFrom
            ? this.createStateFromCheckpoint(definition, options.resumeFrom, executionId)
            : this.createState(definition, executionId);
        this.executions.set(executionId, state);
        this.trimHistory(options.maxHistory);

        this.emit(options, state, { type: 'workflow-start', status: 'running' });
        this.checkpoint(options, state);

        try {
            const plan = compileVisualWorkflow(definition);
            const startNode = plan.entry;
            if (!startNode) {
                throw new Error('No start node found in workflow');
            }

            const host: VisualNodeRuntimeHost = {
                executeDefinition: (subDefinition, subContext) =>
                    this.execute(subDefinition, subContext, { ...options, executionId: undefined })
            };
            const visited = new Set<string>();
            const replayed = new Set<string>();
            const nodeHandler = createVisualNodeHandler(
                this.injector,
                this.nodeInterceptors()
            );
            const result = await this.executeFromNode(
                startNode,
                plan,
                context,
                state,
                options,
                host,
                visited,
                nodeHandler,
                !!options.resumeFrom,
                replayed
            );

            if (state.status === 'cancelled' || this.isCancelled(state)) {
                state.status = 'cancelled';
                this.finishPendingNodes(state, 'skipped');
                this.emit(options, state, { type: 'workflow-cancelled', status: 'cancelled' });
            } else {
                state.status = result.success ? 'completed' : 'failed';
                if (!result.success && result.error) {
                    state.error = result.error;
                }
                this.finishPendingNodes(state, result.success ? 'skipped' : 'skipped');
                this.finishIdleEdges(state, 'skipped');
                this.emit(options, state, {
                    type: result.success ? 'workflow-end' : 'workflow-error',
                    status: state.status,
                    error: result.error
                });
            }
            state.endTime = Date.now();
            state.currentNodeId = undefined;
            this.checkpoint(options, state);

            const snapshot = toWorkflowExecutionSnapshot(state);
            return {
                success: state.status === 'completed',
                data: {
                    executionId,
                    workflowId: definition.id,
                    status: state.status,
                    nodeResults: Object.fromEntries(state.nodeResults),
                    executionState: snapshot,
                    ...(result.data || {})
                },
                error: result.error || state.error
            };
        } catch (error) {
            state.status = 'failed';
            state.endTime = Date.now();
            state.currentNodeId = undefined;
            state.error = error as Error;
            this.finishPendingNodes(state, 'skipped');
            this.finishIdleEdges(state, 'skipped');
            this.emit(options, state, {
                type: 'workflow-error',
                status: 'failed',
                error: error as Error
            });
            this.checkpoint(options, state);
            return {
                success: false,
                error: error as Error,
                data: {
                    executionId,
                    workflowId: definition?.id,
                    status: state.status,
                    executionState: toWorkflowExecutionSnapshot(state)
                }
            };
        }
    }

    private createState(definition: VisualWorkflowDefinition, executionId: string): WorkflowExecutionState {
        const nodeStates = new Map();
        (definition.nodes || []).forEach(node => {
            nodeStates.set(node.id, { nodeId: node.id, status: 'pending' });
        });
        const edgeStates = new Map();
        (definition.connections || []).forEach(connection => {
            edgeStates.set(connection.id, { connectionId: connection.id, status: 'idle', count: 0 });
        });
        return {
            executionId,
            workflowId: definition.id,
            status: 'running',
            startTime: Date.now(),
            nodeResults: new Map(),
            nodeStates,
            edgeStates,
            activeNodeIds: [],
            logs: []
        };
    }

    private createStateFromCheckpoint(
        definition: VisualWorkflowDefinition,
        checkpoint: WorkflowExecutionSnapshot,
        executionId: string
    ): WorkflowExecutionState {
        const state = this.createState(definition, executionId);
        state.status = 'running';
        state.startTime = checkpoint.startTime || state.startTime;
        state.endTime = undefined;
        state.currentNodeId = undefined;
        state.activeNodeIds = [];
        state.logs = [...(checkpoint.logs || [])];

        const nodeStates = checkpoint.nodeStates || {};
        for (const node of definition.nodes || []) {
            const record = nodeStates[node.id];
            if (record) {
                state.nodeStates?.set(node.id, { ...record });
                if (record.result) {
                    state.nodeResults.set(node.id, {
                        success: record.result.success,
                        data: record.result.data,
                        error: record.error ? new Error(String(record.error)) : undefined
                    });
                }
            }
        }
        const edgeStates = checkpoint.edgeStates || {};
        for (const connection of definition.connections || []) {
            const record = edgeStates[connection.id];
            if (record) {
                state.edgeStates?.set(connection.id, { ...record });
            }
        }
        return state;
    }

    private existingNodeResult(
        nodeId: string,
        record: { status: string; result?: ActivityResult; error?: string },
        state: WorkflowExecutionState
    ): ActivityResult {
        return state.nodeResults.get(nodeId)
            || record.result
            || {
                success: record.status === 'success',
                data: { nodeId, replayed: true },
                error: record.error ? new Error(record.error) : undefined
            };
    }

    private checkpoint(
        options: WorkflowExecutionOptions,
        state: WorkflowExecutionState
    ): void {
        if (!options.onCheckpoint) {
            return;
        }
        try {
            options.onCheckpoint(toWorkflowExecutionSnapshot(state));
        } catch {
            // Checkpoint persistence must never break the workflow.
        }
    }

    private async executeFromNode(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        state: WorkflowExecutionState,
        options: WorkflowExecutionOptions,
        host: VisualNodeRuntimeHost,
        visited: Set<string>,
        nodeHandler: VisualNodeHandlerLike,
        resume = false,
        replayed: Set<string> = new Set<string>()
    ): Promise<ActivityResult> {
        if (state.status === 'cancelled' || this.isCancelled(state)) {
            state.status = 'cancelled';
            return { success: false, error: new Error('Workflow cancelled') };
        }
        if (visited.has(node.id)) {
            return state.nodeResults.get(node.id) || { success: true, data: { nodeId: node.id, skipped: true } };
        }

        const record = state.nodeStates?.get(node.id);
        const settled = record
            && (record.status === 'success' || record.status === 'failed'
                || record.status === 'skipped' || record.status === 'cancelled');
        let result: ActivityResult;

        if (settled && resume && (record!.status === 'success' || record!.status === 'failed')) {
            if (replayed.has(node.id)) {
                return this.existingNodeResult(node.id, record!, state);
            }
            // Replay the completed path without running the node or emitting
            // another start/end pair, then continue to its downstream edges.
            replayed.add(node.id);
            visited.add(node.id);
            result = this.existingNodeResult(node.id, record!, state);
        } else if (settled) {
            visited.add(node.id);
            return this.existingNodeResult(node.id, record!, state);
        } else {
            if (node.type === 'join' && !this.isJoinReady(plan, state, node.id)) {
                // A parallel branch reached the join before its siblings finished.
                // Do not execute or mark it visited; the last arriving branch will.
                return { success: true, data: { nodeId: node.id, waiting: true } };
            }
            visited.add(node.id);

            // Generated node code runs through the core interceptor chain. The
            // built-in path interceptor records node start/end and streams events;
            // user interceptors can add retry, auth, metrics, etc.
            result = await nodeHandler.handleNode({
                node,
                context,
                host,
                state,
                options,
                emit: partial => this.emit(options, state, partial)
            });
            this.checkpoint(options, state);
        }

        if (!result.success) {
            const outgoing = plan.outgoing.get(node.id) || [];
            const errorConnections = outgoing.filter(connection => connection.sourcePort === 'error');
            if (!errorConnections.length) {
                return result;
            }
            // A node with an `error` port recovers through that branch instead
            // of aborting the whole workflow. Non-error edges are skipped.
            for (const connection of outgoing) {
                if (connection.sourcePort !== 'error') {
                    this.markEdgeSkipped(state, connection.id, options);
                }
            }
            const errorContext: ActivityContext = {
                ...context,
                error: result.error,
                errorMessage: result.error?.message,
                failedNodeId: node.id,
                failedResult: result
            };
            for (const connection of errorConnections) {
                const nextNode = plan.nodes.get(connection.targetNodeId);
                if (!nextNode) {
                    continue;
                }
                this.markEdgeTraversed(state, connection, options);
                const nextResult = await this.executeFromNode(
                    nextNode,
                    plan,
                    errorContext,
                    state,
                    options,
                    host,
                    visited,
                    nodeHandler,
                    resume,
                    replayed
                );
                if (!nextResult.success) {
                    return nextResult;
                }
            }
            return { success: true, data: { nodeId: node.id, recovered: true } };
        }
        if (node.type === 'end') {
            return result;
        }

        const nextConnections = this.selectNextConnections(node, plan, context, result);
        const selectedIds = new Set(nextConnections.map(connection => connection.id));
        for (const connection of plan.outgoing.get(node.id) || []) {
            if (!selectedIds.has(connection.id)) {
                this.markEdgeSkipped(state, connection.id, options);
            }
        }

        if (node.type === 'parallel' && nextConnections.length > 1) {
            const results = await Promise.all(nextConnections.map(connection => {
                const nextNode = plan.nodes.get(connection.targetNodeId);
                if (!nextNode) {
                    return Promise.resolve({ success: false, error: new Error(`Missing node ${connection.targetNodeId}`) } as ActivityResult);
                }
                this.markEdgeTraversed(state, connection, options);
                return this.executeFromNode(
                    nextNode,
                    plan,
                    this.mergeContext(context, result, connection),
                    state,
                    options,
                    host,
                    visited,
                    nodeHandler,
                    resume,
                    replayed
                );
            }));
            const failed = results.find(item => !item.success);
            return failed || result;
        }

        for (const connection of nextConnections) {
            const nextNode = plan.nodes.get(connection.targetNodeId);
            if (!nextNode) {
                continue;
            }
            this.markEdgeTraversed(state, connection, options);
            const nextResult = await this.executeFromNode(
                nextNode,
                plan,
                this.mergeContext(context, result, connection),
                state,
                options,
                host,
                visited,
                nodeHandler,
                resume,
                replayed
            );
            if (!nextResult.success) {
                return nextResult;
            }
        }

        return result;
    }

    private mergeContext(
        context: ActivityContext,
        result: ActivityResult,
        _connection: NodeConnection
    ): ActivityContext {
        return { ...context, ...(result.data || {}) };
    }

    private isJoinReady(
        plan: CompiledWorkflow,
        state: WorkflowExecutionState,
        nodeId: string
    ): boolean {
        const incoming = plan.incoming.get(nodeId) || [];
        if (!incoming.length) {
            return true;
        }
        const statuses = incoming.map(connection =>
            state.nodeStates?.get(connection.sourceNodeId)?.status
        );
        const settled = statuses.every(status =>
            status === 'success' || status === 'failed' || status === 'skipped' || status === 'cancelled'
        );
        return settled && statuses.some(status => status === 'success');
    }

    private selectNextConnections(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        result: ActivityResult
    ): NodeConnection[] {
        const outgoing = plan.outgoing.get(node.id) || [];
        if (!outgoing.length) {
            return [];
        }

        if (node.type === 'condition') {
            const selectedPort = result.data?.condition ? 'true' : 'false';
            const matched = outgoing.filter(connection => connection.sourcePort === selectedPort);
            return matched.length ? matched : outgoing.filter(connection => connection.sourcePort !== 'true' && connection.sourcePort !== 'false');
        }

        if (node.type === 'switch') {
            const value = result.data?.condition;
            const port = value === undefined || value === null ? '' : String(value);
            const exact = outgoing.filter(connection => connection.sourcePort === port);
            if (exact.length) {
                return exact;
            }
            const fallback = outgoing.filter(connection => connection.sourcePort === 'default');
            if (fallback.length) {
                return fallback;
            }
            return outgoing.filter(connection => connection.sourcePort === 'out');
        }

        return outgoing.filter(connection => {
            if (connection.sourcePort === 'error') {
                return false;
            }
            if (connection.condition === undefined || connection.condition === null) {
                return true;
            }
            if (typeof connection.condition === 'function') {
                return Boolean(connection.condition(context));
            }
            if (typeof connection.condition === 'boolean') {
                return connection.condition;
            }
            return Boolean(resolveWorkflowValue(connection.condition, context));
        });
    }

    private markEdgeTraversed(
        state: WorkflowExecutionState,
        connection: NodeConnection,
        options: WorkflowExecutionOptions
    ): void {
        const record: EdgeExecutionState = state.edgeStates?.get(connection.id) || {
            connectionId: connection.id,
            status: 'idle',
            count: 0
        };
        if (record.status === 'traversed') {
            return;
        }
        record.status = 'traversed';
        record.traversedAt = Date.now();
        record.count = (record.count || 0) + 1;
        state.edgeStates?.set(connection.id, record);
        this.emit(options, state, {
            type: 'edge-traversed',
            connectionId: connection.id,
            nodeId: connection.sourceNodeId,
            status: 'traversed'
        });
    }

    private markEdgeSkipped(
        state: WorkflowExecutionState,
        connectionId: string,
        options: WorkflowExecutionOptions
    ): void {
        const record: EdgeExecutionState = state.edgeStates?.get(connectionId) || {
            connectionId,
            status: 'idle',
            count: 0
        };
        if (record.status === 'traversed') {
            return;
        }
        record.status = 'skipped';
        state.edgeStates?.set(connectionId, record);
        this.emit(options, state, { type: 'edge-skipped', connectionId, status: 'skipped' });
    }

    private finishPendingNodes(state: WorkflowExecutionState, status: 'skipped' | 'cancelled'): void {
        state.nodeStates?.forEach((record, nodeId) => {
            if (record.status === 'pending' || record.status === 'idle') {
                record.status = status;
                state.nodeStates?.set(nodeId, record);
            }
        });
    }

    private finishIdleEdges(state: WorkflowExecutionState, status: 'skipped'): void {
        state.edgeStates?.forEach((record, connectionId) => {
            if (record.status === 'idle' || record.status === 'active') {
                record.status = status;
                state.edgeStates?.set(connectionId, record);
            }
        });
    }

    private emit(
        options: WorkflowExecutionOptions,
        state: WorkflowExecutionState,
        partial: {
            type: WorkflowExecutionEventType;
            nodeId?: string;
            connectionId?: string;
            status?: WorkflowExecutionEvent['status'];
            result?: ActivityResult;
            error?: Error;
        }
    ): void {
        const timestamp = Date.now();
        const event: WorkflowExecutionEvent = {
            ...partial,
            executionId: state.executionId,
            workflowId: state.workflowId,
            timestamp,
            snapshot: toWorkflowExecutionSnapshot(state)
        };
        if (state.logs) {
            state.logs.push({
                id: `${state.executionId}_${state.logs.length + 1}`,
                timestamp,
                level: this.logLevelFor(partial.type, partial.status),
                event: partial.type,
                message: this.logMessageFor(state, partial),
                nodeId: partial.nodeId,
                connectionId: partial.connectionId
            });
            if (state.logs.length > MAX_LOG_ENTRIES) {
                state.logs.splice(0, state.logs.length - MAX_LOG_ENTRIES);
            }
        }
        if (options.onEvent) {
            try {
                options.onEvent(event);
            } catch {
                // A visual listener must never break workflow execution.
            }
        }
    }

    private logLevelFor(
        type: WorkflowExecutionEventType,
        status?: WorkflowExecutionEvent['status']
    ): 'info' | 'success' | 'warning' | 'error' {
        if (type === 'workflow-error' || status === 'failed') {
            return 'error';
        }
        if (type === 'workflow-cancelled' || type === 'node-skipped' || type === 'edge-skipped') {
            return 'warning';
        }
        if (type === 'workflow-end' || status === 'success' || status === 'completed') {
            return 'success';
        }
        return 'info';
    }

    private logMessageFor(
        state: WorkflowExecutionState,
        partial: { type: WorkflowExecutionEventType; nodeId?: string; connectionId?: string; error?: Error }
    ): string {
        const node = partial.nodeId ? state.nodeResults.get(partial.nodeId) : undefined;
        switch (partial.type) {
            case 'workflow-start':
                return 'Workflow started';
            case 'workflow-end':
                return 'Workflow completed';
            case 'workflow-error':
                return `Workflow failed: ${partial.error?.message || state.error?.message || 'unknown error'}`;
            case 'workflow-cancelled':
                return 'Workflow cancelled';
            case 'node-start':
                return `Node ${partial.nodeId} started`;
            case 'node-end':
                return node?.success === false
                    ? `Node ${partial.nodeId} failed: ${node.error?.message || ''}`
                    : `Node ${partial.nodeId} finished`;
            case 'node-skipped':
                return `Node ${partial.nodeId} skipped`;
            case 'edge-traversed':
                return `Edge ${partial.connectionId} traversed`;
            case 'edge-skipped':
            default:
                return `Edge ${partial.connectionId} skipped`;
        }
    }

    private isCancelled(state: WorkflowExecutionState): boolean {
        return this.executions.get(state.executionId)?.status === 'cancelled';
    }

    private trimHistory(limit = DEFAULT_HISTORY_LIMIT): void {
        const max = Math.max(1, Number(limit) || DEFAULT_HISTORY_LIMIT);
        const finished = Array.from(this.executions.values())
            .filter(state => state.status !== 'running')
            .sort((a, b) => (a.endTime || 0) - (b.endTime || 0));
        while (finished.length > max) {
            const oldest = finished.shift();
            if (oldest) {
                this.executions.delete(oldest.executionId);
            }
        }
    }

    validate(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
        return validateVisualWorkflow(definition);
    }

    getExecution(executionId: string): WorkflowExecutionState | undefined {
        return this.executions.get(executionId);
    }

    getExecutionSnapshot(executionId: string): WorkflowExecutionSnapshot | undefined {
        const state = this.executions.get(executionId);
        return state ? toWorkflowExecutionSnapshot(state) : undefined;
    }

    getExecutions(): WorkflowExecutionState[] {
        return Array.from(this.executions.values());
    }

    async cancelExecution(executionId: string): Promise<void> {
        const state = this.executions.get(executionId);
        if (state) {
            state.status = 'cancelled';
            state.endTime = state.endTime || Date.now();
        }
    }

    getNodeRegistry(): WorkflowNodeRegistry {
        return this.registry;
    }

    serialize(definition: VisualWorkflowDefinition): string {
        return JSON.stringify(definition, null, 2);
    }

    deserialize(json: string): VisualWorkflowDefinition {
        return JSON.parse(json) as VisualWorkflowDefinition;
    }

    private generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
