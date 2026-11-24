import type { WorkflowConfigField } from './types';

/**
 * Shared subflow/loop source fields.
 *
 * Stored workflows keep their id in the legacy `workflow` value, so the mode
 * select only chooses which control edits it: a stored-workflow picker, a
 * context path, or an inline definition. Documents without `workflowMode` are
 * inferred from the value's shape by the inspector.
 */
export function workflowSourceFields(): WorkflowConfigField[] {
    return [{
        key: 'workflowMode',
        label: 'Workflow source',
        type: 'select',
        defaultValue: 'stored',
        options: [
            { label: 'Stored workflow', value: 'stored' },
            { label: 'Context value', value: 'context' },
            { label: 'Inline definition', value: 'inline' }
        ],
        description: 'Pick a saved workflow, read an id or definition from context, or paste a definition.'
    }];
}
