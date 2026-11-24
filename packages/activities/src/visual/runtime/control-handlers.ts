import { registerWorkflowNodeHandlers } from './workflow-node-handlers';

/**
 * Control/annotation nodes without external dependencies: entry/exit markers,
 * wiring helpers and the guard marker. Their state lives entirely in the DAG
 * plan, so the handlers only report what the node did.
 */
registerWorkflowNodeHandlers({
    start: ({ node }) => ({ success: true, data: { nodeId: node.id, started: true } }),
    end: ({ node }) => ({ success: true, data: { nodeId: node.id, completed: true } }),
    parallel: ({ node }) => ({ success: true, data: { nodeId: node.id, parallel: true } }),
    // Junction/sequence only affect traversal, not the message.
    junction: ({ node }) => ({ success: true, data: { nodeId: node.id } }),
    sequence: ({ node }) => ({ success: true, data: { nodeId: node.id } }),
    comment: ({ node }) => ({ success: true, data: { nodeId: node.id, comment: true } }),
    trycatch: ({ node }) => ({ success: true, data: { nodeId: node.id, guarded: true } })
});
