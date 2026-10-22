import type { AgentMessage } from '@tsdi/agent';

export interface SessionMessagePage {
    page: AgentMessage[];
    hasMore: boolean;
}

/**
 * Page through a session transcript (newest-first window, or around a cursor).
 * Kept out of `AppRpcServer` so the RPC table stays within its size budget.
 */
export function paginateSessionMessages(
    messages: AgentMessage[],
    params: { limit?: unknown; cursor?: unknown; before?: unknown },
    invalidCursor: (cursor: string) => Error
): SessionMessagePage {
    const requestedLimit = typeof params?.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : undefined;
    const limit = Math.min(Math.max(requestedLimit ?? 50, 1), 500);
    const cursor = typeof params?.cursor === 'string' && params.cursor.trim() ? params.cursor.trim() : '';
    const before = !!params?.before;
    if (!cursor) {
        const page = messages.slice(Math.max(messages.length - limit, 0));
        return { page, hasMore: messages.length > page.length };
    }
    const cursorIndex = messages.findIndex(message => message.id === cursor);
    if (cursorIndex < 0) {
        throw invalidCursor(cursor);
    }
    if (before) {
        return { page: messages.slice(Math.max(cursorIndex - limit, 0), cursorIndex), hasMore: cursorIndex > limit };
    }
    const page = messages.slice(cursorIndex + 1, cursorIndex + 1 + limit);
    return { page, hasMore: cursorIndex + 1 + limit < messages.length };
}
