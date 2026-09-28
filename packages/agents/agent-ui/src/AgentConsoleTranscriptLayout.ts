import type { AgentConsoleMessageLayout } from './AgentConsoleViewport';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/**
 * Platform-neutral transcript layout contract.
 *
 * `stream` leaves history to the terminal's native scrollback; `viewport`
 * windows the transcript and scrolls history inside the window. Platform
 * adapters (TUI/DOM) can supply their own implementation when their scroll
 * mechanics differ, so shared code never branches on the layout mode directly.
 */
export interface AgentConsoleTranscriptLayout {
    readonly mode: AgentConsoleMessageLayout;
    /** Renderer should rely on the platform's native scrollback for history. */
    readonly usesNativeScrollback: boolean;
    /** Platform wheel input should be routed to transcript history scrolling. */
    readonly wheelScrollsHistory: boolean;
    /** Apply a scroll delta to the transcript; returns whether it was consumed. */
    scroll(delta: number, state: AgentConsoleSessionState): boolean;
}

class StreamTranscriptLayout implements AgentConsoleTranscriptLayout {
    readonly mode = 'stream' as const;
    readonly usesNativeScrollback = true;
    readonly wheelScrollsHistory = false;

    scroll(): boolean {
        return false;
    }
}

class ViewportTranscriptLayout implements AgentConsoleTranscriptLayout {
    readonly mode = 'viewport' as const;
    readonly usesNativeScrollback = false;
    readonly wheelScrollsHistory = true;

    scroll(delta: number, state: AgentConsoleSessionState): boolean {
        const messages = state.displayMessages;
        if (!messages.length) {
            return false;
        }
        if (delta < 0) {
            if (!state.messagesFocused) {
                state.setMessagesFocused(true);
            }
            state.moveMessageSelectionPage(-1, 1);
            return true;
        }
        if (!state.messagesFocused) {
            return false;
        }
        state.moveMessageSelectionPage(1, 1);
        const last = messages[messages.length - 1];
        if (last && state.selectedMessageId === last.id) {
            state.setMessagesFocused(false);
        }
        return true;
    }
}

const TRANSCRIPT_LAYOUTS: Record<AgentConsoleMessageLayout, AgentConsoleTranscriptLayout> = {
    stream: new StreamTranscriptLayout(),
    viewport: new ViewportTranscriptLayout()
};

/** Resolve the layout strategy for a persisted/option value (legacy `dynamic` -> viewport). */
export function resolveTranscriptLayout(mode: unknown): AgentConsoleTranscriptLayout {
    return mode === 'stream' ? TRANSCRIPT_LAYOUTS.stream : TRANSCRIPT_LAYOUTS.viewport;
}

/** Count messages that arrived while the transcript is scrolled up (0 while following). */
export function trackMessagesNewCount(previousCount: number, nextCount: number, focused: boolean, current: number): number {
    if (!focused) {
        return 0;
    }
    return nextCount > previousCount ? current + (nextCount - previousCount) : current;
}
