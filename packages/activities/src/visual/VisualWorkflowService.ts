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
    WorkflowExecutionOptions,
    WorkflowMessage
} from './types';
import { WorkflowNodeRegistry } from './node-registry';
import type { WorkflowContextStore } from '../../server/WorkflowContextStore';
import {
    resolveWorkflowValue,
    validateVisualWorkflow,
    VisualNodeRuntimeHost
} from './workflow-runtime';
import { compileVisualWorkflow, CompiledWorkflow } from './workflow-compiler';
import { WorkflowScheduleHandle, WorkflowScheduleOptions, WorkflowScheduler } from './workflow-scheduler';
import { VisualNodeActivityAdapter } from './VisualNodeActivityAdapter';
import {
    createVisualNodeHandler,
    VisualExecutionPathInterceptor,
    VisualNodeExecutionInput,
    VisualNodeHandlerLike
} from './visual-node-handler';
import { WorkflowNodePolicyInterceptor } from './workflow-interceptors';
import { WorkflowPluginRegistry } from '../plugins/plugin-registry';

function delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

function parseConfigJson(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

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
                    error: value.result.error?.message as any,
                    // Status lines are snapshotted with the run so replaying an
                    // execution shows the same node status as the live run.
                    ...(value.result.status ? { status: { ...value.result.status } } : {})
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
/** TLS options resolved from a `tls` config node. */
export interface WorkflowTlsOptions {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
    servername?: string;
}

/** Payload handed to the host TCP transport by `tcp-out`. */
export interface WorkflowFileReadRequest {
    path: string;
    encoding?: string;
}

export interface WorkflowFileReadResult {
    data: string;
    path: string;
    size: number;
}

export interface WorkflowFileWriteRequest {
    path: string;
    data: string;
    encoding?: string;
    append?: boolean;
    mkdir?: boolean;
}

export interface WorkflowFileWriteResult {
    path: string;
    bytes: number;
}

export interface WorkflowFileDeleteRequest {
    path: string;
}

export interface WorkflowFileDeleteResult {
    path: string;
    removed: boolean;
}

export interface WorkflowTcpSendRequest {
    host: string;
    port: number;
    payload: string;
    timeoutMs?: number;
    tls?: WorkflowTlsOptions;
}

/** Payload handed to the host UDP transport by `udp-out`. */
export interface WorkflowUdpSendRequest {
    host: string;
    port: number;
    payload: string;
    timeoutMs?: number;
    broadcast?: boolean;
}

/** Payload handed to the host WebSocket transport by `websocket-out`. */
export interface WorkflowWebSocketSendRequest {
    url: string;
    payload: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
    subprotocol?: string;
    tls?: WorkflowTlsOptions;
}

/** Broadcast payload for `websocket-out` when it references a shared listener. */
export interface WorkflowWebSocketBroadcastRequest {
    host: string;
    port: number;
    path?: string;
    payload: string;
    tls?: WorkflowTlsOptions;
}

let fallbackConfigRegistry: WorkflowNodeRegistry | undefined;

/**
 * Config nodes available to the runtime by id.
 *
 * The set is driven by `WorkflowNodeDefinition.configNode` rather than a
 * hardcoded type list, so plugin-provided config nodes resolve the same way.
 * Hosts that own a registry (the service, the inbound runner) pass their own
 * predicate; the fallback uses the built-in definitions.
 */
export function configNodeMap(
    definition: VisualWorkflowDefinition | undefined,
    isConfigNode?: (type: string) => boolean
): Record<string, any> {
    if (!isConfigNode) {
        if (!fallbackConfigRegistry) {
            fallbackConfigRegistry = new WorkflowNodeRegistry();
        }
        const registry = fallbackConfigRegistry;
        isConfigNode = (type: string) => registry.get(type)?.configNode === true;
    }
    const nodes: Record<string, any> = {};
    (definition?.nodes || []).forEach(node => {
        if (node && node.id && isConfigNode!(node.type)) {
            nodes[node.id] = node.config || {};
        }
    });
    return nodes;
}

/** Payload handed to the host MQTT transport by `mqtt-out`. */
export interface WorkflowMqttPublishRequest {
    url: string;
    topic: string;
    payload: string;
    qos?: number;
    retain?: boolean;
    clientId?: string;
    username?: string;
    password?: string;
    keepalive?: number;
    clean?: boolean;
    will?: { topic: string; payload: string; qos?: number; retain?: boolean };
    birth?: { topic: string; payload: string; qos?: number; retain?: boolean };
    tls?: WorkflowTlsOptions;
}

/** Pending `link call` waits, keyed by execution state (never serialized). */
const linkCallWaits = new WeakMap<object, Map<string, (result: ActivityResult) => void>>();

@Injectable()
export class VisualWorkflowService {
    private readonly executions = new Map<string, WorkflowExecutionState>();
    private readonly globalContext: Record<string, any> = {};
    private readonly nodeRuntime = new Map<string, Record<string, any>>();
    private definitionResolver?: (id: string) => Promise<VisualWorkflowDefinition | undefined> | VisualWorkflowDefinition | undefined;
    private credentialResolver?: (name: string) => Promise<string | undefined> | string | undefined;
    private mqttPublisher?: (message: WorkflowMqttPublishRequest) => Promise<void> | void;
    private contextStore?: WorkflowContextStore;
    private fileReader?: (request: WorkflowFileReadRequest) => Promise<WorkflowFileReadResult> | WorkflowFileReadResult;
    private fileWriter?: (request: WorkflowFileWriteRequest) => Promise<WorkflowFileWriteResult> | WorkflowFileWriteResult;
    private fileRemover?: (request: WorkflowFileDeleteRequest) => Promise<WorkflowFileDeleteResult> | WorkflowFileDeleteResult;
    private tcpSender?: (message: WorkflowTcpSendRequest) => Promise<void> | void;
    private udpSender?: (message: WorkflowUdpSendRequest) => Promise<void> | void;
    private webSocketSender?: (message: WorkflowWebSocketSendRequest) => Promise<void> | void;
    private webSocketBroadcaster?: (message: WorkflowWebSocketBroadcastRequest) => Promise<number> | number;
    private readonly registry: WorkflowNodeRegistry;
    private readonly pathInterceptor = new VisualExecutionPathInterceptor();
    private readonly policyInterceptor = new WorkflowNodePolicyInterceptor();
    private readonly interceptors: InterceptorLike<VisualNodeExecutionInput, any>[] = [];

    constructor(
        private injector: Injector,
        @Optional() registry?: WorkflowNodeRegistry,
        @Optional() private plugins?: WorkflowPluginRegistry
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
        const runtimeContext = this.withMessageContext(this.withPluginServices(context), options, definition);
        await this.restoreContext(definition, runtimeContext);
        const state = options.resumeFrom
            ? this.createStateFromCheckpoint(definition, options.resumeFrom, executionId)
            : this.createState(definition, executionId);
        this.executions.set(executionId, state);
        this.trimHistory(options.maxHistory);

        this.emit(options, state, { type: 'workflow-start', status: 'running' });
        this.checkpoint(options, state);

        const timeoutMs = Math.max(0, Number(options.timeout) || 0);
        const deadline = timeoutMs > 0 ? (state.startTime || Date.now()) + timeoutMs : 0;
        let timeoutTimer: any;
        if (timeoutMs > 0) {
            timeoutTimer = setTimeout(() => {
                if (state.status === 'running') {
                    state.status = 'cancelled';
                    state.error = new Error(`Workflow timed out after ${timeoutMs}ms`);
                }
            }, timeoutMs);
            (timeoutTimer as { unref?: () => void })?.unref?.();
        }

        try {
            const plan = compileVisualWorkflow(definition);
            const entryNodes = plan.entries.length
                ? plan.entries
                : plan.entry ? [plan.entry] : [];
            if (!entryNodes.length) {
                throw new Error('No entry node found in workflow');
            }

            const host: VisualNodeRuntimeHost = {
                resolveDefinition: (id) => this.definitionResolver?.(id),
                executeDefinition: (subDefinition, subContext) =>
                    this.execute(subDefinition, subContext, {
                        ...options,
                        executionId: undefined,
                        // Sub-workflows share the remaining budget instead of
                        // restarting a full timeout for every iteration.
                        timeout: deadline > 0 ? Math.max(1, deadline - Date.now()) : undefined
                    }),
                executeNode: async (node, nodeContext) => {
                    const executor = this.registry.executor(node.type);
                    return executor ? executor(node, nodeContext) : undefined;
                }
            };
            const visited = new Set<string>();
            const replayed = new Set<string>();
            const nodeHandler = createVisualNodeHandler(
                this.injector,
                this.nodeInterceptors()
            );
            let result: ActivityResult = { success: true };
            for (const entryNode of entryNodes) {
                result = await this.executeFromNode(
                    entryNode,
                    plan,
                    runtimeContext,
                    state,
                    options,
                    host,
                    visited,
                    nodeHandler,
                    !!options.resumeFrom,
                    replayed
                );
                if (!result.success) {
                    break;
                }
            }

            // Lifecycle nodes observe the completed/failed workflow rather than
            // being regular entries. Run them before the final status is stored.
            const lifecycle = [...plan.nodes.values()].filter(node =>
                node.type === 'complete' || node.type === 'catch' || node.type === 'status'
            );
            for (const node of lifecycle) {
                if (visited.has(node.id)) {
                    continue;
                }
                const type = node.type;
                if (type === 'complete' && !result.success) {
                    continue;
                }
                if (type === 'catch' && result.success) {
                    continue;
                }
                const scopes = String(node.config?.scope || '')
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean);
                const matchesScope = (record: any): boolean => !scopes.length || scopes.some(scope =>
                    record.nodeId === scope || plan.nodes.get(record.nodeId)?.type === scope
                );
                const matchesStatus = (record: any): boolean => type === 'catch'
                    ? record.status === 'failed'
                    : type === 'complete'
                        ? record.status === 'success'
                        : record.status === 'success' || record.status === 'failed';
                const matchedRecords = [...(state.nodeStates?.values() || [])]
                    .filter(record => matchesScope(record) && matchesStatus(record));
                if (scopes.length && !matchedRecords.length) {
                    continue;
                }
                const sourceRecord = matchedRecords[matchedRecords.length - 1];
                const lifecycleContext = {
                    ...runtimeContext,
                    workflowStatus: result.success ? 'completed' : 'failed',
                    workflowError: result.error?.message,
                    workflowResult: result,
                    ...(sourceRecord ? {
                        failedNodeId: type === 'catch' ? sourceRecord.nodeId : undefined,
                        errorMessage: type === 'catch' ? sourceRecord.error : undefined,
                        error: type === 'catch' && sourceRecord.error ? new Error(sourceRecord.error) : undefined,
                        completedNodeId: type === 'complete' ? sourceRecord.nodeId : undefined,
                        completedResult: type === 'complete' ? sourceRecord.result : undefined,
                        statusNodeId: sourceRecord.nodeId,
                        statusResult: sourceRecord.result
                    } : {})
                };
                const lifecycleResult = await this.executeFromNode(
                    node,
                    plan,
                    lifecycleContext,
                    state,
                    options,
                    host,
                    visited,
                    nodeHandler,
                    !!options.resumeFrom,
                    replayed
                );
                if (!lifecycleResult.success && type === 'catch') {
                    // Catch branches are best effort; the original failure stands.
                    continue;
                }
            }

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
                error: state.status === 'cancelled'
                    ? (state.error || result.error)
                    : (result.error || state.error)
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
        } finally {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
            }
            await this.persistContext(definition, runtimeContext);
        }
    }

    /**
     * Expose installed plugin services (and keep caller-provided services).
     * Task/function nodes can resolve them from `context.services`.
     */
    private nodeState(workflowId: string, nodeId: string): Record<string, any> {
        const key = `${workflowId}:${nodeId}`;
        let state = this.nodeRuntime.get(key);
        if (!state) {
            state = {};
            this.nodeRuntime.set(key, state);
        }
        return state;
    }

    /** Host store/library lookup used by sub-workflow/loop nodes. */
    /** Host credential lookup used by nodes with `{{credential:name}}` values. */
    setCredentialResolver(
        resolver?: (name: string) => Promise<string | undefined> | string | undefined
    ): void {
        this.credentialResolver = resolver;
    }

    /**
     * Host transport used by `mqtt-out`. The workflow runtime stays host
     * agnostic: browser hosts leave it unset and the node reports a clear error.
     */
    setMqttPublisher(
        publisher?: (message: WorkflowMqttPublishRequest) => Promise<void> | void
    ): void {
        this.mqttPublisher = publisher;
    }

    /** Registry used for config-node resolution by host-side runners. */
    getRegistry(): WorkflowNodeRegistry {
        return this.registry;
    }

    /** Resolve a credential through the host resolver (used by inbound listeners). */
    resolveCredential(name: string): Promise<string | undefined> | string | undefined {
        return this.credentialResolver?.(name);
    }

    /** Host transports for the outbound network nodes. */
    setTcpSender(sender?: (message: WorkflowTcpSendRequest) => Promise<void> | void): void {
        this.tcpSender = sender;
    }

    setUdpSender(sender?: (message: WorkflowUdpSendRequest) => Promise<void> | void): void {
        this.udpSender = sender;
    }

    setWebSocketSender(sender?: (message: WorkflowWebSocketSendRequest) => Promise<void> | void): void {
        this.webSocketSender = sender;
    }

    /** Host transport used by `websocket-out` when a shared listener is selected. */
    setWebSocketBroadcaster(
        broadcaster?: (message: WorkflowWebSocketBroadcastRequest) => Promise<number> | number
    ): void {
        this.webSocketBroadcaster = broadcaster;
    }

    /** Host file access for `file-in` / `file-out` (workspace-sandboxed). */
    setFileAccess(access?: {
        read?: (request: WorkflowFileReadRequest) => Promise<WorkflowFileReadResult> | WorkflowFileReadResult;
        write?: (request: WorkflowFileWriteRequest) => Promise<WorkflowFileWriteResult> | WorkflowFileWriteResult;
        remove?: (request: WorkflowFileDeleteRequest) => Promise<WorkflowFileDeleteResult> | WorkflowFileDeleteResult;
    }): void {
        this.fileReader = access?.read;
        this.fileWriter = access?.write;
        this.fileRemover = access?.remove;
    }

    /** Persist `flow`/`global` context between runs (optional host store). */
    setContextStore(store?: WorkflowContextStore): void {
        this.contextStore = store;
    }

    setDefinitionResolver(
        resolver?: (id: string) => Promise<VisualWorkflowDefinition | undefined> | VisualWorkflowDefinition | undefined
    ): void {
        this.definitionResolver = resolver;
    }

    /**
     * Snapshot of mutable per-node runtime state (rate-limit windows, queues).
     * State is scoped by workflow so diagnostics never leak across documents.
     */
    getNodeRuntimeState(workflowId?: string): Record<string, Record<string, any>> {
        const result: Record<string, Record<string, any>> = {};
        for (const [key, value] of this.nodeRuntime) {
            const separator = key.indexOf(':');
            const owner = separator < 0 ? '' : key.slice(0, separator);
            const nodeId = separator < 0 ? key : key.slice(separator + 1);
            if (workflowId && owner !== workflowId) {
                continue;
            }
            try {
                result[nodeId] = JSON.parse(JSON.stringify(value));
            } catch {
                result[nodeId] = { ...value };
            }
        }
        return result;
    }

    /** Drop rate-limit/queue state for one workflow (or all workflows). */
    clearNodeRuntimeState(workflowId?: string): void {
        for (const key of [...this.nodeRuntime.keys()]) {
            const separator = key.indexOf(':');
            const owner = separator < 0 ? '' : key.slice(0, separator);
            if (!workflowId || owner === workflowId) {
                this.nodeRuntime.delete(key);
            }
        }
    }

    /** Shared `global` scope exposed to every execution of this service. */
    getGlobalContext(): Record<string, any> {
        return this.globalContext;
    }

    /** `global` scope: service-wide values plus `global-config` nodes. */
    private globalScope(
        context: ActivityContext,
        definition?: VisualWorkflowDefinition
    ): Record<string, any> {
        // Keep one shared object so node writes to `global` persist across runs.
        const shared = this.globalContext;
        Object.assign(shared, (context as any)?.global || {});
        (definition?.nodes || []).forEach(node => {
            if (node.type !== 'global-config') {
                return;
            }
            const config = node.config || {};
            if (String(config.scope || 'env') !== 'global') {
                return;
            }
            const declared = config.values;
            if (declared && typeof declared === 'object' && !Array.isArray(declared)) {
                Object.assign(shared, declared);
            }
        });
        return shared;
    }

    /**
     * `env` scope: host-provided values plus `global-config` nodes, exposed with
     * Node-RED style `get`/`has` helpers (non-enumerable so JSON stays clean).
     */
    private environmentScope(
        context: ActivityContext,
        options: WorkflowExecutionOptions,
        definition?: VisualWorkflowDefinition
    ): Record<string, any> {
        const values: Record<string, any> = { ...(options.env || {}), ...((context as any)?.env || {}) };
        (definition?.nodes || []).forEach(node => {
            if (node.type !== 'global-config') {
                return;
            }
            const config = node.config || {};
            if (String(config.scope || 'env') !== 'env') {
                return;
            }
            const declared = config.values;
            if (declared && typeof declared === 'object' && !Array.isArray(declared)) {
                Object.assign(values, declared);
            }
        });
        const env: Record<string, any> = { ...values };
        Object.defineProperty(env, 'get', {
            value: (key: string) => env[key],
            enumerable: false
        });
        Object.defineProperty(env, 'has', {
            value: (key: string) => Object.prototype.hasOwnProperty.call(env, key),
            enumerable: false
        });
        return env;
    }

    /** Merge persisted `flow`/`global` context into the run (never blocks it). */
    private async restoreContext(
        definition: VisualWorkflowDefinition,
        context: ActivityContext
    ): Promise<void> {
        if (!this.contextStore) {
            return;
        }
        try {
            const saved = await this.contextStore.read(definition.id);
            if (!saved) {
                return;
            }
            if (saved.flow) {
                (context as any).flow = { ...(saved.flow || {}), ...((context as any).flow || {}) };
            }
            if (saved.global) {
                Object.assign(this.globalContext, saved.global);
                (context as any).global = { ...this.globalContext, ...((context as any).global || {}) };
            }
        } catch {
            // Context persistence is best effort; a broken store must not fail a run.
        }
    }

    /** Persist the final `flow`/`global` state so the next run can resume it. */
    private async persistContext(
        definition: VisualWorkflowDefinition,
        context: ActivityContext
    ): Promise<void> {
        if (!this.contextStore) {
            return;
        }
        try {
            await this.contextStore.write(definition.id, {
                flow: (context as any).flow,
                global: (context as any).global
            });
        } catch {
            // Never fail a completed run because persistence failed.
        }
    }

    /**
     * Ensure every execution has a msg envelope plus flow/global/env scopes.
     * Existing payload-based definitions keep working through `payload`.
     */
    private withMessageContext(
        context: ActivityContext,
        options: WorkflowExecutionOptions,
        definition?: VisualWorkflowDefinition
    ): ActivityContext {
        const existing = (context as any)?.msg;
        const payload = existing?.payload !== undefined
            ? existing.payload
            : (context as any)?.payload !== undefined
                ? (context as any).payload
                : (context as any)?.value;
        const msg: WorkflowMessage = {
            ...(existing || {}),
            payload,
            ...(existing?.topic !== undefined
                ? {}
                : (context as any)?.topic !== undefined ? { topic: (context as any).topic } : {}),
            meta: { ...(existing?.meta || {}) }
        };
        return {
            ...context,
            ...(payload !== undefined ? { payload } : {}),
            msg,
            flow: (context as any)?.flow || {},
            global: this.globalScope(context, definition),
            env: this.environmentScope(context, options, definition),
            resolveCredential: (name: string) => this.credentialResolver?.(name),
            mqttPublish: this.mqttPublisher
                ? (message: WorkflowMqttPublishRequest) => this.mqttPublisher!(message)
                : undefined,
            tcpSend: this.tcpSender
                ? (message: WorkflowTcpSendRequest) => this.tcpSender!(message)
                : undefined,
            udpSend: this.udpSender
                ? (message: WorkflowUdpSendRequest) => this.udpSender!(message)
                : undefined,
            webSocketSend: this.webSocketSender
                ? (message: WorkflowWebSocketSendRequest) => this.webSocketSender!(message)
                : undefined,
            webSocketBroadcast: this.webSocketBroadcaster
                ? (message: WorkflowWebSocketBroadcastRequest) => this.webSocketBroadcaster!(message)
                : undefined,
            fileRead: this.fileReader
                ? (request: WorkflowFileReadRequest) => this.fileReader!(request)
                : undefined,
            fileWrite: this.fileWriter
                ? (request: WorkflowFileWriteRequest) => this.fileWriter!(request)
                : undefined,
            fileDelete: this.fileRemover
                ? (request: WorkflowFileDeleteRequest) => this.fileRemover!(request)
                : undefined,
            configNodes: configNodeMap(definition, type => this.registry.get(type)?.configNode === true)
        };
    }

    /** Apply a node's returned `msg` (or legacy payload) to its branch context. */
    private applyResultMessage(context: ActivityContext, result: ActivityResult): void {
        const data = result?.data as Record<string, any> | undefined;
        if (!data || typeof data !== 'object') {
            return;
        }
        const current = (context as any).msg;
        const incoming = data.msg;
        if (incoming && typeof incoming === 'object') {
            const msg: WorkflowMessage = {
                ...(current || {}),
                ...incoming,
                meta: { ...(current?.meta || {}), ...(incoming.meta || {}) }
            };
            if (!('payload' in incoming) && current?.payload !== undefined) {
                msg.payload = current.payload;
            }
            (context as any).msg = msg;
            (context as any).payload = msg.payload;
            if (msg.topic !== undefined) {
                (context as any).topic = msg.topic;
            }
            return;
        }
        if ('payload' in data && current) {
            const msg: WorkflowMessage = {
                ...current,
                payload: data.payload,
                ...(data.topic !== undefined ? { topic: data.topic } : {}),
                ...(data.parts !== undefined ? { parts: data.parts } : {})
            };
            (context as any).msg = msg;
            (context as any).payload = msg.payload;
            if (msg.topic !== undefined) {
                (context as any).topic = msg.topic;
            }
        }
    }

    private withPluginServices(context: ActivityContext): ActivityContext {
        const installed = this.plugins?.serviceRegistry.toObject();
        if (!installed || !Object.keys(installed).length) {
            return context;
        }
        const own = (context as any)?.services || {};
        return { ...context, services: { ...installed, ...own } } as ActivityContext;
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
        replayed: Set<string> = new Set<string>(),
        rerun = false
    ): Promise<ActivityResult> {
        if (state.status === 'cancelled' || this.isCancelled(state)) {
            state.status = 'cancelled';
            return { success: false, error: new Error('Workflow cancelled') };
        }
        if (visited.has(node.id)) {
            return state.nodeResults.get(node.id) || { success: true, data: { nodeId: node.id, skipped: true } };
        }

        if (node.disabled === true) {
            visited.add(node.id);
            const disabledResult: ActivityResult = {
                success: true,
                data: { nodeId: node.id, skipped: true, disabled: true }
            };
            const disabledRecord = state.nodeStates?.get(node.id);
            if (disabledRecord) {
                disabledRecord.status = 'skipped';
                disabledRecord.finishedAt = Date.now();
                disabledRecord.result = disabledResult;
            }
            state.nodeResults.set(node.id, disabledResult);
            (plan.outgoing.get(node.id) || [])
                .forEach(connection => this.markEdgeSkipped(state, connection.id, options));
            return disabledResult;
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
        } else if (settled && !rerun) {
            visited.add(node.id);
            return this.existingNodeResult(node.id, record!, state);
        } else {
            if (node.type === 'join') {
                let ready = this.isJoinReady(plan, state, node.id);
                const mode = String(node.config?.mode || 'array');
                const timeoutMs = mode === 'timeout'
                    ? Math.max(0, Number(node.config?.timeout) || 0)
                    : 0;
                if (!ready && timeoutMs > 0) {
                    // Timeout join: the first arriving branch waits for siblings
                    // and then continues with whatever settled in time.
                    const deadline = Date.now() + timeoutMs;
                    while (!ready && Date.now() < deadline) {
                        if (String(state.status) === 'cancelled' || this.isCancelled(state)) {
                            state.status = 'cancelled';
                            return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                        }
                        await delay(Math.min(25, Math.max(1, deadline - Date.now())));
                        ready = this.isJoinReady(plan, state, node.id);
                    }
                    if (!ready) {
                        ready = true;
                    }
                }
                if (!ready) {
                    // A parallel branch reached the join before its siblings finished.
                    // Do not execute or mark it visited; a later branch will.
                    return { success: true, data: { nodeId: node.id, waiting: true } };
                }
                if (visited.has(node.id)) {
                    return state.nodeResults.get(node.id)
                        || { success: true, data: { nodeId: node.id, waiting: true } };
                }
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
                extras: {
                    cancelled: () => state.status === 'cancelled' || this.isCancelled(state),
                    nodeState: this.nodeState(state.workflowId, node.id),
                    incoming: node.type === 'join'
                        ? (plan.incoming.get(node.id) || []).map(connection => ({
                            connectionId: connection.id,
                            sourcePort: connection.sourcePort,
                            nodeId: connection.sourceNodeId,
                            result: state.nodeResults.get(connection.sourceNodeId)
                        }))
                        : undefined
                },
                emit: partial => this.emit(options, state, partial)
            });
            this.checkpoint(options, state);
        }

        this.applyResultMessage(context, result);

        if (String(state.status) === 'cancelled' || this.isCancelled(state)) {
            state.status = 'cancelled';
            const cancelledRecord = state.nodeStates?.get(node.id);
            if (cancelledRecord) {
                cancelledRecord.status = 'cancelled';
                cancelledRecord.error = state.error?.message || result.error?.message;
            }
            return {
                success: false,
                error: state.error || new Error('Workflow cancelled'),
                data: { nodeId: node.id }
            };
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
                    replayed,
                    rerun
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

        // Inbound entry nodes only start their branch when a matching request
        // or message reached the execution context.
        if ((node.type === 'http-in' || node.type === 'tcp-in' || node.type === 'udp-in' || node.type === 'websocket-in')
            && result.data?.matched !== true) {
            (plan.outgoing.get(node.id) || [])
                .forEach(connection => this.markEdgeSkipped(state, connection.id, options));
            return result;
        }

        // Rate-limited nodes drop the message without failing the workflow.
        if (result.success && result.data?.dropped === true) {
            (plan.outgoing.get(node.id) || [])
                .forEach(connection => this.markEdgeSkipped(state, connection.id, options));
            return result;
        }

        // Try/catch nodes guard their downstream branch: a failure anywhere in
        // the guarded chain is routed to the `error` port instead of aborting
        // the workflow.
        if (node.type === 'trycatch') {
            const guardedResult = await this.executeGuardedNode(
                node,
                plan,
                context,
                result,
                state,
                options,
                host,
                visited,
                nodeHandler,
                resume,
                replayed,
                rerun
            );
            // The guarded branch settles after the node itself ran, so replace
            // the recorded result with the outcome of the whole guarded chain.
            state.nodeResults.set(node.id, guardedResult);
            const record = state.nodeStates?.get(node.id);
            if (record) {
                record.result = guardedResult;
                record.status = guardedResult.success ? 'success' : 'failed';
                record.error = guardedResult.error?.message;
            }
            return guardedResult;
        }

        // Trigger nodes can emit a second payload after a delay; each emission
        // runs the downstream branch again with its own message.
        if (node.type === 'trigger' && node.config?.emitSecond === true) {
            return this.executeTriggerEmissions(
                node,
                plan,
                context,
                result,
                state,
                options,
                host,
                nodeHandler,
                resume,
                replayed
            );
        }

        if (node.type === 'link') {
            return this.executeLinkNode(
                node, plan, context, result, state, options, host,
                visited, nodeHandler, resume, replayed, rerun
            );
        }

        return this.traverseOutgoing(
            node,
            plan,
            context,
            result,
            state,
            options,
            host,
            visited,
            nodeHandler,
            resume,
            replayed,
            rerun
        );
    }

    /**
     * Node-RED style link routing:
     * - `out` jumps into every matching `in` node (their branches run);
     * - `in` continues downstream as usual;
     * - `call` executes a matching `in` branch and waits for its `return`;
     * - `return` hands the current message back to the pending call and stops.
     */
    private async executeLinkNode(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        result: ActivityResult,
        state: WorkflowExecutionState,
        options: WorkflowExecutionOptions,
        host: VisualNodeRuntimeHost,
        visited: Set<string>,
        nodeHandler: VisualNodeHandlerLike,
        resume: boolean,
        replayed: Set<string>,
        rerun: boolean
    ): Promise<ActivityResult> {
        const config = node.config || {};
        const mode = String(config.mode || 'out');
        const names = this.linkNames(config.links);
        if (mode === 'in') {
            // A link-in only continues its own branch; delivery is driven by
            // the matching link-out/call.
            return this.traverseOutgoing(node, plan, context, result, state, options, host, visited, nodeHandler, resume, replayed, rerun);
        }
        if (mode === 'return') {
            const callId = String((context as any)?.linkCallId || '');
            const waiter = callId ? linkCallWaits.get(state)?.get(callId) : undefined;
            if (waiter) {
                linkCallWaits.get(state)?.delete(callId);
                // Hand the *incoming message* back, not the link node metadata.
                const msg = (context as any)?.msg;
                waiter({
                    success: true,
                    data: {
                        nodeId: node.id,
                        ...(msg ? { msg: { ...msg }, payload: msg.payload } : { payload: (context as any)?.payload })
                    }
                });
            }
            return result;
        }
        if (!names.length) {
            return this.traverseOutgoing(node, plan, context, result, state, options, host, visited, nodeHandler, resume, replayed, rerun);
        }
        const targets = this.linkTargets(plan, node, names, mode === 'call' ? 'in' : 'in');
        if (!targets.length) {
            if (mode === 'call') {
                return {
                    success: false,
                    error: new Error(`Link call "${names.join(', ')}" found no matching link-in node.`),
                    data: { nodeId: node.id, links: names }
                };
            }
            return this.traverseOutgoing(node, plan, context, result, state, options, host, visited, nodeHandler, resume, replayed, rerun);
        }

        if (mode === 'call') {
            const callId = `${state.executionId}:${node.id}`;
            const timeoutMs = Math.max(0, Number(config.timeout) || 0) || 5000;
            let resolveReturn: (value: ActivityResult) => void = () => undefined;
            const returned = new Promise<ActivityResult>(resolve => { resolveReturn = resolve; });
            let waits = linkCallWaits.get(state);
            if (!waits) {
                waits = new Map();
                linkCallWaits.set(state, waits);
            }
            waits.set(callId, resolveReturn);
            const callContext = { ...this.mergeContext(context, result, {} as NodeConnection), linkCallId: callId };
            let timer: any;
            const timeout = new Promise<undefined>(resolve => {
                timer = setTimeout(() => resolve(undefined), timeoutMs);
                timer?.unref?.();
            });
            try {
                for (const target of targets) {
                    void this.executeFromNode(
                        target, plan, callContext, state, options, host,
                        new Set(visited), nodeHandler, resume, replayed, rerun
                    );
                }
                const answer = await Promise.race([returned, timeout]);
                if (!answer) {
                    return {
                        success: false,
                        error: new Error(`Link call "${names.join(', ')}" timed out after ${timeoutMs}ms waiting for a link-return.`),
                        data: { nodeId: node.id, links: names }
                    };
                }
                // Continue the call site with the *returned* message.
                const returnedMessage = (answer as any)?.data?.msg;
                const merged: any = returnedMessage
                    ? { ...context, msg: { ...returnedMessage }, payload: returnedMessage.payload }
                    : { ...context };
                return this.traverseOutgoing(node, plan, merged, answer, state, options, host, visited, nodeHandler, resume, replayed, rerun);
            } finally {
                if (timer) {
                    clearTimeout(timer);
                }
                linkCallWaits.get(state)?.delete(callId);
            }
        }

        // mode 'out': enter every matching link-in branch with the current message.
        let last = result;
        for (const target of targets) {
            last = await this.executeFromNode(
                target, plan, this.mergeContext(context, result, {} as NodeConnection),
                state, options, host, visited, nodeHandler, resume, replayed, rerun
            );
        }
        return last;
    }

    private linkNames(value: any): string[] {
        return String(value || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    private linkTargets(
        plan: CompiledWorkflow,
        node: IVisualWorkflowNode,
        names: string[],
        mode: 'in'
    ): IVisualWorkflowNode[] {
        const wanted = new Set(names);
        return [...plan.nodes.values()].filter(candidate =>
            candidate.type === 'link'
            && candidate.id !== node.id
            && String(candidate.config?.mode || 'out') === mode
            && this.linkNames(candidate.config?.links).some(name => wanted.has(name))
        );
    }

    private async traverseOutgoing(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        result: ActivityResult,
        state: WorkflowExecutionState,
        options: WorkflowExecutionOptions,
        host: VisualNodeRuntimeHost,
        visited: Set<string>,
        nodeHandler: VisualNodeHandlerLike,
        resume: boolean,
        replayed: Set<string>,
        rerun = false
    ): Promise<ActivityResult> {
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
                    replayed,
                    rerun
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
                replayed,
                rerun
            );
            if (!nextResult.success) {
                return nextResult;
            }
        }

        return result;
    }

    /**
     * Resolve the configured second-trigger payload the same way the runtime
     * resolves the first one: objects are merged into the message, scalars are
     * exposed as `payload`.
     */
    private triggerEmissionResult(
        node: IVisualWorkflowNode,
        payload: any,
        emission: number
    ): ActivityResult {
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            return {
                success: true,
                data: { ...payload, nodeId: node.id, triggered: true, emission }
            };
        }
        return {
            success: true,
            data: { nodeId: node.id, triggered: true, payload, emission }
        };
    }

    private async executeTriggerEmissions(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        result: ActivityResult,
        state: WorkflowExecutionState,
        options: WorkflowExecutionOptions,
        host: VisualNodeRuntimeHost,
        nodeHandler: VisualNodeHandlerLike,
        resume: boolean,
        replayed: Set<string>
    ): Promise<ActivityResult> {
        const config = node.config || {};
        const emissions: Array<{ result: ActivityResult; delay: number }> = [
            {
                result: this.triggerEmissionResult(node, { ...(result.data || {}) }, 1),
                delay: 0
            }
        ];
        emissions.push({
            result: this.triggerEmissionResult(node, parseConfigJson(config.secondPayload ?? {}), 2),
            delay: Math.max(0, Number(config.secondDelay) || 0)
        });

        let lastResult: ActivityResult = result;
        for (let index = 0; index < emissions.length; index++) {
            const emission = emissions[index];
            if (emission.delay > 0) {
                await delay(emission.delay);
            }
            if (state.status === 'cancelled' || this.isCancelled(state)) {
                state.status = 'cancelled';
                return { success: false, error: new Error('Workflow cancelled') };
            }
            // Every emission is a fresh message: nodes on the branch run again
            // instead of being treated as already visited.
            const passVisited = new Set<string>([node.id]);
            lastResult = await this.traverseOutgoing(
                node,
                plan,
                context,
                emission.result,
                state,
                options,
                host,
                passVisited,
                nodeHandler,
                resume,
                replayed,
                index > 0
            );
            if (!lastResult.success) {
                return lastResult;
            }
        }
        return lastResult;
    }

    private async executeGuardedNode(
        node: IVisualWorkflowNode,
        plan: CompiledWorkflow,
        context: ActivityContext,
        result: ActivityResult,
        state: WorkflowExecutionState,
        options: WorkflowExecutionOptions,
        host: VisualNodeRuntimeHost,
        visited: Set<string>,
        nodeHandler: VisualNodeHandlerLike,
        resume: boolean,
        replayed: Set<string>,
        rerun = false
    ): Promise<ActivityResult> {
        const outgoing = plan.outgoing.get(node.id) || [];
        const guardedEdges = outgoing.filter(connection => connection.sourcePort !== 'error');
        const recoveryEdges = outgoing.filter(connection => connection.sourcePort === 'error');
        let failure: ActivityResult | undefined;
        let failedNodeId: string | undefined;
        let lastResult: ActivityResult = result;

        for (const connection of guardedEdges) {
            const nextNode = plan.nodes.get(connection.targetNodeId);
            if (!nextNode) {
                continue;
            }
            this.markEdgeTraversed(state, connection, options);
            try {
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
                    replayed,
                    rerun
                );
                if (!nextResult.success) {
                    failure = nextResult;
                    failedNodeId = nextNode.id;
                    break;
                }
                lastResult = nextResult;
            } catch (error) {
                failure = { success: false, error: error as Error };
                failedNodeId = nextNode.id;
                break;
            }
        }

        if (!failure) {
            recoveryEdges.forEach(connection => this.markEdgeSkipped(state, connection.id, options));
            return lastResult;
        }

        // Remaining guarded edges never ran; mark them skipped so the designer
        // shows an accurate execution path.
        guardedEdges.forEach(connection => this.markEdgeSkipped(state, connection.id, options));

        const errorContext: ActivityContext = {
            ...context,
            error: failure.error,
            errorMessage: failure.error?.message,
            failedNodeId,
            failedResult: failure
        };
        for (const connection of recoveryEdges) {
            const nextNode = plan.nodes.get(connection.targetNodeId);
            if (!nextNode) {
                continue;
            }
            this.markEdgeTraversed(state, connection, options);
            try {
                const recovered = await this.executeFromNode(
                    nextNode,
                    plan,
                    errorContext,
                    state,
                    options,
                    host,
                    visited,
                    nodeHandler,
                    resume,
                    replayed,
                    rerun
                );
                if (!recovered.success) {
                    return recovered;
                }
            } catch (error) {
                return { success: false, error: error as Error };
            }
        }
        return {
            success: true,
            data: {
                nodeId: node.id,
                guarded: true,
                recovered: true,
                failedNodeId,
                error: failure.error?.message
            }
        };
    }

    private mergeContext(
        context: ActivityContext,
        result: ActivityResult,
        _connection: NodeConnection
    ): ActivityContext {
        const data = { ...(result.data || {}) } as Record<string, any>;
        // The message is branch-local; do not share the same object across
        // parallel wires. `flow`/`global` stay shared by design.
        delete data.msg;
        const current = (context as any).msg;
        const msg = current
            ? { ...current, meta: { ...(current.meta || {}) } }
            : undefined;
        return {
            ...context,
            ...data,
            ...(msg ? { msg, payload: msg.payload } : {})
        };
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
        const node = plan.nodes.get(nodeId);
        if (String(node?.config?.mode || 'array') === 'count') {
            const needed = Math.max(1, Number(node?.config?.count) || 1);
            return statuses.filter(status => status === 'success').length >= needed;
        }
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

        const explicitPort = result.data?.port;
        if (typeof explicitPort === 'string' && explicitPort) {
            const matched = outgoing.filter(connection => connection.sourcePort === explicitPort);
            if (matched.length) {
                return matched;
            }
        }

        const routes = result.data?.routes;
        if (Array.isArray(routes)) {
            const ports = new Set((routes.length ? routes : [0]).map(value => {
                const index = Number(value) || 0;
                return index > 0 ? `route-${index}` : 'default';
            }));
            const matched = outgoing.filter(connection => ports.has(connection.sourcePort));
            if (matched.length) {
                return matched;
            }
            return outgoing.filter(connection => connection.sourcePort === 'default');
        }

        const route = result.data?.route;
        if (typeof route === 'number') {
            const port = route > 0 ? `route-${route}` : 'default';
            const matched = outgoing.filter(connection => connection.sourcePort === port);
            if (matched.length) {
                return matched;
            }
            return outgoing.filter(connection => connection.sourcePort === 'default');
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
        // Repeat emissions traverse the same edge again, so the count grows
        // while a single pass only marks each connection once.
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

    /** Drop finished in-memory runs (one workflow, or all when omitted). */
    clearExecutions(workflowId?: string): void {
        for (const [executionId, state] of this.executions) {
            if (state.status === 'running') {
                continue;
            }
            if (!workflowId || state.workflowId === workflowId) {
                this.executions.delete(executionId);
            }
        }
    }

    /**
     * Start interval/once inject triggers. Call `stop()` on the returned handle
     * when the host is done (page/tab/window teardown).
     */
    startSchedule(definition: VisualWorkflowDefinition, options: WorkflowScheduleOptions = {}): WorkflowScheduleHandle {
        return new WorkflowScheduler(this).start(definition as any, options);
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
