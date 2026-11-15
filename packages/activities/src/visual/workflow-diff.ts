import { IVisualWorkflowNode, NodeConnection, VisualWorkflowDefinition } from './types';

export interface WorkflowNodeRef {
    id: string;
    name: string;
    type: string;
}

export interface WorkflowNodeChange extends WorkflowNodeRef {
    /** Top-level properties that differ (`name`, `disabled`, `config.action`, ...). */
    properties: string[];
    moved: boolean;
}

export interface WorkflowDiffResult {
    identical: boolean;
    nameChanged: boolean;
    nodesAdded: WorkflowNodeRef[];
    nodesRemoved: WorkflowNodeRef[];
    nodesChanged: WorkflowNodeChange[];
    connectionsAdded: NodeConnection[];
    connectionsRemoved: NodeConnection[];
}

function ref(node: IVisualWorkflowNode): WorkflowNodeRef {
    return { id: node.id, name: node.name, type: node.type };
}

function connectionKey(connection: NodeConnection): string {
    return `${connection.sourceNodeId}:${connection.sourcePort || 'out'}->${connection.targetNodeId}:${connection.targetPort || 'in'}`;
}

function configKeys(before: IVisualWorkflowNode, after: IVisualWorkflowNode): string[] {
    const keys = new Set([
        ...Object.keys(before.config || {}),
        ...Object.keys(after.config || {})
    ]);
    const changed: string[] = [];
    keys.forEach(key => {
        if (JSON.stringify(before.config?.[key]) !== JSON.stringify(after.config?.[key])) {
            changed.push(`config.${key}`);
        }
    });
    return changed.sort();
}

function changedProperties(before: IVisualWorkflowNode, after: IVisualWorkflowNode): string[] {
    const changed: string[] = [];
    if (before.name !== after.name) {
        changed.push('name');
    }
    if (before.type !== after.type) {
        changed.push('type');
    }
    if ((before.description || '') !== (after.description || '')) {
        changed.push('description');
    }
    if ((before.disabled === true) !== (after.disabled === true)) {
        changed.push('disabled');
    }
    if (JSON.stringify(before.style || {}) !== JSON.stringify(after.style || {})) {
        changed.push('style');
    }
    return [...changed, ...configKeys(before, after)];
}

/**
 * Structural comparison used by the version panel. Positions are reported as a
 * single `moved` flag instead of a property so a re-layout does not drown the
 * meaningful changes.
 */
export function diffWorkflowDefinitions(
    before: VisualWorkflowDefinition,
    after: VisualWorkflowDefinition
): WorkflowDiffResult {
    const beforeNodes = new Map((before.nodes || []).map(node => [node.id, node]));
    const afterNodes = new Map((after.nodes || []).map(node => [node.id, node]));

    const nodesAdded: WorkflowNodeRef[] = [];
    const nodesRemoved: WorkflowNodeRef[] = [];
    const nodesChanged: WorkflowNodeChange[] = [];

    afterNodes.forEach((node, id) => {
        const previous = beforeNodes.get(id);
        if (!previous) {
            nodesAdded.push(ref(node));
            return;
        }
        const properties = changedProperties(previous, node);
        const moved = previous.position?.x !== node.position?.x || previous.position?.y !== node.position?.y;
        if (properties.length || moved) {
            nodesChanged.push({ ...ref(node), properties, moved });
        }
    });
    beforeNodes.forEach((node, id) => {
        if (!afterNodes.has(id)) {
            nodesRemoved.push(ref(node));
        }
    });

    const beforeConnections = new Map((before.connections || []).map(item => [connectionKey(item), item]));
    const afterConnections = new Map((after.connections || []).map(item => [connectionKey(item), item]));
    const connectionsAdded: NodeConnection[] = [];
    const connectionsRemoved: NodeConnection[] = [];
    afterConnections.forEach((connection, key) => {
        if (!beforeConnections.has(key)) {
            connectionsAdded.push(connection);
        }
    });
    beforeConnections.forEach((connection, key) => {
        if (!afterConnections.has(key)) {
            connectionsRemoved.push(connection);
        }
    });

    return {
        identical: !nodesAdded.length && !nodesRemoved.length && !nodesChanged.length
            && !connectionsAdded.length && !connectionsRemoved.length
            && before.name === after.name,
        nameChanged: before.name !== after.name,
        nodesAdded,
        nodesRemoved,
        nodesChanged,
        connectionsAdded,
        connectionsRemoved
    };
}

/** One-line-per-fact projection for compact UI rendering. */
export function describeWorkflowDiff(diff: WorkflowDiffResult): Array<{ kind: 'added' | 'removed' | 'changed'; text: string }> {
    const lines: Array<{ kind: 'added' | 'removed' | 'changed'; text: string }> = [];
    diff.nodesAdded.forEach(node => lines.push({ kind: 'added', text: `${node.name} (${node.type})` }));
    diff.nodesRemoved.forEach(node => lines.push({ kind: 'removed', text: `${node.name} (${node.type})` }));
    diff.nodesChanged.forEach(node => {
        const properties = [...node.properties];
        if (node.moved) {
            properties.push('position');
        }
        lines.push({ kind: 'changed', text: `${node.name}: ${properties.join(', ')}` });
    });
    diff.connectionsAdded.forEach(connection => lines.push({
        kind: 'added',
        text: `${connection.sourceNodeId} → ${connection.targetNodeId}`
    }));
    diff.connectionsRemoved.forEach(connection => lines.push({
        kind: 'removed',
        text: `${connection.sourceNodeId} → ${connection.targetNodeId}`
    }));
    return lines;
}
