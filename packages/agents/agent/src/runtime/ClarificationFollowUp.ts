import type { AgentMessage } from './AgentMessage';

/** Locate the previous non-streaming, non-command message of a role. */
export function findPreviousMessageIndex(messages: AgentMessage[], startIndex: number, role: AgentMessage['role']): number {
    for (let index = startIndex; index >= 0; index--) {
        const message = messages[index];
        if (message?.role !== role) {
            continue;
        }
        if (message?.metadata?.streaming || message?.metadata?.slashCommand) {
            continue;
        }
        return index;
    }
    return -1;
}

export function isShortClarificationAnswer(content: string): boolean {
    const text = String(content || '').trim();
    if (!text || text.startsWith('/') || text.includes('\n') || text.includes('@')) {
        return false;
    }
    if (text.length > 80) {
        return false;
    }
    return !(/[.?!。？！]/.test(text) && text.length > 32);
}

export function isClarificationAssistantMessage(content: string): boolean {
    const text = String(content || '').trim();
    if (!text) {
        return false;
    }
    if (text.includes('?') || text.includes('？')) {
        return true;
    }
    return /(please tell me|tell me|please provide|provide|which one|what is|what are|where is|where are|who is|who are|when is|when are|how many|i still need|i need|missing|clarify|confirmation|confirm|请告诉我|告诉我|请发我|请提供|请补充|还需要|需要你|缺少|确认一下|补充一下)/i.test(text);
}

export function buildClarificationFollowUpContent(previousUser: string, previousAssistant: string, currentAnswer: string): string {
    return [
        '[Follow-up Context]',
        `Previous user request: ${String(previousUser || '').trim()}`,
        `Assistant clarification: ${String(previousAssistant || '').trim()}`,
        `User follow-up answer: ${String(currentAnswer || '').trim()}`,
        '',
        'Continue the original task directly using the follow-up answer above.'
    ].join('\n');
}

export function hadPriorClarification(messages: AgentMessage[], currentUserMessageId: string): boolean {
    const currentIndex = messages.findIndex(message => message.id === currentUserMessageId);
    if (currentIndex < 1) {
        return false;
    }
    const previousAssistantIndex = findPreviousMessageIndex(messages, currentIndex - 1, 'assistant');
    if (previousAssistantIndex < 0) {
        return false;
    }
    return isClarificationAssistantMessage(messages[previousAssistantIndex]?.content);
}

/** Rewrite a short follow-up answer using the preceding clarification context. */
export function rewriteClarificationFollowUp(messages: AgentMessage[], currentUserMessageId: string): AgentMessage[] {
    const currentIndex = messages.findIndex(message => message.id === currentUserMessageId);
    if (currentIndex < 1) {
        return messages;
    }
    const currentUserMessage = messages[currentIndex];
    if (currentUserMessage.role !== 'user' || !isShortClarificationAnswer(currentUserMessage.content)) {
        return messages;
    }
    if (String(currentUserMessage.content || '').includes('[Follow-up Context]')) {
        return messages;
    }
    const previousAssistantIndex = findPreviousMessageIndex(messages, currentIndex - 1, 'assistant');
    if (previousAssistantIndex < 0) {
        return messages;
    }
    const previousAssistant = messages[previousAssistantIndex];
    if (!isClarificationAssistantMessage(previousAssistant.content)) {
        return messages;
    }
    const previousUserIndex = findPreviousMessageIndex(messages, previousAssistantIndex - 1, 'user');
    if (previousUserIndex < 0) {
        return messages;
    }
    const previousUser = messages[previousUserIndex];
    const rewritten = buildClarificationFollowUpContent(previousUser.content, previousAssistant.content, currentUserMessage.content);
    return messages.map((message, index) => index === currentIndex ? { ...message, content: rewritten } : message);
}
