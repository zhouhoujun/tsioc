import { AgentMessage } from '../runtime/AgentMessage';

/**
 * Select original messages relevant to a user query from the stashed snapshot.
 *
 * Guarantees that the recovered subset never reintroduces an orphan tool round:
 * - an assistant message carrying toolCalls is only recovered together with the
 *   tool results answering every call id (from the stash), and is skipped
 *   entirely when any result is missing;
 * - messages whose ids already exist in the request window (existingIds) are
 *   excluded, so recovery never duplicates or orphans live content.
 *
 * Preserves the stash order of the recovered messages.
 */
export function selectRecoveredDetail(
    messages: AgentMessage[],
    userQuery: string,
    existingIds?: Set<string>
): AgentMessage[] {
    const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    if (queryTerms.length === 0) {
        return [];
    }

    const excluded = existingIds ?? new Set<string>();
    const toolByCallId = new Map<string, AgentMessage>();
    for (const message of messages) {
        if (message.role === 'tool' && message.toolCallId) {
            toolByCallId.set(message.toolCallId, message);
        }
    }

    const selected = new Map<string, AgentMessage>();
    const include = (message: AgentMessage): void => {
        if (!excluded.has(message.id) && !selected.has(message.id)) {
            selected.set(message.id, message);
        }
    };

    for (const message of messages) {
        const content = (message.content || '').toLowerCase();
        if (!queryTerms.some(term => content.includes(term))) {
            continue;
        }
        if (message.role !== 'assistant') {
            include(message);
            continue;
        }
        const toolCalls = message.metadata?.toolCalls as Array<{ id?: string }> | undefined;
        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
            include(message);
            continue;
        }
        const results: AgentMessage[] = [];
        let roundComplete = true;
        for (const call of toolCalls) {
            const result = call?.id ? toolByCallId.get(call.id) : undefined;
            if (!result) {
                roundComplete = false;
                break;
            }
            results.push(result);
        }
        if (!roundComplete) {
            continue;
        }
        include(message);
        for (const result of results) {
            include(result);
        }
    }

    return [...selected.values()];
}