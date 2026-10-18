import { AgentToolDefinition } from '../tools/AgentTool';

/** Tools that may run inside one parallel batch. */
export function isParallelSafeTool(definition: AgentToolDefinition, fallbackSafe: boolean): boolean {
    if (definition.execution?.requiresSequential) {
        return false;
    }
    if (definition.execution?.readOnly === true) {
        return true;
    }
    return fallbackSafe;
}

export interface ParallelDispatchDeps {
    /** True when the call needs explicit approval (then the batch stays ordered). */
    requiresApproval?: (toolName: string, input?: any) => boolean;
    getDefinition: (toolName: string) => AgentToolDefinition | undefined;
}

/** Tool names for a streaming progress line. */
export function describeToolCallNames(toolCalls: Array<{ name?: string }>): string {
    return toolCalls.map(toolCall => toolCall.name).filter(Boolean).join(', ');
}

/** Whether a whole tool batch can run concurrently. */
export function canParallelizeToolBatch(
    toolCalls: Array<{ name: string; input?: any }>,
    safeTools: string[],
    deps: ParallelDispatchDeps
): boolean {
    const requiresApproval = deps.requiresApproval;
    if (requiresApproval && toolCalls.some(tc => requiresApproval(tc.name, tc.input))) {
        return false;
    }
    return toolCalls.every(tc => {
        const definition = deps.getDefinition(tc.name);
        const fallbackSafe = safeTools.includes(tc.name);
        return definition ? isParallelSafeTool(definition, fallbackSafe) : fallbackSafe;
    });
}
