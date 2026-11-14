import type { AgentToolExecutionReceipt } from '../runtime/AgentEvents';

/** Build the initial running receipt for a tool invocation. */
export function createToolBaseReceipt(
    receiptId: string,
    toolCall: { id: string; name: string },
    executionMode: 'sequential' | 'parallel',
    inputSummary?: string
): AgentToolExecutionReceipt {
    return {
        receiptId,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        executionMode,
        status: 'running',
        inputSummary
    };
}
