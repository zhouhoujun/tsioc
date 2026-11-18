import { batchReactiveUpdates } from '@tsdi/components';
import { resolveTokenUsageFromMessages, resolveUsagePayload } from './AgentConsoleTokenUsageState';
import { trackMessagesNewCount } from './AgentConsoleTranscriptLayout';
import type { AgentMessage } from '@tsdi/agent';

/**
 * Marks arrays that already passed the transcript sanitizing filter. Tab
 * switches re-apply a session's cached transcript array; re-filtering it scans
 * every message with a regex and allocates a new array, and it also breaks the
 * identity fast path in the message-item cache.
 */
const PROJECTED_MESSAGES = Symbol('__agentConsoleProjectedMessages');

function projectConsoleMessages(messages: AgentMessage[]): AgentMessage[] {
    if (!Array.isArray(messages)) {
        return [];
    }
    if ((messages as any)[PROJECTED_MESSAGES] === true) {
        return messages;
    }
    const projected = messages.filter(message => {
        if (!message || typeof message.content !== 'string') return false;
        const content = message.content;
        const roleMarkers = content.match(/(?:^|\|\s*)(?:assistant|tool|user):/g) || [];
        return !(roleMarkers.length >= 2
            || (roleMarkers.length >= 1
                && (content.includes('truncated') || content.includes('"path"') || content.includes('path":"'))));
    });
    try {
        Object.defineProperty(projected, PROJECTED_MESSAGES, {
            value: true,
            enumerable: false,
            configurable: true
        });
    } catch {
        // Frozen/array-like input: fall back to filtering on the next write.
    }
    return projected;
}


export interface AgentConsoleMessageState {
    messages: AgentMessage[];
    setMessages(messages: AgentMessage[], preserveCommandExecutionMessages?: boolean): void;
}

export function findStreamingAssistantMessageIndex(messages: AgentMessage[], message?: AgentMessage): number {
    const messageId = String(message?.id || '').trim();
    if (messageId) {
        const explicitIndex = messages.findIndex(item => item.id === messageId);
        if (explicitIndex >= 0) {
            return explicitIndex;
        }
    }
    for (let index = messages.length - 1; index >= 0; index--) {
        const current = messages[index];
        if (current?.role === 'assistant' && current?.metadata?.streaming) {
            return index;
        }
    }
    return -1;
}

export function ensureMessageAtTail(state: AgentConsoleMessageState, messageId: string): void {
    const resolvedId = String(messageId || '').trim();
    if (!resolvedId) {
        return;
    }
    const current = state.messages.slice();
    const index = current.findIndex(item => item.id === resolvedId);
    if (index < 0 || index === current.length - 1) {
        return;
    }
    const [message] = current.splice(index, 1);
    if (!message) {
        return;
    }
    current.push(message);
    state.setMessages(current);
}

export function replaceStreamingAssistantMessage(state: AgentConsoleMessageState, destroyed: boolean, message: AgentMessage): void {
    if (destroyed) {
        return;
    }
    const current = state.messages.slice();
    const targetIndex = findStreamingAssistantMessageIndex(current, message);
    if (targetIndex < 0) {
        return;
    }
    const currentMessage = current[targetIndex];
    const replacement = {
        ...currentMessage,
        ...message,
        metadata: {
            ...(currentMessage.metadata || {}),
            ...(message.metadata || {})
        }
    };
    if (String(currentMessage.content || '') === String(replacement.content || '')
        && currentMessage.metadata?.streaming === replacement.metadata?.streaming) {
        return;
    }
    current[targetIndex] = replacement;
    if (replacement.metadata?.streaming !== true && targetIndex !== current.length - 1) {
        current.splice(targetIndex, 1);
        current.push(replacement);
    }
    // Part of the live turn: keep the chunk usage and command executions. A
    // plain setMessages would recompute usage from message metadata, wiping the
    // streamed usage when the assistant row itself carries none.
    state.setMessages(current, true);
}

export interface AgentConsoleMessageCollectionState extends AgentConsoleMessageState {
    displayMessages: AgentMessage[];
    commandExecutionMessages: AgentMessage[];
    tokenUsage: any;
    selectedMessageId: string;
    messageDetailOpen: boolean;
    messageDetailScroll: number;
    messageDetailColumnScroll: number;
    messagesFocused: boolean;
    transcriptFollowProvider?: () => boolean;
    transcriptFollowing: boolean;
    messagesNewCount: number;
    sections: any[];
}

