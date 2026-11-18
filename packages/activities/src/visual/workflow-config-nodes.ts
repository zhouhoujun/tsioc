import {
    IVisualWorkflowNode,
    VisualWorkflowDefinition,
    WorkflowReferenceSpec
} from './types';
import type { WorkflowNodeRegistry } from './node-registry';

/**
 * Configuration-node helpers.
 *
 * Config nodes (`mqtt`, `tls`, plugin-provided resources) stay inside
 * `definition.nodes` so documents and version snapshots remain unchanged. This
 * module derives the editor-facing collections (pickers, usage counts, unused
 * entries) from the same document, which keeps the reactive contract intact:
 * replacing `definition.nodes` is enough to refresh every derived list.
 */

export interface WorkflowConfigNodeInfo {
    id: string;
    type: string;
    name: string;
    resource: string;
    /** One-line value summary (`mqtt://broker:1883`, server name, ...). */
    summary: string;
    /** Ids of nodes that reference this config node. */
    usedBy: string[];
    used: boolean;
}

export interface WorkflowReferenceOption {
    label: string;
    value: string;
    description?: string;
}

/** Fields on `node` that declare a reference of the given kind. */
export function referenceFields(
    registry: WorkflowNodeRegistry,
    node: IVisualWorkflowNode,
    spec?: Partial<WorkflowReferenceSpec>
): Array<{ key: string; reference: WorkflowReferenceSpec }> {
    const definition = registry.get(node.type);
    return (definition?.fields || [])
        .filter(field => field.reference && matchesSpec(field.reference, spec))
        .map(field => ({ key: field.key, reference: field.reference as WorkflowReferenceSpec }));
}

function matchesSpec(reference: WorkflowReferenceSpec, spec?: Partial<WorkflowReferenceSpec>): boolean {
    if (!spec) {
        return true;
    }
    if (spec.kind && reference.kind !== spec.kind) {
        return false;
    }
    if (spec.resource && reference.resource !== spec.resource) {
        return false;
    }
    return true;
}

/** Stored reference ids for one field (comma separated values are split). */
export function referenceIds(value: any): string[] {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    return String(value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

export function isConfigNode(registry: WorkflowNodeRegistry, type: string): boolean {
    return registry.get(type)?.configNode === true;
}

/** Registered config-node type that provides `resource` (first match wins). */
export function configNodeTypeForResource(
    registry: WorkflowNodeRegistry,
    resource: string
): string | undefined {
    if (!resource) {
        return undefined;
    }
    return registry
        .list()
        .map(definition => definition.type)
        .find(type => {
            const definition = registry.get(type);
            return definition?.configNode === true && (definition.resource || '') === resource;
        });
}

/** All config nodes of a document, optionally filtered by resource. */
export function listConfigNodes(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry,
    resource?: string
): IVisualWorkflowNode[] {
    return (definition?.nodes || []).filter(node => {
        if (!isConfigNode(registry, node.type)) {
            return false;
        }
        if (!resource) {
            return true;
        }
        return (registry.get(node.type)?.resource || '') === resource;
    });
}

/** Short human summary of a config node's primary value. */
export function configNodeSummary(node: IVisualWorkflowNode, registry: WorkflowNodeRegistry): string {
    const config = node.config || {};
    const resource = registry.get(node.type)?.resource || '';
    if (resource === 'mqtt-broker') {
        return String(config.url || '');
    }
    if (resource === 'tls') {
        return String(config.servername || config.ca || config.cert || '');
    }
    const first = Object.values(config).find(value => typeof value === 'string' && value);
    return typeof first === 'string' ? first : '';
}

/** Node ids that reference `configNodeId` through any declared reference field. */
export function referencesTo(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry,
    configNodeId: string
): string[] {
    if (!configNodeId) {
        return [];
    }
    const result: string[] = [];
    for (const node of definition?.nodes || []) {
        if (node.id === configNodeId) {
            continue;
        }
        for (const field of referenceFields(registry, node)) {
            if (referenceIds(node.config?.[field.key]).includes(configNodeId)) {
                result.push(node.id);
                break;
            }
        }
    }
    return result;
}

/** Config nodes with their usage counts, in document order. */
export function configNodeInfos(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry
): WorkflowConfigNodeInfo[] {
    return listConfigNodes(definition, registry).map(node => {
        const usedBy = referencesTo(definition, registry, node.id);
        return {
            id: node.id,
            type: node.type,
            name: node.name || node.id,
            resource: registry.get(node.type)?.resource || '',
            summary: configNodeSummary(node, registry),
            usedBy,
            used: usedBy.length > 0
        };
    });
}

/** Config nodes nothing points at; safe to offer for cleanup (never automatic). */
export function unusedConfigNodes(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry
): WorkflowConfigNodeInfo[] {
    return configNodeInfos(definition, registry).filter(info => !info.used);
}

/** `mqtt_1`, `mqtt_2`, ... unique inside the document. */
export function nextConfigNodeId(
    definition: VisualWorkflowDefinition | undefined,
    type: string
): string {
    const used = new Set((definition?.nodes || []).map(node => node.id));
    let index = 1;
    while (used.has(`${type}_${index}`)) {
        index += 1;
    }
    return `${type}_${index}`;
}

/** Picker options for a config-node reference. */
export function configNodeOptions(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry,
    resource: string
): WorkflowReferenceOption[] {
    return listConfigNodes(definition, registry, resource).map(node => ({
        label: node.name || node.id,
        value: node.id,
        description: configNodeSummary(node, registry)
    }));
}

/** Label for a stored id; falls back to the raw id when it no longer resolves. */
export function referenceLabel(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry,
    id: string
): string {
    const node = (definition?.nodes || []).find(item => item.id === id);
    return node ? (node.name || node.id) : id;
}
