import type { AgentMessage } from '@tsdi/agent';

/**
 * Data view the transcript navigation functions operate on. The reactive state
 * proxy satisfies this structurally, so assignments still go through the set
 * trap and re-render the bindings.
 */
export interface AgentConsoleTranscriptNavigationState {
    readonly displayMessages: AgentMessage[];
    selectedMessageId: string;
    messagesFocused: boolean;
    messageDetailScroll: number;
    messageDetailColumnScroll: number;
    readonly consoleOptions: { messageSelectionPageSize?: number };
    setMessagesFocused(focused: boolean): void;
}

function resetMessageDetailScroll(state: AgentConsoleTranscriptNavigationState): void {
    state.messageDetailScroll = 0;
    state.messageDetailColumnScroll = 0;
}

/** Move the selection by `delta` messages, wrapping around the transcript. */
export function moveMessageSelection(state: AgentConsoleTranscriptNavigationState, delta: number): void {
    const messages = state.displayMessages;
    if (!messages.length) {
        return;
    }
    const currentIndex = Math.max(0, messages.findIndex(item => item.id === state.selectedMessageId));
    const nextIndex = (currentIndex + delta + messages.length) % messages.length;
    state.selectedMessageId = messages[nextIndex].id;
    resetMessageDetailScroll(state);
}

/** Move the selection by `delta` pages (default `messageSelectionPageSize`), clamped at the ends. */
export function moveMessageSelectionPage(state: AgentConsoleTranscriptNavigationState, delta: number, pageSize?: number): void {
    const messages = state.displayMessages;
    if (!messages.length) {
        return;
    }
    const currentIndex = Math.max(0, messages.findIndex(item => item.id === state.selectedMessageId));
    const resolvedPageSize = pageSize ?? state.consoleOptions.messageSelectionPageSize ?? 1;
    const nextIndex = Math.max(0, Math.min(messages.length - 1, currentIndex + (delta * Math.max(1, resolvedPageSize))));
    state.selectedMessageId = messages[nextIndex].id;
    resetMessageDetailScroll(state);
}

export function selectFirstMessage(state: AgentConsoleTranscriptNavigationState): void {
    const messages = state.displayMessages;
    if (!messages.length) {
        return;
    }
    state.selectedMessageId = messages[0].id;
    resetMessageDetailScroll(state);
}

export function selectLastMessage(state: AgentConsoleTranscriptNavigationState): void {
    const messages = state.displayMessages;
    if (!messages.length) {
        return;
    }
    state.selectedMessageId = messages[messages.length - 1].id;
    resetMessageDetailScroll(state);
}

export function selectLastUserMessage(state: AgentConsoleTranscriptNavigationState): void {
    const messages = state.displayMessages;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (String(message.role || '').toLowerCase() === 'user'
            && message.metadata?.kind !== 'steer'
            && !!String(message.content || '').trim()) {
            state.selectedMessageId = message.id;
            resetMessageDetailScroll(state);
            return;
        }
    }
}

/**
 * Scroll the transcript history by a delta: negative walks toward older
 * history (entering message focus), positive walks toward the tail and resumes
 * following the latest message. Returns whether the delta was consumed.
 */
export function scrollTranscript(state: AgentConsoleTranscriptNavigationState, delta: number): boolean {
    const messages = state.displayMessages;
    if (!messages.length) {
        return false;
    }
    if (delta < 0) {
        if (!state.messagesFocused) {
            state.setMessagesFocused(true);
        }
        moveMessageSelectionPage(state, -1, 1);
        return true;
    }
    if (!state.messagesFocused) {
        return false;
    }
    moveMessageSelectionPage(state, 1, 1);
    const last = messages[messages.length - 1];
    if (last && state.selectedMessageId === last.id) {
        state.setMessagesFocused(false);
    }
    return true;
}
