import { parseYaml, stringifyYaml } from './workflow-yaml';
import { getWorkflowNodeHandler } from './runtime/workflow-node-handlers';
import './runtime/control-handlers';
import './runtime/handlers/parsers';
import './runtime/handlers/data';
import './runtime/handlers/flow';
import './runtime/handlers/action';
import './runtime/handlers/network';
import { pause } from './runtime/timing';
import {
    coerceJson,
    compareValues,
    resolveCompareValue,
    resolveCompareValueAsync,
    resolveCredentialValue,
    resolveWorkflowValue
} from './runtime/values';
import { evaluateWorkflowExpression } from './workflow-expression';
import { Activity, ActivityContext, ActivityNodeStatus, ActivityResult } from '../activities/Activity';
import {
    isWorkflowValueRef,
    readWorkflowProperty as resolveFrom,
    resolveWorkflowTypedValue,
    resolveWorkflowTypedValueAsync,
    workflowExpressionMarkers,
    resolveWorkflowExpressionMarkers,
    resolveWorkflowMarkersAsync
} from './workflow-typed-value';
import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition
} from './types';

export { evaluateCondition, evaluateConditionAsync, resolveCredentialValue, resolveWorkflowValue } from './runtime/values';
export {
    resolveHttpConfig, resolveMqttConfig, resolveTcpConfig, resolveTlsOptions,
    resolveUdpConfig, resolveWebSocketClientConfig, resolveWebSocketListenerConfig
} from './runtime/network-config';


/**
 * Extra execution data the engine resolves before a node runs. Branch node
 * results are attached for join-style nodes so they can merge their inputs.
 */
export interface VisualNodeExecutionExtras {
    /** True once the run has been cancelled or timed out. */
    cancelled?: () => boolean;
    /** Mutable per-node runtime state (rate limits, timers). */
    nodeState?: Record<string, any>;
    incoming?: Array<{
        connectionId: string;
        sourcePort?: string;
        nodeId: string;
        result?: ActivityResult;
    }>;
}

export interface VisualNodeRuntimeHost {
    /**
     * Allow a subprocess node to execute another visual definition.
     */
    executeDefinition?(definition: VisualWorkflowDefinition, context: ActivityContext): Promise<ActivityResult>;
    /**
     * Execute a node supplied by an installed workflow plugin. Returning
     * `undefined` means no plugin executor handles this node type.
     */
    executeNode?(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult | undefined> | ActivityResult | undefined;
    /** Resolve a referenced sub-workflow by id (host store/library). */
    resolveDefinition?(id: string): Promise<VisualWorkflowDefinition | undefined> | VisualWorkflowDefinition | undefined;
}

/** Parse a text payload as JSON when possible (file-in auto mode). */

async function resolveSubWorkflow(
    source: any,
    context: ActivityContext,
    host?: VisualNodeRuntimeHost
): Promise<VisualWorkflowDefinition | undefined> {
    let definition = resolveWorkflowValue(source, context);
    if (!definition) {
        definition = coerceJson(source);
    }
    if (typeof definition === 'string') {
        const key = definition;
        definition = (context as any).workflows?.[key] || (context as any)[key];
        if (!definition && host?.resolveDefinition) {
            definition = await host.resolveDefinition(key);
        }
    }
    return definition && typeof definition === 'object'
        ? definition as VisualWorkflowDefinition
        : undefined;
}

/**
 * Execute one visual node. The runtime keeps node semantics platform-neutral so
 * the same definition runs from the browser editor, the terminal and a server.
 */
function createActivity(node: IVisualWorkflowNode): Activity | undefined {
    const type = node.activityType;
    if (!type) {
        return undefined;
    }
    try {
        const activity = new (type as any)();
        Object.assign(activity, node.config || {});
        return activity as Activity;
    } catch {
        return undefined;
    }
}


export async function executeVisualNode(
    node: IVisualWorkflowNode,
    context: ActivityContext,
    host?: VisualNodeRuntimeHost,
    extras?: VisualNodeExecutionExtras
): Promise<ActivityResult> {
    const config = node.config || {};
    // Node-RED node context: the executing node's local state.
    if (extras?.nodeState) {
        (context as any).node = extras.nodeState;
    }

    if (host?.executeNode) {
        const pluginResult = await host.executeNode(node, context);
        if (pluginResult) {
            return pluginResult;
        }
    }

    const customActivity = createActivity(node);
    if (customActivity) {
        return customActivity.execute(context);
    }

    // Registered handlers own their node family; the inline switch below is
    // the remaining migration surface (extracted family by family).
    const registered = getWorkflowNodeHandler(node.type);
    if (registered) {
        return registered({ node, context, host, extras });
    }

    switch (node.type) {

        case 'loop': {
            const iterations = Math.max(0, Math.min(10000, Number(config.iterations ?? 1) || 0));
            const definition = await resolveSubWorkflow(config.workflow, context, host);
            if (!definition || !host?.executeDefinition) {
                return {
                    success: false,
                    error: new Error('Loop requires a sub-workflow source'),
                    data: { nodeId: node.id, iterations }
                };
            }
            const results: ActivityResult[] = [];
            for (let index = 0; index < iterations; index++) {
                if (index > 0 && Number(config.delay) > 0) {
                    if (!(await pause(Number(config.delay), extras?.cancelled))) {
                        return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id, iterations: index } };
                    }
                }
                const child = await host.executeDefinition(definition as VisualWorkflowDefinition, context);
                results.push(child);
                if (!child.success) {
                    return {
                        success: false,
                        error: child.error || new Error('Loop sub-workflow failed'),
                        data: { nodeId: node.id, iterations: index + 1, results, count: results.length }
                    };
                }
            }
            return { success: true, data: { nodeId: node.id, iterations, results, count: results.length } };
        }

