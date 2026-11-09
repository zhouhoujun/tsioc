import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition
} from './types';
import {
    findWorkflowStartNode,
    outgoingConnections,
    validateVisualWorkflow
} from './workflow-runtime';

/**
 * Immutable execution plan produced from a visual workflow definition.
 *
 * The editor owns the editable document; the kernel executes this compiled plan
 * so graph normalization, adjacency and reachability are computed once per run.
 */
export interface CompiledWorkflow {
    definition: VisualWorkflowDefinition;
    entry?: IVisualWorkflowNode;
    nodes: Map<string, IVisualWorkflowNode>;
    outgoing: Map<string, NodeConnection[]>;
    incoming: Map<string, NodeConnection[]>;
    edges: NodeConnection[];
    /** BFS order from the entry node (unreachable nodes are appended). */
    order: string[];
    reachable: Set<string>;
    valid: boolean;
    errors: string[];
}

export function compileVisualWorkflow(definition: VisualWorkflowDefinition): CompiledWorkflow {
    const validation = validateVisualWorkflow(definition);
    const nodes = new Map<string, IVisualWorkflowNode>();
    const outgoing = new Map<string, NodeConnection[]>();
    const incoming = new Map<string, NodeConnection[]>();
    const edges = (definition?.connections || []).slice();

    for (const node of definition?.nodes || []) {
        nodes.set(node.id, node);
        outgoing.set(node.id, []);
        incoming.set(node.id, []);
    }
    for (const connection of edges) {
        outgoing.get(connection.sourceNodeId)?.push(connection);
        incoming.get(connection.targetNodeId)?.push(connection);
    }

    const entry = findWorkflowStartNode(definition);
    const order: string[] = [];
    const reachable = new Set<string>();
    if (entry) {
        const queue: string[] = [entry.id];
        reachable.add(entry.id);
        while (queue.length) {
            const id = queue.shift()!;
            order.push(id);
            for (const connection of outgoing.get(id) || []) {
                if (!reachable.has(connection.targetNodeId) && nodes.has(connection.targetNodeId)) {
                    reachable.add(connection.targetNodeId);
                    queue.push(connection.targetNodeId);
                }
            }
        }
    }
    for (const id of nodes.keys()) {
        if (!reachable.has(id)) {
            order.push(id);
        }
    }

    return {
        definition,
        entry,
        nodes,
        outgoing,
        incoming,
        edges,
        order,
        reachable,
        valid: validation.valid,
        errors: validation.errors
    };
}

/**
 * Compute a left-to-right layered layout for the canvas. Nodes at the same
 * distance from the entry share a column; unreachable nodes are placed after
 * the reachable graph.
 */
export function layoutVisualWorkflow(
    definition: VisualWorkflowDefinition,
    options: { originX?: number; originY?: number; columnGap?: number; rowGap?: number } = {}
): Record<string, { x: number; y: number }> {
    const plan = compileVisualWorkflow(definition);
    const originX = options.originX ?? 80;
    const originY = options.originY ?? 80;
    const columnGap = options.columnGap ?? 240;
    const rowGap = options.rowGap ?? 140;
    const depth = new Map<string, number>();
    const layers: string[][] = [];

    const roots = plan.entry ? [plan.entry.id] : [];
    const queue = [...roots];
    roots.forEach(id => depth.set(id, 0));
    while (queue.length) {
        const id = queue.shift()!;
        const current = depth.get(id) || 0;
        for (const connection of plan.outgoing.get(id) || []) {
            const target = connection.targetNodeId;
            if (!plan.nodes.has(target)) {
                continue;
            }
            const nextDepth = current + 1;
            const known = depth.get(target);
            if (known === undefined || known < nextDepth) {
                if (known === undefined) {
                    queue.push(target);
                }
                depth.set(target, nextDepth);
            }
        }
    }
    for (const id of plan.order) {
        if (!depth.has(id)) {
            depth.set(id, knownMaxDepth(depth, 0));
        }
        const level = depth.get(id) || 0;
        if (!layers[level]) {
            layers[level] = [];
        }
        layers[level].push(id);
    }

    const positions: Record<string, { x: number; y: number }> = {};
    layers.forEach((ids, level) => {
        ids.forEach((id, index) => {
            positions[id] = {
                x: originX + level * columnGap,
                y: originY + index * rowGap
            };
        });
    });
    return positions;
}

function knownMaxDepth(depth: Map<string, number>, fallback: number): number {
    let max = fallback;
    depth.forEach(value => {
        max = Math.max(max, value);
    });
    return max + 1;
}

/**
 * Normalize a connection list so the editor never shows duplicate or
 * self-referencing edges.
 */
export function normalizeConnections(connections: NodeConnection[]): NodeConnection[] {
    const seen = new Set<string>();
    const result: NodeConnection[] = [];
    for (const connection of connections || []) {
        if (!connection || connection.sourceNodeId === connection.targetNodeId) {
            continue;
        }
        const key = [
            connection.sourceNodeId,
            connection.sourcePort,
            connection.targetNodeId,
            connection.targetPort
        ].join('>');
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(connection);
    }
    return result;
}

/** Convenience helper used by tests and hosts that only need adjacency. */
export function outgoingFrom(
    definition: VisualWorkflowDefinition,
    nodeId: string
): NodeConnection[] {
    return outgoingConnections(definition, nodeId);
}
