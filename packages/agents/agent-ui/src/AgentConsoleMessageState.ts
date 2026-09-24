import type { AgentMessage } from '@tsdi/agent';

export interface AgentConsoleMessageState {
    messages: AgentMessage[];
    setMessages(messages: AgentMessage[]): void;
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