        case 'event-emit': {
            const event = String(config.event || 'workflow.event');
            const payload = await resolveWorkflowMarkersAsync(coerceJson(config.payload), context);
            const bus = (context as any).eventBus || (context as any).events;
            if (bus && typeof bus.emit === 'function') {
                bus.emit(event, payload);
                return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
            }
            if (typeof (context as any).emit === 'function') {
                (context as any).emit(event, payload);
                return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
            }
            return { success: true, data: { nodeId: node.id, event, emitted: false, payload } };
        }
        case 'event-wait': {
            const event = String(config.event || 'workflow.event');
            const timeout = Math.max(0, Number(config.timeout) || 0);
            const bus = (context as any).eventBus || (context as any).events;
            try {
                if (bus && typeof bus.wait === 'function') {
                    const value = await bus.wait(event, timeout);
                    return { success: true, data: { nodeId: node.id, event, value, waited: true } };
                }
                if (typeof (context as any).waitEvent === 'function') {
                    const value = timeout
                        ? await Promise.race([
                            Promise.resolve((context as any).waitEvent(event)),
                            new Promise(resolve => setTimeout(() => resolve(undefined), timeout))
                        ])
                        : await (context as any).waitEvent(event);
                    return { success: true, data: { nodeId: node.id, event, value, waited: true } };
                }
                return { success: true, data: { nodeId: node.id, event, waited: false } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id, event } };
            }
        }
        case 'command': {
            const command = String(config.command || '');
            const rawArgs = config.args;
            const args = Array.isArray(rawArgs)
                ? rawArgs.map(item => item && typeof item === 'object' && 'value' in item ? item.value : item)
                : coerceJson(rawArgs);
            const executor = (context as any).exec
                || (context as any).runCommand
                || (context as any).commands?.[command];
            if (typeof executor === 'function') {
                try {
                    const result = await executor(command, args, context);
                    return {
                        success: true,
                        data: result && typeof result === 'object'
                            ? { ...result, nodeId: node.id, command }
                            : { nodeId: node.id, command, result }
                    };
                } catch (error) {
                    return { success: false, error: error as Error, data: { nodeId: node.id, command } };
                }
            }
            return { success: true, data: { nodeId: node.id, command, skipped: true, args } };
        }
















        case 'subprocess': {
            const source = config.workflow;
            const definition = await resolveSubWorkflow(source, context, host);
            if (definition && host?.executeDefinition) {
                // `inputs`/`outputs` map subflow ports to context paths so the
                // parent chooses what the child sees and what comes back.
                const inputs = coerceJson(config.inputs) || {};
                const childContext: any = { ...context };
                Object.keys(inputs).forEach(key => {
                    childContext[key] = resolveWorkflowValue(inputs[key], context);
                });
                const result = await host.executeDefinition(definition, childContext);
                const outputs = coerceJson(config.outputs) || {};
                const mapped: Record<string, any> = {};
                Object.keys(outputs).forEach(key => {
                    const path = outputs[key];
                    const value = resolveFrom(result.data, path);
                    mapped[key] = value === undefined ? resolveFrom(result, path) : value;
                });
                const hasOutputs = Object.keys(mapped).length > 0;
                return {
                    success: result.success,
                    data: {
                        nodeId: node.id,
                        subprocess: result.data,
                        ...(hasOutputs ? { msg: mapped, payload: mapped } : {})
                    },
                    error: result.error
                };
            }
            if (source === undefined || source === null || source === '') {
                return { success: true, data: { nodeId: node.id, skipped: true, reason: 'No sub workflow configured' } };
            }
            return {
                success: false,
                error: new Error(`Sub-workflow not found: ${String(source)}. Configure a workflow id, a context path, or inline definition.`),
                data: { nodeId: node.id }
            };
        }
        case 'custom':
        default:
            if (config.execute && typeof config.execute === 'function') {
                return { success: true, data: { nodeId: node.id, result: await config.execute(context) } };
            }
            if (node.requiresServer) {
                return {
                    success: false,
                    error: new Error(`Node type "${node.type}" requires an installed workflow plugin on the execution host.`),
                    data: { nodeId: node.id, type: node.type, pluginId: node.pluginId }
                };
            }
            return {
                success: true,
                data: { nodeId: node.id, type: node.type, result: coerceJson(config.result) }
            };
    }
}

