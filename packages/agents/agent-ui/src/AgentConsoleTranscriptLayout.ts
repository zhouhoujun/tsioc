import type { AgentConsoleMessageLayout } from './AgentConsoleViewport';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { Abstract, Injectable } from '@tsdi/ioc';

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
    /** TUI should own the full terminal screen instead of the shell scrollback. */
    readonly usesAlternateScreen: boolean;
    /** Platform wheel input should be routed to transcript history scrolling. */
    readonly wheelScrollsHistory: boolean;
    /** The app owns history scrolling, so the platform must not render its own scrollbar/scroll region. */
    readonly ownsHistoryScroll: boolean;
    /** Apply a scroll delta to the transcript; returns whether it was consumed. */
    scroll(delta: number, navigation: AgentConsoleTranscriptNavigationController): boolean;
}

class StreamTranscriptLayout implements AgentConsoleTranscriptLayout {
    readonly mode = 'stream' as const;
    readonly usesNativeScrollback = true;
    readonly usesAlternateScreen = false;
    readonly wheelScrollsHistory = false;
    readonly ownsHistoryScroll = false;

    scroll(): boolean {
        return false;
    }
}

class ViewportTranscriptLayout implements AgentConsoleTranscriptLayout {
    readonly mode = 'viewport' as const;
    readonly usesNativeScrollback = false;
    readonly usesAlternateScreen = true;
    readonly wheelScrollsHistory = true;
    readonly ownsHistoryScroll = true;

    scroll(delta: number, navigation: AgentConsoleTranscriptNavigationController): boolean {
        return navigation.scroll(delta);
    }
}

const TRANSCRIPT_LAYOUTS: Record<AgentConsoleMessageLayout, AgentConsoleTranscriptLayout> = {
    stream: new StreamTranscriptLayout(),
    viewport: new ViewportTranscriptLayout()
};

@Abstract()
export abstract class AgentConsoleTranscriptLayoutResolver {
    abstract resolve(mode: unknown): AgentConsoleTranscriptLayout;
}

@Injectable()
export class DefaultAgentConsoleTranscriptLayoutResolver extends AgentConsoleTranscriptLayoutResolver {
    resolve(mode: unknown): AgentConsoleTranscriptLayout {
        return mode === 'stream' ? TRANSCRIPT_LAYOUTS.stream : TRANSCRIPT_LAYOUTS.viewport;
    }
}

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
