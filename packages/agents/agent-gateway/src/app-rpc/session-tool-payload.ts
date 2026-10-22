import { SessionStore } from '@tsdi/agent';

/** Minimal server seam the payload read needs (kept small for the RPC table). */
export interface SessionToolPayloadHost {
    requireSessionId(params: any): string;
    ensureSessionAccess(sessionId: string, context: any): Promise<void>;
}

/**
 * Read one tool call's raw payload on demand.
 *
 * The console drops `role='tool'` messages from the transcript (they carry raw
 * JSON blobs), so the event inspector fetches the payload for the selected
 * toolCallId instead of replaying it at startup.
 */
export async function readSessionToolPayload(
    sessions: SessionStore,
    host: SessionToolPayloadHost,
    params: any,
    context: any
): Promise<{ toolCallId: string; text: string }> {
    const sessionId = host.requireSessionId(params);
    const toolCallId = String(params?.toolCallId || '').trim();
    await host.ensureSessionAccess(sessionId, context);
    const text = toolCallId ? await sessions.getToolPayload(sessionId, toolCallId) : undefined;
    return { toolCallId, text: text || '' };
}
