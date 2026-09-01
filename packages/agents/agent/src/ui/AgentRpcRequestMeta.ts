/** Cross-host correlation metadata for stale-result protection. */
export interface AgentRpcRequestMeta {
    requestId?: string;
    sessionEpoch?: number;
}

export function normalizeAgentRpcRequestMeta(value: unknown): AgentRpcRequestMeta | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const requestId = typeof raw.requestId === 'string' && raw.requestId.trim() ? raw.requestId.trim() : undefined;
    const sessionEpoch = Number.isFinite(raw.sessionEpoch) ? Number(raw.sessionEpoch) : undefined;
    return requestId || sessionEpoch !== undefined ? { requestId, sessionEpoch } : undefined;
}
