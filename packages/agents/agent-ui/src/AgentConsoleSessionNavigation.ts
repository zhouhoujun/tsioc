import type { AgentConsoleSessionItem, AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Session-list filtering, focus restoration and keyboard navigation. */
export function resolveNavFilteredSessions(state: AgentConsoleSessionState): AgentConsoleSessionItem[] {
    const filter = state.navFilter;
    if (!filter || (!filter.text && !filter.workspace && !filter.projectId && !filter.threadId && !filter.pinnedOnly)) {
        return state.sessions;
    }
    const text = String(filter.text || '').trim().toLowerCase();
    const workspace = String(filter.workspace || '').trim();
    const projectId = String(filter.projectId || '').trim();
    const threadId = String(filter.threadId || '').trim();
    return state.sessions.filter(session => {
        if (text) {
            const haystack = [
                session.id,
                session.title,
                session.summary,
                session.workspace,
                session.projectKey,
                session.projectId,
                session.primaryThreadId
            ].filter(Boolean).map(value => String(value).toLowerCase()).join(' ');
            if (!haystack.includes(text)) {
                return false;
            }
        }
        if (workspace && String(session.workspace || '') !== workspace) {
            return false;
        }
        if (projectId && session.projectId !== projectId && session.projectKey !== projectId) {
            return false;
        }
        if (threadId && session.primaryThreadId !== threadId) {
            return false;
        }
        if (filter.pinnedOnly && session.pinned !== true) {
            return false;
        }
        return true;
    });
}

export function clampSessionSelectionToFilter(state: AgentConsoleSessionState): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        state.selectedSessionId = '';
    } else if (state.selectedSessionId && list.some(item => item.id === state.selectedSessionId)) {
        // Preserve explicit selection when the session list refreshes.
    } else {
        state.selectedSessionId = list.find(item => item.current)?.id || list[0].id;
    }
}

export function setSessionsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.sessionsFocused = focused;
    if (focused) {
        restoreSessionsViewState(state);
    } else {
        persistSessionsViewState(state);
    }
    state.syncDerivedInputFocus();
}

export function restoreSessionsViewState(state: AgentConsoleSessionState): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        state.selectedSessionId = '';
        return;
    }
    const savedScroll = state.getNavViewScroll('sessions');
    if (savedScroll > 0 && savedScroll < list.length) {
        state.selectedSessionId = list[savedScroll].id;
    } else if (!state.selectedSessionId || !list.some(item => item.id === state.selectedSessionId)) {
        state.selectedSessionId = list.find(item => item.current)?.id || list[0].id;
    }
    const index = list.findIndex(item => item.id === state.selectedSessionId);
    if (index >= 0) {
        state.setNavSelection({ type: 'session', id: state.selectedSessionId, index });
    }
}

export function persistSessionsViewState(state: AgentConsoleSessionState): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        return;
    }
    const index = Math.max(0, list.findIndex(item => item.id === state.selectedSessionId));
    state.setNavViewScroll('sessions', index);
}

export function setProjectsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.projectsFocused = focused;
    if (focused && !state.selectedSessionId && state.sessions.length) {
        state.selectedSessionId = state.sessions.find(item => item.current)?.id || state.sessions[0].id;
    }
    state.syncDerivedInputFocus();
}

export function setThreadsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.threadsFocused = focused;
    if (focused && !state.selectedSessionId && state.sessions.length) {
        state.selectedSessionId = state.sessions.find(item => item.current)?.id || state.sessions[0].id;
    }
    state.syncDerivedInputFocus();
}

export function setToolRunsFocused(state: AgentConsoleSessionState, focused: boolean): void {
    state.toolRunsFocused = focused;
    state.syncDerivedInputFocus();
}

export function setSelectedSessionId(state: AgentConsoleSessionState, sessionId: string): void {
    if (!sessionId || !state.navFilteredSessions.some(item => item.id === sessionId)) {
        return;
    }
    state.selectedSessionId = sessionId;
}

export function moveSessionSelection(state: AgentConsoleSessionState, delta: number): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        return;
    }
    const currentIndex = Math.max(0, list.findIndex(item => item.id === state.selectedSessionId));
    const nextIndex = (currentIndex + delta + list.length) % list.length;
    state.selectedSessionId = list[nextIndex].id;
}

export function moveSessionSelectionPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        return;
    }
    const currentIndex = Math.max(0, list.findIndex(item => item.id === state.selectedSessionId));
    const resolvedPageSize = pageSize ?? state.consoleOptions.sessionSelectionPageSize;
    const nextIndex = Math.max(0, Math.min(list.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
    state.selectedSessionId = list[nextIndex].id;
}

export function selectFirstSession(state: AgentConsoleSessionState): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        return;
    }
    state.selectedSessionId = list[0].id;
}

export function selectLastSession(state: AgentConsoleSessionState): void {
    const list = state.navFilteredSessions;
    if (!list.length) {
        return;
    }
    state.selectedSessionId = list[list.length - 1].id;
}

export function resolveSelectedSession(state: AgentConsoleSessionState): AgentConsoleSessionItem | undefined {
    return state.navFilteredSessions.find(item => item.id === state.selectedSessionId);
}

export function formatSessionWorkspaceLabel(workspace?: string): string {
    const text = String(workspace || '').trim();
    if (!text) {
        return '';
    }
    const segments = text.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || text;
}

export function buildSelectedSessionCopyText(state: AgentConsoleSessionState): string {
    const selected = state.selectedSession;
    if (!selected) {
        return '';
    }
    return [
        selected.id,
        selected.workspace ? `workspace=${selected.workspace}` : '',
        selected.messageCount != null ? `messageCount=${selected.messageCount}` : '',
        selected.updatedAt != null ? `updatedAt=${new Date(selected.updatedAt).toISOString()}` : ''
    ].filter(Boolean).join('\n');
}
