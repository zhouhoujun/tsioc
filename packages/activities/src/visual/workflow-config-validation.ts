import type { DynamicFormField } from '@tsdi/components/common/dynamic-form';
import { validateDynamicFormValues } from '@tsdi/components/common/dynamic-form';
import { WorkflowConfigField, WorkflowConfigFieldCondition, VisualWorkflowDefinition } from './types';
import type { WorkflowNodeRegistry } from './node-registry';
import { referenceIds } from './workflow-config-nodes';
import { validateWorkflowTypedValue, workflowExpressionMarkers, WORKFLOW_TYPED_CODEC } from './workflow-typed-value';
import { validateWorkflowExpression } from './workflow-expression';

export interface WorkflowConfigIssue {
    nodeId: string;
    nodeName: string;
    fieldKey: string;
    label: string;
    message: string;
    /**
     * Errors block running/publishing; warnings are advisory (an inline secret
     * that could move to the credential store). Defaults to `error`.
     */
    severity?: 'error' | 'warning';
}

export interface WorkflowConfigValidationOptions {
    /**
     * Credential names exposed by the host store. `undefined` skips name
     * checks (host has no store); an empty array means the store exists and is
     * empty, so every reference is missing.
     */
    credentials?: string[];
}

/**
 * Credential references are resolved by the host at run time. Catch malformed
 * or unknown names while editing so publishing does not produce a workflow
 * that only fails on its first execution.
 */
function credentialReference(value: any): { name: string; malformed: boolean } | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const text = value.trim();
    if (!text.includes('credential:')) {
        return undefined;
    }
    const braced = /^\{\{\s*credential:([^}]*)\}\}$/.exec(text);
    if (braced) {
        const name = braced[1].trim();
        return { name, malformed: !name };
    }
    const plain = /^credential:([A-Za-z0-9_.-]+)$/.exec(text);
    if (plain) {
        return { name: plain[1], malformed: false };
    }
    // Mentions the prefix in another shape (`{{credential: }}`, `{{ credential:x}`).
    return { name: '', malformed: true };
}

function credentialIssues(
    value: any,
    known: string[] | undefined
): string | undefined {
    const reference = credentialReference(value);
    if (!reference) {
        return undefined;
    }
    if (reference.malformed || !reference.name) {
        return 'Credential reference needs a name: use {{credential:name}}.';
    }
    if (known && !known.includes(reference.name)) {
        return `Credential not found: ${reference.name}. Store it under Credentials or use another name.`;
    }
    return undefined;
}

function conditionMatches(actual: any, condition: WorkflowConfigFieldCondition): boolean {
    if (condition.equals !== undefined) {
        return String(actual) === String(condition.equals);
    }
    if (condition.notEquals !== undefined) {
        return String(actual) !== String(condition.notEquals);
    }
    if (condition.in) {
        return condition.in.map(item => String(item)).includes(String(actual));
    }
    if (condition.truthy !== undefined) {
        return condition.truthy ? !!actual : !actual;
    }
    if (condition.falsy !== undefined) {
        return condition.falsy ? !actual : !!actual;
    }
    return true;
}

function toFormField(field: WorkflowConfigField): DynamicFormField {
    // `boolean` is the node-level alias for the shared checkbox control.
    return {
        ...field,
        type: (field.type === 'boolean' ? 'checkbox' : field.type) as DynamicFormField['type'],
        typedCodec: field.typed === true && field.typedValue === true ? WORKFLOW_TYPED_CODEC : undefined,
        itemFields: field.itemFields?.map(toFormField)
    } as DynamicFormField;
}

/**
 * Secrets typed into a field live in the workflow document (and every version
 * of it). Publish reports that as an advisory warning so users can switch to a
 * credential reference; it never blocks the operation.
 */
function inlineSecretWarning(field: { secret?: boolean }, value: any): string | undefined {
    if (field.secret !== true || credentialReference(value)) {
        return undefined;
    }
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
        return undefined;
    }
    return 'Secret is stored in the workflow document; use {{credential:name}} to keep it in the host credential store.';
}

/**
 * Validate node configuration against the field metadata supplied by each node
 * definition. This is the same schema the inspector renders, so required
 * fields, ranges, lengths, patterns and rules are enforced before a workflow
 * is saved or run, not only while the user edits a field.
 */
