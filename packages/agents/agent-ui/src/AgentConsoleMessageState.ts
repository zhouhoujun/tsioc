import { resolveTokenUsageFromMessages, resolveUsagePayload } from './AgentConsoleTokenUsageState';
import { trackMessagesNewCount } from './AgentConsoleTranscriptLayout';
import type { AgentMessage } from '@tsdi/agent';

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
    state.setMessages(current);
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
    const previousCount = state.messages.length;
    state.messages = messages.filter(message => {
        if (!message || typeof message.content !== 'string') return false;
        const content = message.content;
        const roleMarkers = content.match(/(?:^|\|\s*)(?:assistant|tool|user):/g) || [];
        return !(roleMarkers.length >= 2
            || (roleMarkers.length >= 1
                && (content.includes('truncated') || content.includes('"path"') || content.includes('path":"'))));
    });
    if (!preserveCommandExecutionMessages) {
        state.commandExecutionMessages = [];
    }
    const messageUsage = messages.some(message => !!resolveUsagePayload(message?.metadata?.usage));
    if (messageUsage || !preserveCommandExecutionMessages) {
        state.tokenUsage = resolveTokenUsageFromMessages(messages);
    }
    const displayMessages = state.displayMessages;
    if (!displayMessages.length) {
        state.selectedMessageId = '';
        state.messageDetailOpen = false;
        state.messageDetailScroll = 0;
        state.messageDetailColumnScroll = 0;
    } else {
        const selectable = displayMessages.filter(m =>
            m.id !== '__plan_todo_inline__' && m.id !== '__file_change_inline__' && m.id !== '__timeline_plan_boundary__'
                && m.metadata?.uiKind !== 'command-execution'
        );
        const shouldFollowLatest = !state.messagesFocused && !state.messageDetailOpen;
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
