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

export function requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new AppRpcError(-32602, `Invalid params: ${field} must be a non-empty string`);
    }
    return value.trim();
}

export function requireSessionId(params: any): string {
    return requireString(params?.sessionId, 'sessionId');
}

export function optionalSessionId(params: any): string | undefined {
    return typeof params?.sessionId === 'string' && params.sessionId.trim() ? params.sessionId.trim() : undefined;
}

export function requireTurnInput(value: unknown, message: AgentTurnMessageInput | undefined, field: string): string {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    if (message?.parts?.length) {
        return typeof value === 'string' ? value.trim() : '';
    }
    throw new AppRpcError(-32602, `Invalid params: ${field} must be a non-empty string`);
}
