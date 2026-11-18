import { WorkflowDesigner } from './workflow-designer';
import { workflowNodeFrame } from './workflow-view-models';

/**
 * Select a node and centre it in the visible canvas.
 *
 * Shared by the find palette and the configuration-node list: both need the
 * same "bring this node into view" behaviour, and the viewport math must stay
 * out of the (size-capped) designer preview.
 */
export function revealWorkflowNode(
    designer: WorkflowDesigner,
    nodeId: string,
    viewport?: { width: number; height: number }
): void {
    const node = designer.nodes.find(entry => entry.id === nodeId);
    if (!node) {
        return;
    }
    designer.selectNode(node.id);
    if (!viewport) {
        return;
    }
    const frame = workflowNodeFrame(node);
    const zoom = designer.zoom || 1;
    designer.pan = {
        x: Math.round(viewport.width / 2 - (node.position.x + frame.width / 2) * zoom),
        y: Math.round(viewport.height / 2 - (node.position.y + frame.height / 2) * zoom)
    };
}
