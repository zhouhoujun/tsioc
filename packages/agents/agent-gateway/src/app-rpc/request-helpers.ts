import { AgentTurnMessageInput, normalizeAgentMessageParts } from '@tsdi/agent';
import { AppRpcError, AppRpcResponse } from '../contracts/AppRpc';

export function parseTurnMessage(value: unknown): AgentTurnMessageInput | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    const input = value as Record<string, any>;
    const content = typeof input.content === 'string' ? input.content : undefined;
    const parts = normalizeAgentMessageParts(input.parts);
    const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? input.metadata as Record<string, any>
        : undefined;
    if (!content && !parts?.length && !metadata) {
        return undefined;
    }
    return { content, parts, metadata };
}

export function createErrorResponse(id: string | number | null | undefined, error: AppRpcError): AppRpcResponse {
    return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
            code: error.code,
            message: error.message,
            data: error.data
        }
    };
}
