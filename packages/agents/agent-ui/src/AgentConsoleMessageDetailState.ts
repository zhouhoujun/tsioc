import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

export function isMessageExpanded(state: AgentConsoleSessionState, messageId: string): boolean {
        return state.expandedMessageIds.includes(String(messageId || '').trim());
    }

export function setMessageExpanded(state: AgentConsoleSessionState, messageId: string, expanded: boolean): void {
        const id = String(messageId || '').trim();
        if (!id || expanded === state.isMessageExpanded(id)) {
            return;
        }
        state.expandedMessageIds = expanded
            ? [...state.expandedMessageIds, id]
            : state.expandedMessageIds.filter(item => item !== id);
    }

export function toggleMessageExpanded(state: AgentConsoleSessionState, messageId: string): void {
        state.setMessageExpanded(messageId, !state.isMessageExpanded(messageId));
    }

export function toggleSelectedMessageExpanded(state: AgentConsoleSessionState): boolean {
        const id = String(state.selectedMessageId || '').trim();
        if (!id) {
            return false;
        }
        state.toggleMessageExpanded(id);
        return true;
    }

export function openMessageDetail(state: AgentConsoleSessionState, takeFocus = true): void {
        if (!state.selectedMessage) {
            return;
        }
        state.messageDetailOpen = true;
        state.messageDetailTakesFocus = takeFocus;
        state.messageDetailScroll = 0;
        state.messageDetailColumnScroll = 0;
        state.syncDerivedInputFocus();
    }

export function closeMessageDetail(state: AgentConsoleSessionState): void {
        if (!state.messageDetailOpen && state.messageDetailScroll === 0) {
            return;
        }
        state.messageDetailOpen = false;
        state.messageDetailTakesFocus = true;
        state.messageDetailScroll = 0;
        state.messageDetailColumnScroll = 0;
        state.syncDerivedInputFocus();
    }

export function scrollMessageDetail(state: AgentConsoleSessionState, delta: number): void {
        if (!state.messageDetailOpen || !state.selectedMessage) {
            return;
        }
        const lines = state.messageDetailLines;
        const maxScroll = Math.max(0, lines.length - state.messageDetailVisibleLines);
        state.messageDetailScroll = Math.max(0, Math.min(maxScroll, state.messageDetailScroll + delta));
    }

export function scrollMessageDetailPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
        if (!state.messageDetailOpen || !state.selectedMessage) {
            return;
        }
        const resolvedPageSize = pageSize ?? Math.max(1, state.messageDetailVisibleLines - 1);
        state.scrollMessageDetail(delta * Math.max(1, resolvedPageSize));
    }

export function scrollMessageDetailToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        if (!state.messageDetailOpen || !state.selectedMessage) {
            return;
        }
        const lines = state.messageDetailLines;
        state.messageDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - state.messageDetailVisibleLines);
    }

export function scrollMessageDetailColumns(state: AgentConsoleSessionState, delta: number): void {
        if (!state.messageDetailOpen || !state.selectedMessage) {
            return;
        }
        const maxScroll = Math.max(0, state.messageDetailMaxColumn - 1);
        state.messageDetailColumnScroll = Math.max(0, Math.min(maxScroll, state.messageDetailColumnScroll + delta));
    }

export function scrollMessageDetailColumnsToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        if (!state.messageDetailOpen || !state.selectedMessage) {
            return;
        }
        state.messageDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, state.messageDetailMaxColumn - 1);
    }

export function resolveMessageDetailLines(state: AgentConsoleSessionState): string[] {
        if (!state.selectedMessage) {
            return [];
        }
        return String(state.selectedMessage?.content || '')
            .replace(/\r/g, '')
            .split('\n')
            .map(line => state.expandTabs(line));
    }

export function resolveMessageDetailMaxColumn(state: AgentConsoleSessionState): number {
        return state.messageDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }
