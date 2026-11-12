import type { DynamicFormField } from '@tsdi/components/common/dynamic-form';
import { validateDynamicFormValues } from '@tsdi/components/common/dynamic-form';
import { WorkflowConfigField, WorkflowConfigFieldCondition, VisualWorkflowDefinition } from './types';
import type { WorkflowNodeRegistry } from './node-registry';

export interface WorkflowConfigIssue {
    nodeId: string;
    nodeName: string;
    fieldKey: string;
    label: string;
    message: string;
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
        type: (field.type === 'boolean' ? 'checkbox' : field.type) as DynamicFormField['type']
    } as DynamicFormField;
}

/**
 * Validate node configuration against the field metadata supplied by each node
 * definition. This is the same schema the inspector renders, so required
 * fields, ranges, lengths, patterns and rules are enforced before a workflow
 * is saved or run, not only while the user edits a field.
 */
export function validateWorkflowConfigs(
    definition: VisualWorkflowDefinition,
    registry: WorkflowNodeRegistry
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
    }
    return issues;
}
