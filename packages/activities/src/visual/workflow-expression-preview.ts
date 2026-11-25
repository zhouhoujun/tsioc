/** Last-run data used to evaluate an expression draft before saving it. */
export interface WorkflowExpressionPreviewScope {
    scope: Record<string, any>;
    /** How many node results contributed data; 0 means an empty preview scope. */
    samples: number;
}

/**
 * Build a best-effort evaluation scope from the last execution.
 *
 * Node results carry the message data that expressions normally see (`payload`,
 * `msg`, `variables`, `subprocess`); later nodes win, which mirrors the final
 * message of a linear run. Flow/global/env stay empty because they are service
 * state, not part of the snapshot — the preview label makes that explicit.
 */
export function buildWorkflowExpressionPreviewScope(
    designer?: { execution?: { nodeStates?: Record<string, any> } }
): WorkflowExpressionPreviewScope {
    const scope: Record<string, any> = { payload: {}, msg: {}, variables: {}, flow: {}, global: {}, env: {} };
    let samples = 0;
    const states = designer?.execution?.nodeStates || {};
    Object.keys(states).forEach(nodeId => {
        const data = states[nodeId]?.result?.data;
        if (!data || typeof data !== 'object') {
            return;
        }
        samples += 1;
        if (data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)) {
            scope.payload = { ...scope.payload, ...data.payload };
            // Message properties are readable at the expression root.
            Object.assign(scope, data.payload);
        } else if (data.payload !== undefined) {
            scope.payload = data.payload;
        }
        if (data.msg && typeof data.msg === 'object') {
            scope.msg = { ...scope.msg, ...data.msg };
        }
        if (data.variables && typeof data.variables === 'object') {
            scope.variables = { ...scope.variables, ...data.variables };
        }
        if (data.subprocess && typeof data.subprocess === 'object') {
            scope.subprocess = { ...(scope.subprocess || {}), ...data.subprocess };
        }
    });
    return { scope, samples };
}
