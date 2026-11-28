import type { AgentUiTranslator } from './agent-ui.i18n';
import { formatAgentUiNotice } from './agent-ui.i18n';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { resolveAgentConsoleSessionTabs } from './AgentConsoleSessionTabList';

export interface AgentConsoleSessionTabHost {
    state: AgentConsoleSessionState;
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    openSession(sessionId?: string): Promise<void> | void;
}

/** The closed-tab history is short-lived UI state; keep the last few only. */
export const AGENT_CONSOLE_CLOSED_TAB_LIMIT = 10;
/** Visit history is bounded so long sessions do not grow the state forever. */
export const AGENT_CONSOLE_TAB_HISTORY_LIMIT = 50;

function openTab(host: AgentConsoleSessionTabHost, sessionId: string): void {
    const action = host.state.sessionTabsAction;
    if (action?.select) {
        action.select(sessionId);
        return;
    }
    void host.openSession(sessionId);
}

/** Record a tab visit without duplicating the current cursor entry. */
export function rememberAgentConsoleSessionTabVisit(state: AgentConsoleSessionState, sessionId?: string): void {
    const id = String(sessionId || '').trim();
    if (!id) {
        return;
    }
    const history = state.sessionTabHistory || [];
    const index = Number.isInteger(state.sessionTabHistoryIndex) ? state.sessionTabHistoryIndex : -1;
    if (history[index] === id) {
        return;
    }
    const next = history.slice(0, index + 1);
    next.push(id);
    state.sessionTabHistory = next.slice(-AGENT_CONSOLE_TAB_HISTORY_LIMIT);
    state.sessionTabHistoryIndex = state.sessionTabHistory.length - 1;
}

function selectTab(host: AgentConsoleSessionTabHost, sessionId: string): void {
    if (!host.state.sessionTabHistoryNavigating) {
        rememberAgentConsoleSessionTabVisit(host.state, host.state.sessionId);
        rememberAgentConsoleSessionTabVisit(host.state, sessionId);
    }
    openTab(host, sessionId);
}

/**
 * Cycle the visible session tabs (Ctrl+Tab / Ctrl+Shift+Tab), wrapping around.
 * Mirrors the tab strip order so keyboard and pointer navigation agree.
 */
export function cycleAgentConsoleSessionTab(host: AgentConsoleSessionTabHost, delta: 1 | -1): boolean {
    const tabs = resolveAgentConsoleSessionTabs(host.state).filter(session => !!session?.id);
    if (tabs.length < 2) {
        return false;
    }
    let index = tabs.findIndex(session => session.id === host.state.sessionId);
    if (index < 0) {
        index = tabs.findIndex(session => !!session.current);
    }
    if (index < 0) {
        index = 0;
    }
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (!next || next.id === host.state.sessionId) {
        return false;
    }
    selectTab(host, next.id);
    return true;
}

/**
 * Select the nth visible session tab (Alt+1 … Alt+9). The index is 1-based and
 * follows the same strip order as Ctrl+Tab, so pointer and keyboard agree.
 */
export function selectAgentConsoleSessionTabByIndex(host: AgentConsoleSessionTabHost, index: number): boolean {
    const position = Math.floor(Number(index) || 0);
    if (position < 1) {
        return false;
    }
    const tabs = resolveAgentConsoleSessionTabs(host.state).filter(session => !!session?.id);
    const target = tabs[position - 1];
    if (!target || target.id === host.state.sessionId) {
        return false;
    }
    selectTab(host, target.id);
    return true;
}

/**
 * Walk the session-tab visit history (Ctrl+Alt+Left/Right). Entries that point
 * at the currently active tab are skipped so one press always changes tabs.
 */
export function navigateAgentConsoleSessionTabHistory(host: AgentConsoleSessionTabHost, delta: 1 | -1): boolean {
    const state = host.state;
    const history = state.sessionTabHistory || [];
    const index = Number.isInteger(state.sessionTabHistoryIndex) ? state.sessionTabHistoryIndex : -1;
    if (!history.length || index < 0) {
        return false;
    }
    let next = index + delta;
    while (next >= 0 && next < history.length && history[next] === state.sessionId) {
        next += delta;
    }
    if (next < 0 || next >= history.length) {
        return false;
    }
    const id = history[next];
    if (!id) {
        return false;
    }
    state.sessionTabHistoryIndex = next;
    state.sessionTabHistoryNavigating = true;
    try {
        selectTab(host, id);
    } finally {
        state.sessionTabHistoryNavigating = false;
    }
    return true;
}

/**
 * Reopen the most recently closed tab (Ctrl+Shift+T). Closed ids that no longer
 * exist (deleted/archived) are skipped with a single notice.
 */
export async function reopenClosedAgentConsoleSessionTab(host: AgentConsoleSessionTabHost): Promise<boolean> {
    const state = host.state;
    const stack = (state.closedSessionTabIds || []).slice();
    const known = new Set((state.sessions || []).map(session => session.id));
    while (stack.length) {
        const id = String(stack.pop() || '').trim();
        if (!id) {
            continue;
        }
        state.closedSessionTabIds = stack;
        if (!known.has(id)) {
            continue;
        }
        const openIds = state.openSessionIds || [];
        if (!openIds.includes(id)) {
            state.setOpenSessionIds([...openIds, id]);
        }
        selectTab(host, id);
        return true;
    }
    state.closedSessionTabIds = [];
    host.notify(formatAgentUiNotice(host.translator, 'noClosedSessionTab'));
    return true;
}

/** Record a closed tab for Ctrl+Shift+T. */
export function rememberClosedAgentConsoleSessionTab(state: AgentConsoleSessionState, id: string): void {
    const closedId = String(id || '').trim();
    if (!closedId) {
        return;
    }
    const next = [...(state.closedSessionTabIds || []).filter(item => item !== closedId), closedId];
    state.closedSessionTabIds = next.slice(-AGENT_CONSOLE_CLOSED_TAB_LIMIT);
}