export function validateWorkflowConfigs(
    definition: VisualWorkflowDefinition,
    registry: WorkflowNodeRegistry,
    options: WorkflowConfigValidationOptions = {}
): WorkflowConfigIssue[] {
    const issues: WorkflowConfigIssue[] = [];
    for (const node of definition?.nodes || []) {
        const nodeDefinition = registry.get(node.type);
        if (!nodeDefinition?.fields?.length) {
            continue;
        }
        const config = node.config || {};
        const values: Record<string, any> = {};
        for (const field of nodeDefinition.fields) {
            values[field.key] = config[field.key] !== undefined
                ? config[field.key]
                : field.defaultValue;
        }
        const fields = nodeDefinition.fields
            .filter(field => !field.visibleWhen || conditionMatches(values[field.visibleWhen.key], field.visibleWhen))
            .map(toFormField);
        const result = validateDynamicFormValues(fields, values);
        for (const issue of result.issues) {
            issues.push({
                nodeId: node.id,
                nodeName: node.name || node.id,
                fieldKey: issue.key,
                label: fields.find(field => field.key === issue.key)?.label || issue.key,
                message: issue.message
            });
        }
        for (const field of fields) {
            if (!field.itemFields?.length) {
                continue;
            }
            const items = Array.isArray(values[field.key]) ? values[field.key] : [];
            if (field.required && !items.length) {
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: field.key,
                    label: field.label || field.key,
                    message: 'Required'
                });
                continue;
            }
            (items as any[]).forEach((item: any, index: number) => {
                const visible = field.itemFields!.filter(child =>
                    !child.visibleWhen || conditionMatches(item?.[child.visibleWhen.key], child.visibleWhen)
                );
                const nested = validateDynamicFormValues(visible, item || {});
                for (const issue of nested.issues) {
                    const childLabel = visible.find(child => child.key === issue.key)?.label || issue.key;
                    issues.push({
                        nodeId: node.id,
                        nodeName: node.name || node.id,
                        fieldKey: `${field.key}[${index}].${issue.key}`,
                        label: `${field.label || field.key} ${index + 1} · ${childLabel}`,
                        message: issue.message
                    });
                }
                for (const child of visible) {
                    const definitionChild = (nodeDefinition.fields || [])
                        .find(item => item.key === field.key)
                        ?.itemFields
                        ?.find(item => item.key === child.key);
                    if (typeof definitionChild?.validate !== 'function') {
                        continue;
                    }
                    const childMessage = definitionChild.validate(item?.[child.key], {
                        value: item?.[child.key],
                        values: item || {},
                        field: definitionChild
                    });
                    if (!childMessage) {
                        continue;
                    }
                    issues.push({
                        nodeId: node.id,
                        nodeName: node.name || node.id,
                        fieldKey: `${field.key}[${index}].${child.key}`,
                        label: `${field.label || field.key} ${index + 1} · ${child.label || child.key}`,
                        message: childMessage
                    });
                }
            });
        }
        // Field-level cross-field hooks run after the declarative rules so a
        // field can depend on the rest of the node configuration.
        const visibleKeys = new Set(fields.map(field => field.key));
        for (const field of nodeDefinition.fields) {
            if (!visibleKeys.has(field.key) || typeof field.validate !== 'function') {
                continue;
            }
            const message = field.validate(values[field.key], {
                value: values[field.key],
                values,
                field
            });
            if (message) {
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: field.key,
                    label: fields.find(item => item.key === field.key)?.label || field.key,
                    message
                });
            }
        }
        // `{{expr: ...}}` markers in string fields (URL/body) are validated like
        // typed expressions once the evaluator is loaded.
        const expressionIssue = (value: any): string | undefined => {
            for (const expression of workflowExpressionMarkers(value)) {
                const error = validateWorkflowExpression(expression);
                if (error) {
                    return `Expression error: ${error}`;
                }
            }
            return undefined;
        };
        for (const field of fields) {
            const message = expressionIssue(values[field.key]);
            if (message) {
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: field.key,
                    label: field.label || field.key,
                    message
                });
            }
            if (!field.itemFields?.length) {
                continue;
            }
            const items = Array.isArray(values[field.key]) ? values[field.key] : [];
            items.forEach((item: any, index: number) => {
                for (const child of field.itemFields!) {
                    const childMessage = expressionIssue(item?.[child.key]);
                    if (!childMessage) {
                        continue;
                    }
                    issues.push({
                        nodeId: node.id,
                        nodeName: node.name || node.id,
                        fieldKey: `${field.key}[${index}].${child.key}`,
                        label: `${field.label || field.key} ${index + 1} · ${child.label || child.key}`,
                        message: childMessage
                    });
                }
            });
        }
        // Credential references resolve at run time; catch malformed or unknown
        // names before the workflow is published.
        for (const field of fields) {
            const message = credentialIssues(values[field.key], options.credentials);
            if (message) {
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: field.key,
                    label: field.label || field.key,
                    message
                });
            }
            if (!field.itemFields?.length) {
                continue;
            }
            const items = Array.isArray(values[field.key]) ? values[field.key] : [];
            items.forEach((item: any, index: number) => {
                for (const child of field.itemFields!) {
                    const childMessage = credentialIssues(item?.[child.key], options.credentials);
                    if (!childMessage) {
                        continue;
                    }
                    issues.push({
                        nodeId: node.id,
                        nodeName: node.name || node.id,
                        fieldKey: `${field.key}[${index}].${child.key}`,
                        label: `${field.label || field.key} ${index + 1} · ${child.label || child.key}`,
                        message: childMessage
                    });
                }
            });
        }
        // Inline secrets are advisory: the value works, but it travels with the
        // document. Warnings never block running or publishing.
        for (const field of nodeDefinition.fields) {
            if (!visibleKeys.has(field.key)) {
                continue;
            }
            const message = inlineSecretWarning(field, values[field.key]);
            if (!message) {
                continue;
            }
            issues.push({
                nodeId: node.id,
                nodeName: node.name || node.id,
                fieldKey: field.key,
                label: field.label || field.key,
                message,
                severity: 'warning'
            });
        }
        // Typed value fields store literal classes explicitly; report text that
        // cannot be read as its declared class before the workflow runs.
        for (const field of fields) {
            const message = validateWorkflowTypedValue(values[field.key]);
            if (message) {
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: field.key,
                    label: field.label || field.key,
                    message
                });
            }
            if (!field.itemFields?.length) {
                continue;
            }
            const items = Array.isArray(values[field.key]) ? values[field.key] : [];
            items.forEach((item: any, index: number) => {
                for (const child of field.itemFields!) {
                    const childMessage = validateWorkflowTypedValue(item?.[child.key]);
                    if (!childMessage) {
                        continue;
                    }
                    issues.push({
                        nodeId: node.id,
                        nodeName: node.name || node.id,
                        fieldKey: `${field.key}[${index}].${child.key}`,
                        label: `${field.label || field.key} ${index + 1} · ${child.label || child.key}`,
                        message: childMessage
                    });
                }
            });
        }
        // Reference fields store plain ids. Report ids that no longer resolve
        // so a stale broker/TLS pick is visible while editing, not at run time.
        for (const field of nodeDefinition.fields) {
            const spec = field.reference;
            if (!spec) {
                continue;
            }
            const ids = referenceIds(config[field.key]);
            if (!ids.length) {
                continue;
            }
            const missing = ids.filter(id => !resolveReference(id, spec, definition, registry));
            if (!missing.length) {
                continue;
            }
            issues.push({
                nodeId: node.id,
                nodeName: node.name || node.id,
                fieldKey: field.key,
                label: field.label || field.key,
                message: `Reference not found: ${missing.join(', ')}. Pick an existing ${referenceNoun(spec)} or create one.`
            });
        }
        // Structural rules that span rows/fields report through the node hook.
        if (typeof nodeDefinition.validateConfig === 'function') {
            const results = nodeDefinition.validateConfig(config) || [];
            for (const result of results) {
                const normalized = typeof result === 'string' ? { message: result } : result;
                if (!normalized?.message) {
                    continue;
                }
                issues.push({
                    nodeId: node.id,
                    nodeName: node.name || node.id,
                    fieldKey: normalized.fieldKey || 'config',
                    label: normalized.label
                        || (normalized.fieldKey
                            ? fields.find(field => field.key === normalized.fieldKey)?.label || normalized.fieldKey
                            : nodeDefinition.label),
                    message: normalized.message
                });
            }
        }
    }
    return issues;
}

