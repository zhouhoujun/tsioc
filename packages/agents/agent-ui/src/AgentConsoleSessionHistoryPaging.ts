import type { AgentMessage, AgentSessionSection } from '@tsdi/agent';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { normalizeLoadedMessages } from './AgentConsoleMessageNormalization';
import { mergeMessagesPageInState } from './AgentConsoleMessageState';
import { AGENT_CONSOLE_SESSION_PAGE_SIZE } from './AgentConsoleSessionContentLoader';
import type { AgentUiTranslator } from './agent-ui.i18n';
import { ListPager, ListPage } from '@tsdi/components/common';

export interface AgentConsoleSessionHistoryPagingHost {
    state: AgentConsoleSessionState;
    translator?: AgentUiTranslator | null;
    surfaceAccessor?: { notifyViewportPrepend?(): void } | null;
    sessionService?: {
        loadMessagesPage(
            sessionId: string,
            context?: any,
            options?: { cursor?: string; before?: boolean; limit?: number }
        ): Promise<{
            messages: AgentMessage[];
            sections?: AgentSessionSection[];
            nextCursor?: string;
            hasMore?: boolean;
        }>;
    } | null;
}

/**
 * One pager per live session state. `ListPager` owns cursor/hasMore/loading,
 * duplicate suppression and concurrent-load protection; the session path only
 * maps a page to normalized messages and prepends it into the transcript.
 */
const pagers = new WeakMap<AgentConsoleSessionState, ListPager<AgentMessage>>();

/** Reset paging when a session is opened or switched. */
export function resetSessionMessagePager(state: AgentConsoleSessionState): void {
    pagers.delete(state);
}

function pagerFor(state: AgentConsoleSessionState): ListPager<AgentMessage> {
    let pager = pagers.get(state);
    if (!pager) {
        pager = new ListPager<AgentMessage>();
        pager.cursor = state.messagesPageCursor;
        pager.hasMore = state.messagesHasMore;
        pagers.set(state, pager);
    }
    return pager;
}

/**
 * Load one older transcript page through the shared List pager and prepend it
 * without moving the row the user is reading.
 */
export async function loadOlderSessionMessages(host: AgentConsoleSessionHistoryPagingHost): Promise<void> {
    const { state, sessionService } = host;
    if (!sessionService || state.messagesPageLoading || !state.messagesHasMore || !state.messagesPageCursor) {
        return;
    }
    const sessionId = state.sessionId;
    const pager = pagerFor(state);
    pager.cursor = state.messagesPageCursor;
    pager.hasMore = state.messagesHasMore;
    let fresh: AgentMessage[] = [];
    let sections: AgentSessionSection[] | undefined;
    state.messagesPageLoading = true;
    try {
        await pager.loadMore(async cursor => {
            const page = await sessionService.loadMessagesPage(sessionId, undefined, {
                cursor,
                before: true,
                limit: AGENT_CONSOLE_SESSION_PAGE_SIZE
            });
            if (state.sessionId !== sessionId) {
                return { items: [], hasMore: false } as ListPage<AgentMessage>;
            }
            fresh = normalizeLoadedMessages(page.messages.slice(), { translator: host.translator });
            sections = Array.isArray(page.sections) ? page.sections : undefined;
            return {
                items: fresh,
                hasMore: page.hasMore === true,
                nextCursor: fresh[0]?.id || cursor
            } as ListPage<AgentMessage>;
        });
        if (state.sessionId !== sessionId) {
            return;
        }
        state.messagesPageCursor = pager.cursor || '';
        state.messagesHasMore = pager.hasMore;
        if (fresh.length) {
            // Mark before the state write: the reactive render runs after this task.
            host.surfaceAccessor?.notifyViewportPrepend?.();
            mergeMessagesPageInState(state, { messages: fresh, sections, mode: 'prepend' });
        }
    } finally {
        if (state.sessionId === sessionId) {
            state.messagesPageLoading = false;
        }
    }
}
