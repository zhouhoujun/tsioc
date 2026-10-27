import type { AgentConsoleMessageLayout } from './AgentConsoleViewport';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';
import { Abstract, Injectable } from '@tsdi/ioc';

/**
 * Platform-neutral transcript layout contract.
 *
 * `scrollback` leaves history to the terminal's native scrollback; `viewport`
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

class ScrollbackTranscriptLayout implements AgentConsoleTranscriptLayout {
    readonly mode = 'scrollback' as const;
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
    readonly ownsHistoryScroll = false;

    scroll(delta: number, navigation: AgentConsoleTranscriptNavigationController): boolean {
        return navigation.scroll(delta);
    }
}

const TRANSCRIPT_LAYOUTS: Record<AgentConsoleMessageLayout, AgentConsoleTranscriptLayout> = {
    scrollback: new ScrollbackTranscriptLayout(),
    viewport: new ViewportTranscriptLayout()
};

@Abstract()
export abstract class AgentConsoleTranscriptLayoutResolver {
    abstract resolve(mode: unknown): AgentConsoleTranscriptLayout;
}

@Injectable()
export class DefaultAgentConsoleTranscriptLayoutResolver extends AgentConsoleTranscriptLayoutResolver {
    resolve(mode: unknown): AgentConsoleTranscriptLayout {
        return mode === 'scrollback' || mode === 'stream' ? TRANSCRIPT_LAYOUTS.scrollback : TRANSCRIPT_LAYOUTS.viewport;
    }
}

/** Resolve the layout strategy for a persisted/option value (legacy `stream` -> scrollback, `dynamic` -> viewport). */
export function resolveTranscriptLayout(mode: unknown): AgentConsoleTranscriptLayout {
    return mode === 'scrollback' || mode === 'stream' ? TRANSCRIPT_LAYOUTS.scrollback : TRANSCRIPT_LAYOUTS.viewport;
}

/** Count messages that arrived while the transcript is scrolled up (0 while following). */
export function trackMessagesNewCount(previousCount: number, nextCount: number, focused: boolean, current: number): number {
    if (!focused) {
        return 0;
    }
    return nextCount > previousCount ? current + (nextCount - previousCount) : current;
}

export function scrollAgentConsoleTranscript(
    surface: { scrollViewport?(rows: number): boolean } | null | undefined,
    navigation: AgentConsoleTranscriptNavigationController,
    syncFollowing: () => void,
    delta: number
): void {
    if (surface?.scrollViewport) {
        const rows = delta < 0 ? 3 : -3;
        if (surface.scrollViewport(rows)) {
            syncFollowing();
            return;
        }
    }
    navigation.scroll(delta);
    syncFollowing();
}

/** One rendered transcript item (the subset the row-offset math needs). */
export interface AgentConsoleRowOffsetItem {
    lines?: Array<{ messageId?: string }>;
    spacerBefore?: boolean;
}

/**
 * Rendered row offset (0-based) of one message inside the transcript region.
 * Major conversation blocks start after one visual row (`spacerBefore`), so the
 * offset must include those spacer rows to keep the reveal close to the target.
 */
export function resolveMessageRowOffset(items: readonly AgentConsoleRowOffsetItem[], messageId: string): number | undefined {
    const id = String(messageId || '').trim();
    if (!id) {
        return undefined;
    }
    let row = 0;
    for (const item of items) {
        if (item.spacerBefore) {
            row += 1;
        }
        if (item.lines?.some(line => line.messageId === id)) {
            return row;
        }
        row += item.lines?.length ?? 0;
    }
    return undefined;
}

/** Surface port used to reveal a transcript row. */
export interface AgentConsoleTranscriptRevealSurface {
    scrollViewportToRow?(row: number): boolean;
}

/** Rendered messages panel port used to locate a message row. */
export interface AgentConsoleTranscriptRowSource {
    messageRowOffset?(messageId: string): number | undefined;
}

/**
 * Bring the selected message into view: the messages panel owns the rendered
 * row math and the platform surface scrolls to that absolute row.
 */
export function revealAgentConsoleMessage(
    source: AgentConsoleTranscriptRowSource | null | undefined,
    surface: AgentConsoleTranscriptRevealSurface | null | undefined,
    syncFollowing: () => void,
    messageId: string
): boolean {
    const id = String(messageId || '').trim();
    if (!id || !source?.messageRowOffset || !surface?.scrollViewportToRow) {
        return false;
    }
    const row = source.messageRowOffset(id);
    if (row == null || !surface.scrollViewportToRow(row)) {
        return false;
    }
    syncFollowing();
    return true;
}