export function setMessagesInState(state: AgentConsoleMessageCollectionState, messages: AgentMessage[], preserveCommandExecutionMessages = false): void {
    // One streaming update writes messages, selection, following, usage and the
    // command-execution list. Coalesce those writes into a single effect pass
    // instead of re-running every affected binding per field.
    batchReactiveUpdates(() => setMessagesProjection(state, messages, preserveCommandExecutionMessages));
}

function setMessagesProjection(state: AgentConsoleMessageCollectionState, messages: AgentMessage[], preserveCommandExecutionMessages: boolean): void {
    const previousCount = state.messages.length;
    state.messages = projectConsoleMessages(messages);
    if (!preserveCommandExecutionMessages && state.commandExecutionMessages.length) {
        state.commandExecutionMessages = [];
    }
    const messageUsage = messages.some(message => !!resolveUsagePayload(message?.metadata?.usage));
    if (messageUsage || !preserveCommandExecutionMessages) {
        const nextUsage = resolveTokenUsageFromMessages(messages);
        const currentUsage = state.tokenUsage;
        if (!currentUsage
            || currentUsage.promptTokens !== nextUsage.promptTokens
            || currentUsage.completionTokens !== nextUsage.completionTokens
            || currentUsage.totalTokens !== nextUsage.totalTokens) {
            state.tokenUsage = nextUsage;
        }
    }
    const shouldFollowLatest = !state.messagesFocused && !state.messageDetailOpen;
    // While the assistant row streams, it is the followed row. Selecting it
    // directly avoids projecting the whole transcript on every token; the full
    // display projection still runs on completion (streaming=false) and when
    // the last row may be filtered (synthetic/tool-call-only/focused).
    const lastRaw: any = state.messages[state.messages.length - 1];
    const lastRawKind = String(lastRaw?.metadata?.uiKind || '');
    const lastRawSelectable = !!lastRaw?.id
        && lastRaw?.metadata?.streaming === true
        && String(lastRaw.content || '').trim().length > 0
        && lastRawKind !== 'plan-todo'
        && lastRawKind !== 'file-change'
        && lastRawKind !== 'command-execution'
        && !lastRawKind.startsWith('timeline');
    if (!state.messages.length) {
        state.selectedMessageId = '';
        state.messageDetailOpen = false;
        state.messageDetailScroll = 0;
        state.messageDetailColumnScroll = 0;
    } else if (shouldFollowLatest && lastRawSelectable) {
        if (state.selectedMessageId !== lastRaw.id) {
            state.selectedMessageId = lastRaw.id;
            state.messageDetailScroll = 0;
            state.messageDetailColumnScroll = 0;
        }
    } else {
        const displayMessages = state.displayMessages;
        const selectable = displayMessages.filter(m =>
            m.id !== '__plan_todo_inline__' && m.id !== '__file_change_inline__' && m.id !== '__timeline_plan_boundary__'
                && m.metadata?.uiKind !== 'command-execution'
        );
        if (shouldFollowLatest || !state.selectedMessageId || !selectable.some(item => item.id === state.selectedMessageId)) {
            state.selectedMessageId = selectable.length ? selectable[selectable.length - 1].id : '';
            state.messageDetailScroll = 0;
            state.messageDetailColumnScroll = 0;
        }
    }
    const following = state.transcriptFollowProvider ? state.transcriptFollowProvider() : true;
    state.transcriptFollowing = following;
    if (state.messagesFocused || !following) {
        state.messagesNewCount = trackMessagesNewCount(previousCount, state.messages.length, true, state.messagesNewCount);
    } else {
        state.messagesNewCount = 0;
    }
}

export function appendMessageInState(state: AgentConsoleMessageCollectionState, message: AgentMessage): void {
    state.setMessages([...state.messages, message], true);
}

export function mergeMessagesPageInState(state: AgentConsoleMessageCollectionState, page: { messages: AgentMessage[]; sections?: any[]; hasMore?: boolean; mode?: 'append' | 'prepend' }): void {
    const incoming = Array.isArray(page.messages) ? page.messages : [];
    if (Array.isArray(page.sections)) {
        state.sections = page.sections;
    }
    if (!incoming.length) {
        return;
    }
    const mode = page.mode === 'prepend' ? 'prepend' : 'append';
    const existingIds = new Set(state.messages.map(message => message.id));
    const fresh = incoming.filter(message => !existingIds.has(message.id));
    if (!fresh.length) {
        return;
    }
    state.setMessages(mode === 'prepend' ? [...fresh, ...state.messages] : [...state.messages, ...fresh], true);
}
