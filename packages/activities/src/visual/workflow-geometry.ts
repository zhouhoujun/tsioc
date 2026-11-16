import { IVisualWorkflowNode } from './types';

/** Default node dimensions shared by layout, canvas and alignment helpers. */
export const WORKFLOW_NODE_WIDTH = 184;
export const WORKFLOW_NODE_HEADER_HEIGHT = 34;
export const WORKFLOW_PORT_SPACING = 20;
export const WORKFLOW_PORT_START = 48;

/** Effective frame used by the canvas, layout and alignment operations. */
export function workflowNodeFrame(node: IVisualWorkflowNode): { width: number; height: number } {
    const width = node.dimension?.width || WORKFLOW_NODE_WIDTH;
    const portCount = Math.max(node.inputs?.length || 0, node.outputs?.length || 0, 1);
    const height = Math.max(
        node.dimension?.height || 64,
        WORKFLOW_PORT_START + portCount * WORKFLOW_PORT_SPACING + 10
    );
    return { width, height };
}
