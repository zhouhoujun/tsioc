/**
 * Structured fields for the `approval_requested` stream chunk.
 *
 * The console renders the approval panel from these fields (`$ inputSummary`
 * and `Reason: reason`); sending only the composed `content` made both lines
 * repeat the same sentence.
 */
export interface ApprovalRequestedChunkFields {
    reason?: string;
    summary?: string;
    reasonDetail?: { code: string; params?: Record<string, any> };
    hasInput?: boolean;
    inputSummary?: string;
    timeoutMs?: number;
    createdAt?: number;
    expiresAt?: number;
}

export function buildApprovalRequestedChunk(data: any): {
    eventType: string;
    label: string;
    status: 'running';
    content: string;
    toolName: string;
    approvalId: string;
} & ApprovalRequestedChunkFields {
    const request = data?.request || {};
    const toolName = String(request.toolName || '');
    const summary = String(request.summary || '');
    return {
        eventType: 'approval_requested',
        label: 'approval',
        status: 'running',
        content: summary ? `Approval required for ${toolName}: ${summary}` : `Approval required for ${toolName || 'tool'}`,
        toolName,
        approvalId: String(request.id || ''),
        reason: String(request.reason || ''),
        summary,
        reasonDetail: request.reasonDetail,
        hasInput: request.hasInput === true,
        inputSummary: request.inputSummary,
        timeoutMs: Number(request.timeoutMs) || 0,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt
    };
}
