import type { WorkflowDesigner } from './workflow-designer';
import type { IVisualWorkflowNode } from './types';

/** Stored workflow id referenced by a `subprocess`/`loop` node, if any. */
export function subflowWorkflowId(node: IVisualWorkflowNode | undefined): string {
    if (!node || (node.type !== 'subprocess' && node.type !== 'loop')) {
        return '';
    }
    const value = node.config?.workflow;
    if (typeof value !== 'string') {
        return '';
    }
    const text = value.trim();
    return /^[A-Za-z0-9_-]+$/.test(text) ? text : '';
}

/** A `subprocess`/`loop` node without a bound workflow yet. */
export function canCreateSubflow(node: IVisualWorkflowNode | undefined): boolean {
    return !!node
        && (node.type === 'subprocess' || node.type === 'loop')
        && !subflowWorkflowId(node);
}

/**
 * Host surface used by the sub-workflow actions. The designer component owns
 * tabs and the parent breadcrumb map; these helpers keep its body small.
 */
export interface WorkflowSubflowHost {
    /** Active designer (switches to the child after a tab is created). */
    designer: WorkflowDesigner;
    /** Create and activate a blank tab; resolves to the new document id. */
    createWorkflowTab(): Promise<string | undefined>;
    /** Open a stored workflow in a tab. */
    openWorkflowTab(id: string): Promise<boolean>;
    /** Record the parent breadcrumb for a child document. */
    registerSubflowParent(childId: string, parentId: string, name: string): void;
}

/** Open the workflow a node references and remember the parent breadcrumb. */
export async function openReferencedWorkflowTab(
    host: WorkflowSubflowHost,
    id: string
): Promise<'opened' | 'missing'> {
    const parent = host.designer;
    const parentId = parent?.definition?.id;
    const parentName = parent?.definition?.name || parentId;
    const opened = await host.openWorkflowTab(id);
    if (!opened) {
        return 'missing';
    }
    if (parentId && parentId !== id) {
        host.registerSubflowParent(id, parentId, parentName);
    }
    return 'opened';
}

/**
 * Create a child document for a `subprocess`/`loop` node and bind the node to
 * it: a blank tab named after the node opens, the parent node's `workflow`
 * config points at the new id, and the breadcrumb knows the parent.
 */
export async function createSubflowForNode(
    host: WorkflowSubflowHost,
    nodeId: string,
    suffix: string
): Promise<string | undefined> {
    const parent = host.designer;
    const node = parent?.nodes.find(item => item.id === nodeId);
    if (!node || (node.type !== 'subprocess' && node.type !== 'loop')) {
        return undefined;
    }
    const parentId = parent.definition.id;
    const parentName = parent.definition.name || parentId;
    const created = await host.createWorkflowTab();
    const child = host.designer;
    if (!created || !child || child === parent) {
        return undefined;
    }
    child.renameWorkflow(`${node.name || node.type} ${suffix}`.trim());
    parent.updateNodeConfig(nodeId, { workflow: created });
    host.registerSubflowParent(created, parentId, parentName);
    return created;
}

/**
 * Inspector field actions for the stored-workflow picker: create a child
 * document bound to the node, or open the referenced workflow in a tab.
 * Returns true when the action belonged to the picker.
 */
export function handleSubflowFieldAction(
    designer: WorkflowDesigner,
    key: string,
    actionId: string,
    nodeId: string | undefined,
    hostAction?: (action: string, payload?: string) => void,
    openWorkflow?: (id: string) => void
): boolean {
    if (key !== 'workflow' || (actionId !== 'create' && actionId !== 'edit')) {
        return false;
    }
    const node = designer?.nodes.find(item => item.id === nodeId);
    if (actionId === 'create') {
        hostAction?.('new-subflow', node?.id || nodeId);
        return true;
    }
    const id = subflowWorkflowId(node);
    if (id) {
        openWorkflow?.(id);
    }
    return true;
}
