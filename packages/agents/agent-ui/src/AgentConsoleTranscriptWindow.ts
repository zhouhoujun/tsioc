/** Transcript state that decides whether the tail window can hide older rows. */
export interface AgentConsoleTranscriptWindowState {
    messageLayout: string;
    transcriptFollowing: boolean;
    messagesFocused: boolean;
    messageDetailOpen: boolean;
}

/**
 * Whether viewport mode may render only the newest `limit` messages.
 *
 * Windowing is disabled when it could hide something the user depends on:
 * history scrolling (not following), message focus/selection, the detail view,
 * native scrollback, or an older error/failed/cancelled root cause.
 */
export function shouldWindowAgentConsoleTranscript(
    messages: readonly { metadata?: Record<string, any> }[],
    state: AgentConsoleTranscriptWindowState,
    limit: number
): boolean {
    if (limit <= 0 || messages.length <= limit) {
        return false;
    }
    if (state.messageLayout === 'scrollback'
        || !state.transcriptFollowing
        || state.messagesFocused
        || state.messageDetailOpen) {
        return false;
    }
    const hidden = messages.length - limit;
    for (let index = 0; index < hidden; index += 1) {
        const metadata: any = (messages[index] as any)?.metadata || {};
        const status = String(metadata.status || '').toLowerCase();
        if (metadata.error || status === 'failed' || status === 'error' || status === 'cancelled') {
            return false;
        }
    }
    return true;
}
