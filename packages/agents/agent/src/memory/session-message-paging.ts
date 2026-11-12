import type { AgentMessage } from '../runtime/AgentMessage';

/** Default page size for transcript paging (newest page and older pages). */
export const DEFAULT_SESSION_MESSAGE_PAGE_SIZE = 50;

/** Upper bound so one request can never pull an unbounded transcript. */
export const SESSION_MESSAGE_PAGE_SIZE_LIMIT = 500;

export interface SessionMessagePageOptions {
    /** Message id to page around. */
    cursor?: string;
    /** Load the page *before* the cursor instead of the page after it. */
    before?: boolean;
    /** Requested page size; clamped to [1, 500]. */
    limit?: number;
}

export interface SessionMessagePage {
    /** Messages in chronological order. */
    messages: AgentMessage[];
    /** Whether another page exists in the requested direction. */
    hasMore: boolean;
    /** Cursor for the page after this one (newest id of the page). */
    nextCursor?: string;
}

export type SessionMessageInvalidCursor = (cursor: string) => Error;

/**
 * Pure transcript paging shared by the gateway RPC, the in-process SessionStore
 * and the console. Keeping the slice semantics in one place means the TUI
 * (SessionStore) and the web console (AppRpc) page identically.
 */
export function paginateSessionMessages(
    messages: AgentMessage[],
    options?: SessionMessagePageOptions,
    invalidCursor: SessionMessageInvalidCursor = cursor => new Error(`cursor message '${cursor}' not found`)
): SessionMessagePage {
    const requestedLimit = typeof options?.limit === 'number' && options.limit > 0
        ? Math.floor(options.limit)
        : undefined;
    const limit = Math.min(Math.max(requestedLimit ?? DEFAULT_SESSION_MESSAGE_PAGE_SIZE, 1), SESSION_MESSAGE_PAGE_SIZE_LIMIT);
    const cursor = typeof options?.cursor === 'string' && options.cursor.trim() ? options.cursor.trim() : '';
    if (!cursor) {
        const page = messages.slice(Math.max(messages.length - limit, 0));
        return {
            messages: page,
            hasMore: messages.length > page.length,
            nextCursor: page[page.length - 1]?.id
        };
    }
    const cursorIndex = messages.findIndex(message => message.id === cursor);
    if (cursorIndex < 0) {
        throw invalidCursor(cursor);
    }
    const page = options?.before
        ? messages.slice(Math.max(cursorIndex - limit, 0), cursorIndex)
        : messages.slice(cursorIndex + 1, cursorIndex + 1 + limit);
    return {
        messages: page,
        hasMore: options?.before ? cursorIndex > limit : cursorIndex + 1 + limit < messages.length,
        nextCursor: page[page.length - 1]?.id ?? cursor
    };
}
