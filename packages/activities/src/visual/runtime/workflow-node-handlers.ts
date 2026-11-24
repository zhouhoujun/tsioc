import type { ActivityContext, ActivityResult } from '../../activities/Activity';
import type { IVisualWorkflowNode } from '../types';
import type { VisualNodeExecutionExtras, VisualNodeRuntimeHost } from '../workflow-runtime';

/** Everything a node handler needs; mirrors the built-in execution seam. */
export interface WorkflowNodeHandlerInput {
    node: IVisualWorkflowNode;
    context: ActivityContext;
    host?: VisualNodeRuntimeHost;
    extras?: VisualNodeExecutionExtras;
}

/**
 * Executes one built-in node type. Handlers are registered by type so node
 * families live in their own modules instead of one growing switch, and hosts
 * or plugins can replace/extend a type without touching the runtime.
 */
export type WorkflowNodeHandler = (
    input: WorkflowNodeHandlerInput
) => Promise<ActivityResult> | ActivityResult;

const handlers = new Map<string, WorkflowNodeHandler>();

/** Register (or replace) the handler for a node type. */
export function registerWorkflowNodeHandler(type: string, handler: WorkflowNodeHandler): void {
    handlers.set(type, handler);
}

/** Register several handlers at once (module initialisation helper). */
export function registerWorkflowNodeHandlers(map: Record<string, WorkflowNodeHandler>): void {
    Object.keys(map).forEach(type => registerWorkflowNodeHandler(type, map[type]));
}

export function getWorkflowNodeHandler(type: string): WorkflowNodeHandler | undefined {
    return handlers.get(type);
}

export function listWorkflowNodeHandlerTypes(): string[] {
    return Array.from(handlers.keys()).sort();
}