/**
 * Structural validation for persisted drafts.
 *
 * Incomplete documents (no start node, empty canvas, unfinished connections)
 * are valid drafts: the editor autosaves them and validates runnability when
 * the user actually runs the workflow.
 */
export function validateVisualWorkflowDraft(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!definition?.id) {
        errors.push('Workflow ID is required');
    }
    if (!definition?.name) {
        errors.push('Workflow name is required');
    }
    if (!Array.isArray(definition?.nodes)) {
        errors.push('Workflow nodes must be an array');
    }
    if (!Array.isArray(definition?.connections)) {
        errors.push('Workflow connections must be an array');
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Pure validation used by both the editor and the execution service.
 */
export function validateVisualWorkflow(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!definition?.id) {
        errors.push('Workflow ID is required');
    }
    if (!definition?.name) {
        errors.push('Workflow name is required');
    }
    if (!definition?.nodes || definition.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
        return { valid: errors.length === 0, errors };
    }

    const nodeIds = new Set<string>();
    const duplicateIds: string[] = [];
    for (const node of definition.nodes) {
        if (!node.id) {
            errors.push('Every node requires an id');
        } else if (nodeIds.has(node.id)) {
            duplicateIds.push(node.id);
        }
        nodeIds.add(node.id);
    }
    if (duplicateIds.length) {
        errors.push(`Duplicate node IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Start/end nodes are optional Node-RED style helpers. Any trigger or
    // orphan node can be an entry point, so no start-node requirement here.

    for (const connection of definition.connections || []) {
        if (!nodeIds.has(connection.sourceNodeId)) {
            errors.push(`Connection references non-existent source node: ${connection.sourceNodeId}`);
        }
        if (!nodeIds.has(connection.targetNodeId)) {
            errors.push(`Connection references non-existent target node: ${connection.targetNodeId}`);
        }
        if (connection.sourceNodeId === connection.targetNodeId) {
            errors.push(`Connection cannot link a node to itself: ${connection.sourceNodeId}`);
        }
    }

    if (hasCycle(definition)) {
        errors.push('Cycles detected in workflow');
    }

    return { valid: errors.length === 0, errors };
}

export function hasCycle(definition: VisualWorkflowDefinition): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const outgoing = new Map<string, string[]>();
    for (const node of definition.nodes || []) {
        outgoing.set(node.id, []);
    }
    for (const connection of definition.connections || []) {
        const list = outgoing.get(connection.sourceNodeId);
        if (list) {
            list.push(connection.targetNodeId);
        }
    }
    const visit = (id: string): boolean => {
        if (visiting.has(id)) {
            return true;
        }
        if (visited.has(id)) {
            return false;
        }
        visiting.add(id);
        for (const next of outgoing.get(id) || []) {
            if (visit(next)) {
                return true;
            }
        }
        visiting.delete(id);
        visited.add(id);
        return false;
    };
    for (const id of outgoing.keys()) {
        if (visit(id)) {
            return true;
        }
    }
    return false;
}

/**
 * Node-RED style entry points: explicit `start`/`inject` triggers first, then
 * every node without an incoming connection. Start/end nodes are optional;
 * any trigger or orphan node can begin a flow, and several entries can run in
 * sequence.
 */
export function findWorkflowEntryNodes(definition: VisualWorkflowDefinition): IVisualWorkflowNode[] {
    const nodes = definition?.nodes || [];
    const incoming = new Set((definition?.connections || []).map(connection => connection.targetNodeId));
    const entries: IVisualWorkflowNode[] = [];
    const push = (node: IVisualWorkflowNode) => {
        if (!entries.includes(node)) {
            entries.push(node);
        }
    };
    const lifecycle = new Set(['complete', 'catch', 'status']);
    // Link-in nodes are reached through their matching link-out nodes (or not
    // at all); they must never start a flow on their own.
    const isLinkIn = (node: IVisualWorkflowNode) =>
        node.type === 'link' && String(node.config?.mode || 'out') === 'in';
    nodes.filter(node => node.type === 'start').forEach(push);
    nodes.filter(node => node.type === 'inject').forEach(push);
    nodes.filter(node =>
        !lifecycle.has(node.type) && !incoming.has(node.id) && !isLinkIn(node)
    ).forEach(push);
    return entries;
}

export function findWorkflowStartNode(definition: VisualWorkflowDefinition): IVisualWorkflowNode | undefined {
    return findWorkflowEntryNodes(definition)[0];
}

export function outgoingConnections(
    definition: VisualWorkflowDefinition,
    nodeId: string
): NodeConnection[] {
    return (definition.connections || []).filter(connection => connection.sourceNodeId === nodeId);
}
