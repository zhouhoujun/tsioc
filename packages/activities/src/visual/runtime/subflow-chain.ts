import type { ActivityContext } from '../../activities/Activity';

/**
 * Workflow ids of the current execution stack, carried on the context through a
 * symbol so it never appears in snapshots, expressions or user context output.
 * Symbol properties survive the object spreads used to derive child contexts.
 */
export const WORKFLOW_CHAIN = Symbol('workflow.chain');

/** Deepest allowed sub-workflow nesting (guards non-cyclic runaway chains). */
export const MAX_SUBFLOW_DEPTH = 32;

/** Push the executing definition onto the context's chain (per execution). */
export function enterWorkflow(context: ActivityContext, definitionId: string): void {
    (context as any)[WORKFLOW_CHAIN] = [...workflowChain(context), definitionId];
}

export function workflowChain(context: ActivityContext): string[] {
    const chain = (context as any)?.[WORKFLOW_CHAIN];
    return Array.isArray(chain) ? chain : [];
}

/**
 * Report a cycle/depth problem before executing `definitionId`, or `undefined`
 * when the nested execution may proceed.
 */
export function subflowChainError(context: ActivityContext, definitionId: string): Error | undefined {
    const chain = workflowChain(context);
    if (!definitionId) {
        return undefined;
    }
    if (chain.includes(definitionId)) {
        return new Error(`Sub-workflow cycle detected: ${[...chain, definitionId].join(' → ')}`);
    }
    if (chain.length >= MAX_SUBFLOW_DEPTH) {
        return new Error(`Sub-workflow nesting is too deep (limit ${MAX_SUBFLOW_DEPTH}): ${[...chain, definitionId].join(' → ')}`);
    }
    return undefined;
}