/** A stored id resolves when a matching record exists in the document. */
function resolveReference(
    id: string,
    spec: NonNullable<WorkflowConfigField['reference']>,
    definition: VisualWorkflowDefinition,
    registry: WorkflowNodeRegistry
): boolean {
    const nodes = definition?.nodes || [];
    if (spec.kind === 'config-node') {
        const node = nodes.find(item => item.id === id);
        if (!node) {
            return false;
        }
        const target = registry.get(node.type);
        return target?.configNode === true
            && (!spec.resource || (target.resource || '') === spec.resource);
    }
    if (spec.kind === 'node') {
        // Scope fields may name a node id or a node type.
        return nodes.some(item => item.id === id) || nodes.some(item => item.type === id);
    }
    if (spec.kind === 'link') {
        return nodes.some(item => item.type === 'link'
            && String(item.config?.links || '').split(',').map(name => name.trim()).includes(id));
    }
    // Workflow and credential references are resolved by the host store.
    return true;
}

function referenceNoun(spec: NonNullable<WorkflowConfigField['reference']>): string {
    if (spec.kind === 'config-node') {
        return spec.resource === 'tls' ? 'TLS config' : 'configuration node';
    }
    if (spec.kind === 'workflow') {
        return 'workflow';
    }
    if (spec.kind === 'link') {
        return 'link';
    }
    if (spec.kind === 'credential') {
        return 'credential';
    }
    return 'node';
}
