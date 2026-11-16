import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTheme } from './AgentConsoleTheme';
import type { AgentConsoleRenderedMessageItem } from './AgentConsoleMessageRenderers';

export interface AgentConsoleMessageItemsCacheEntry {
    sessionId?: string;
    messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>;
    slotKeys: string[];
    selectedMessageId: string;
    messagesFocused: boolean;
    theme: AgentConsoleTheme;
    statusLabels: AgentConsoleSessionState['consoleOptions']['messageStatusLabels'];
    statusSymbol: AgentConsoleSessionState['consoleOptions']['messageStatusSymbol'];
    username: string;
    rawMode: boolean;
    streaming: boolean;
    showTimestamps: boolean;
    showCriticalMarks: boolean;
    showToolOutput: boolean;
    showUsername: boolean;
    timelineMode: boolean;
    timelineViewMode: string;
    messageDetailOpen: boolean;
    markdownContentWidth: number;
    collapsedTurns: Record<string, boolean>;
    /** Window slice identity (tail window vs full transcript). */
    windowSignature: string;
    items: AgentConsoleRenderedMessageItem[];
}

/** Current transcript projection for the messages panel instance. */
export const messageItemsCache = new WeakMap<object, AgentConsoleMessageItemsCacheEntry>();

/**
 * Per-session projections kept for tab hide/show. Switching back to a tab
 * restores its cached message array and item list, so the view does not have
 * to re-tokenize Markdown for a transcript that was already rendered.
 */
export const sessionMessageItemsCache = new WeakMap<object, Map<string, AgentConsoleMessageItemsCacheEntry>>();

export function sessionMessageItemsEntry(
    owner: object,
    sessionId: string,
    current?: AgentConsoleMessageItemsCacheEntry
): AgentConsoleMessageItemsCacheEntry | undefined {
    if (current?.sessionId === sessionId) {
        return current;
    }
    const key = String(sessionId || '').trim();
    if (!key) {
        return undefined;
    }
    return sessionMessageItemsCache.get(owner)?.get(key);
}

export function rememberSessionMessageItems(
    owner: object,
    entry: AgentConsoleMessageItemsCacheEntry
): void {
    const sessionId = String(entry.sessionId || '').trim();
    if (!sessionId) {
        return;
    }
    let bySession = sessionMessageItemsCache.get(owner);
    if (!bySession) {
        bySession = new Map();
        sessionMessageItemsCache.set(owner, bySession);
    }
    bySession.set(sessionId, entry);
}
