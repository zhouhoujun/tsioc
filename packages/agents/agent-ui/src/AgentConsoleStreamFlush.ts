import type { AgentMessage } from '@tsdi/agent';
import { findStreamingAssistantMessageIndex } from './AgentConsoleMessageState';
import type { AgentConsoleTurnStreamHost, AgentConsoleTurnStreamState } from './AgentConsoleTurnStreamController';

export function scheduleStreamingAssistantMessageFlush(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message: AgentMessage
): void {
    state.streamMessageText = message.content || '';
    state.flushMessage = message;
    if (host.destroyed) {
        return;
    }
    // Coalesce rapid chunks: one transcript update per frame (browser) or per
    // ~33ms (TUI). A trailing flush is forced on done/tool_call/finalize so the
    // last text is never lost.
    if (state.flushPending) {
        return;
    }
    const run = (): void => {
        state.flushPending = false;
        state.flushTimer = undefined;
        if (host.destroyed) {
            return;
        }
        if (state.turnSessionId && state.turnSessionId !== host.state.sessionId) {
            return;
        }
        flushStreamingAssistantMessage(host, state, state.flushMessage || message);
    };
    state.flushPending = true;
    if (typeof requestAnimationFrame === 'function') {
        state.flushRaf = true;
        state.flushTimer = requestAnimationFrame(run);
    } else if (typeof setTimeout === 'function') {
        state.flushRaf = false;
        state.flushTimer = setTimeout(run, 33);
        (state.flushTimer as any)?.unref?.();
    } else {
        run();
    }
}

/** Flush any coalesced streaming text immediately (turn end/tool boundary/tab change). */
export function forceStreamingAssistantMessageFlush(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState
): void {
    if (state.flushTimer !== undefined) {
        if (state.flushRaf && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(state.flushTimer);
        } else if (typeof clearTimeout === 'function') {
            clearTimeout(state.flushTimer);
        }
        state.flushTimer = undefined;
        state.flushRaf = false;
    }
    state.flushPending = false;
    if (host.destroyed) {
        return;
    }
    if (state.turnSessionId && state.turnSessionId !== host.state.sessionId) {
        return;
    }
    if (state.flushMessage) {
        flushStreamingAssistantMessage(host, state, state.flushMessage);
    }
}

/**
 * Projects the accumulated streaming text onto the tracked assistant message
 * row. Short-circuits when the row already carries the same text.
 */
export function flushStreamingAssistantMessage(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message?: AgentMessage
): void {
    if (host.destroyed) {
        state.streamMessageText = '';
        return;
    }
    const text = state.streamMessageText;
    const current = host.state.messages.slice();
    const targetIndex = findStreamingAssistantMessageIndex(current, message);
    if (!text.trim() && state.sealedNarrationCount > 0) {
        if (targetIndex >= 0) {
            current.splice(targetIndex, 1);
            host.state.setMessages(current, true);
        }
        return;
    }
    if (targetIndex >= 0) {
        const currentMessage = current[targetIndex];
        if (String(currentMessage.content || '') === text
            && currentMessage.metadata?.streaming === true) {
            return;
        }
        const updated: AgentMessage = {
            ...(message || currentMessage),
            content: text,
            metadata: {
                ...(message?.metadata || currentMessage.metadata || {}),
                streaming: true
            }
        };
        if (targetIndex === current.length - 1) {
            current[targetIndex] = updated;
        } else {
            current.splice(targetIndex, 1);
            current.push(updated);
        }
    } else if (message && text.trim()) {
        current.push({
            ...message,
            content: text,
            metadata: {
                ...(message.metadata || {}),
                streaming: true
            }
        });
    } else {
        return;
    }
    host.state.setMessages(current, true);
}

