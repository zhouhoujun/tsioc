import { token, Type } from '@tsdi/ioc';
import type { IVisualWorkflowNode } from './types';

/** Context handed to a node editor section component. */
export interface WorkflowNodeEditorContext {
    node: IVisualWorkflowNode;
    /** Current inspector field values (defaults already applied). */
    values: Record<string, any>;
    locale: string;
    /** Merge a patch into the node config (immediately applied). */
    setConfig(patch: Record<string, any>): void;
}

export interface WorkflowNodeEditorSection {
    id: string;
    /** Localized label key; falls back to `label`. */
    labelKey?: string;
    label?: string;
    component: Type<any>;
    order?: number;
    /** Only render when the node/values match (for example a mode switch). */
    visible?(context: WorkflowNodeEditorContext): boolean;
    /** Extra/overridden inputs for the section component. */
    inputs?(context: WorkflowNodeEditorContext): Record<string, any>;
}

/**
 * Node-type contribution rendered below the shared dynamic form.
 *
 * Hosts register sections by type instead of modifying the inspector, so a
 * plugin node can add a custom panel while the built-in fields keep using the
 * schema-driven form.
 */
export interface WorkflowNodeEditorContribution {
    type: string | string[];
    sections: WorkflowNodeEditorSection[];
}

/** Host-registered node editor sections (schema widgets still own simple fields). */
export const WORKFLOW_NODE_EDITORS = token<WorkflowNodeEditorContribution[]>('WORKFLOW_NODE_EDITORS');

export function nodeEditorSections(
    contributions: WorkflowNodeEditorContribution[] | undefined,
    node: IVisualWorkflowNode | undefined,
    context: WorkflowNodeEditorContext
): WorkflowNodeEditorSection[] {
    if (!node || !contributions?.length) {
        return [];
    }
    const sections: WorkflowNodeEditorSection[] = [];
    contributions.forEach(contribution => {
        const types = Array.isArray(contribution?.type) ? contribution.type : [contribution?.type];
        if (!types.includes(node.type)) {
            return;
        }
        (contribution.sections || []).forEach(section => {
            if (!section || (section.visible && !section.visible(context))) {
                return;
            }
            sections.push(section);
        });
    });
    return sections.sort((left, right) => (left.order || 0) - (right.order || 0));
}
