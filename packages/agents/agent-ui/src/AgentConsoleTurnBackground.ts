import type { AgentConsoleTurnStreamState } from './AgentConsoleTurnStreamController';
import { appendReasoningText } from './AgentConsoleTurnReasoning';

/** Reset per-turn scratch state (including the owning session/row refs). */
export function clearStreamingMessageState(state: AgentConsoleTurnStreamState): void {
    // Cancel a coalesced flush that has not fired yet; otherwise it would write
    // the previous turn's text after this state was reset (or after destroy).
    if (state.flushTimer !== undefined) {
        if (state.flushRaf && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(state.flushTimer);
        } else if (typeof clearTimeout === 'function') {
            clearTimeout(state.flushTimer);
        }
        state.flushTimer = undefined;
    }
    state.flushRaf = false;
    state.flushPending = false;
    state.flushMessage = undefined;
    state.turnSessionId = undefined;
    state.assistantMessage = undefined;
    state.streamMessageText = '';
    state.sealedNarrationCount = 0;
    state.reasoningText = '';
    state.reasoningPhase = '';
}

/**
 * Buffer text/thought from a turn whose session is not the active tab.
 * Tool/event rows are persisted by the runtime and appear when that tab is
 * reloaded; mutating the active tab's state here would corrupt its transcript.
 *
 * Returns true when the chunk belonged to a background turn.
 */
export function bufferBackgroundTurnChunk(state: AgentConsoleTurnStreamState, chunk: any): boolean {
    if (!state.turnSessionId) {
        return false;
    }
    if (chunk?.type !== 'text' && chunk?.type !== 'reasoning') {
        return true;
    }
    if (chunk?.type === 'text' && chunk.content) {
        state.streamMessageText = `${state.streamMessageText || ''}${chunk.content}`;
    } else if (chunk?.type === 'reasoning' && chunk.content) {
        const delta = String(chunk.content);
        state.reasoningText = appendReasoningText(state.reasoningText, delta);
        state.reasoningPhase = `${state.reasoningPhase || ''}${delta}`;
    }
    return true;
}
