import {
    IVisualWorkflowNode,
    VisualWorkflowDefinition,
    WorkflowConfigField,
    WorkflowInspectorReferenceView,
    WorkflowReferenceSpec
} from './types';
import type { WorkflowDesigner } from './workflow-designer';
import { translateWorkflow } from './i18n';
import type { Translator } from '@tsdi/i18n';
import type { WorkflowLocale, WorkflowNodeRegistry } from './node-registry';

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

/**
 * Picker options for node references. Multi-select scope fields also accept a
 * node type so one catch/complete/status node can match a whole family.
 */
export function nodeReferenceOptions(
    nodes: IVisualWorkflowNode[],
    registry: WorkflowNodeRegistry,
    locale: any,
    translator: any,
    includeTypes: boolean
): WorkflowReferenceOption[] {
    const options = nodes.map(node => ({
        label: node.name || node.id,
        value: node.id,
        description: registry.nodeLabel(node.type, locale, translator)
    }));
    if (includeTypes) {
        new Set(nodes.map(node => node.type)).forEach(type => options.push({
            label: `${type} (type)`,
            value: type,
            description: registry.nodeLabel(type, locale, translator)
        }));
    }
    return options;
}

/** Control a loop/subprocess `workflow` value needs, derived from its text. */
export function workflowSourceMode(
    nodeType: string,
    values: Record<string, any>
): 'stored' | 'context' | 'inline' | undefined {
    if (nodeType !== 'subprocess' && nodeType !== 'loop') {
        return undefined;
    }
    const mode = String(values.workflowMode || '');
    if (mode === 'stored' || mode === 'context' || mode === 'inline') {
        return mode;
    }
    // Documents written before `workflowMode` kept one value; infer its shape.
    const text = typeof values.workflow === 'string' ? values.workflow.trim() : '';
    if (/^[\[{]/.test(text)) {
        return 'inline';
    }
    return /^[A-Za-z_$][\w$]*\./.test(text) ? 'context' : 'stored';
}

/**
 * Signature of the config nodes a reference field can pick.
 *
 * Inspectors cache their property model, so a rename or URL change on a broker
 * must invalidate that cache even though the selected node itself did not
 * change. Returns an empty string when the node has no reference fields, which
 * keeps the cache key stable for every other node type.
 */
export function configNodesSignature(
    definition: VisualWorkflowDefinition | undefined,
    registry: WorkflowNodeRegistry,
    nodeType: string,
    workflows: Array<{ id: string; name?: string }> = []
): string {
    const fields = registry.get(nodeType)?.fields || [];
    const isSubflow = nodeType === 'subprocess' || nodeType === 'loop';
    if (!fields.some(field => field.reference) && !isSubflow) {
        return '';
    }
    const nodes = (definition?.nodes || [])
        .filter(node => isConfigNode(registry, node.type))
        .map(node => `${node.id}:${node.name || ''}:${JSON.stringify(node.config || {})}`)
        .join('|');
    const library = isSubflow ? workflows.map(item => `${item.id}:${item.name || ''}`).join('|') : '';
    return `${nodes}||${library}`;
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

/**
 * Resolve a declared reference field into picker options plus create/edit
 * actions. The stored value is never rewritten here; the picker only changes
 * how it is chosen.
 */
export function buildReferenceView(
    designer: WorkflowDesigner,
    registry: WorkflowNodeRegistry,
    field: WorkflowConfigField,
    value: any,
    locale: WorkflowLocale,
    translator?: Translator
): WorkflowInspectorReferenceView | undefined {
    const spec = field.reference;
    if (!spec) {
        return undefined;
    }
    const definition = designer.definition;
    let options: Array<{ label: string; value: string; description?: string }> = [];
    if (spec.kind === 'config-node') {
        options = configNodeOptions(definition, registry, spec.resource || '');
    } else if (spec.kind === 'node') {
        const candidates = (definition?.nodes || [])
            .filter(node => node.id !== designer.selectedNode?.id && !isConfigNode(registry, node.type));
        options = nodeReferenceOptions(candidates, registry, locale, translator, spec.multiple === true);
    } else if (spec.kind === 'workflow') {
        // Stored workflows live in the host store, not in this document; a
        // workflow cannot execute itself.
        options = (designer.workflowLibrary?.options || [])
            .filter(item => item.id !== definition?.id)
            .map(item => ({
            label: item.name || item.id,
            value: item.id,
            description: item.updatedAt
        }));
    } else if (spec.kind === 'link') {
        const names = new Set<string>();
        (definition?.nodes || []).forEach(node => {
            if (node.type !== 'link') {
                return;
            }
            String(node.config?.links || '').split(',').forEach(name => {
                const trimmed = name.trim();
                if (trimmed) {
                    names.add(trimmed);
                }
            });
        });
        options = Array.from(names).map(name => ({ label: name, value: name }));
    }

    const ids = referenceIds(value);
    if (!field.required) {
        options = [
            {
                label: translateWorkflow(translator, locale, 'workflow.ui.none', '— none —'),
                value: ''
            },
            ...options
        ];
    }
    const known = new Set(options.map(option => option.value));
    const missingIds = ids.filter(id => !known.has(id));
    if (missingIds.length) {
        // Keep the stored id visible instead of rendering an empty select.
        options = [
            ...missingIds.map(id => ({
                label: `${id} (${translateWorkflow(translator, locale, 'workflow.ui.referenceMissing', 'missing')})`,
                value: id,
                description: translateWorkflow(
                    translator,
                    locale,
                    'workflow.ui.referenceMissingHint',
                    'The referenced record no longer exists.'
                )
            })),
            ...options
        ];
    }

    const actions: Array<{ id: string; label: string; title?: string }> = [];
    if (spec.create) {
        actions.push({
            id: 'create',
            label: '＋',
            title: translateWorkflow(translator, locale, 'workflow.ui.newReference', 'New')
        });
    }
    if (spec.edit && ids.length && missingIds.length < ids.length) {
        actions.push({
            id: 'edit',
            label: '✎',
            title: translateWorkflow(translator, locale, 'workflow.ui.editReference', 'Edit')
        });
    }

    return {
        kind: spec.kind,
        resource: spec.resource,
        multiple: spec.multiple === true,
        missing: missingIds.length > 0,
        options,
        label: spec.kind === 'config-node'
            ? ids.map(id => referenceLabel(definition, registry, id)).join(', ')
            : spec.kind === 'workflow'
                ? ids.map(id => designer.workflowLibrary?.options.find(item => item.id === id)?.name || id).join(', ')
                : ids.join(', '),
        actions
    };
}

export function fieldResetValue(field: { type: string; defaultValue?: any }): any {
    const value = field.defaultValue;
    if (field.type === 'json') {
        return value ?? {};
    }
    if (field.type === 'boolean') {
        return value === true;
    }
    return value === undefined || value === null ? '' : String(value);
}
