import type { AgentMessage } from '@tsdi/agent';
import { paginateSessionMessages as paginateMessages } from '@tsdi/agent';

export interface SessionMessagePage {
    page: AgentMessage[];
    hasMore: boolean;
}

/**
 * Page through a session transcript (newest-first window, or around a cursor).
 * Kept out of `AppRpcServer` so the RPC table stays within its size budget.
 * The slice semantics live in `@tsdi/agent` so the in-process SessionStore and
 * the gateway page identically.
 */
export function paginateSessionMessages(
    messages: AgentMessage[],
    params: { limit?: unknown; cursor?: unknown; before?: unknown },
    invalidCursor: (cursor: string) => Error
): SessionMessagePage {
    const paged = paginateMessages(messages, {
        limit: typeof params?.limit === 'number' ? params.limit : undefined,
        cursor: typeof params?.cursor === 'string' ? params.cursor : undefined,
        before: !!params?.before
    }, invalidCursor);
    return { page: paged.messages, hasMore: paged.hasMore };
}
