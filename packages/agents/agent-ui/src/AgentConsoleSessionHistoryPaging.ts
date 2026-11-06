import type { AgentMessage, AgentSessionSection } from '@tsdi/agent';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { normalizeLoadedMessages } from './AgentConsoleMessageNormalization';
import { mergeMessagesPageInState } from './AgentConsoleMessageState';
import { AGENT_CONSOLE_SESSION_PAGE_SIZE } from './AgentConsoleSessionContentLoader';
import type { AgentUiTranslator } from './agent-ui.i18n';

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
 * Load one older transcript page and prepend it without moving the row the
 * user is reading. The initial session open only fetches the newest page, so a
 * long session does not render its entire history on every tab switch.
 */
export async function loadOlderSessionMessages(host: AgentConsoleSessionHistoryPagingHost): Promise<void> {
    const { state, sessionService } = host;
    if (!sessionService || state.messagesPageLoading || !state.messagesHasMore || !state.messagesPageCursor) {
        return;
    }
    const sessionId = state.sessionId;
    state.messagesPageLoading = true;
    try {
        const page = await sessionService.loadMessagesPage(sessionId, undefined, {
            cursor: state.messagesPageCursor,
            before: true,
            limit: AGENT_CONSOLE_SESSION_PAGE_SIZE
        });
        if (state.sessionId !== sessionId) {
            return;
        }
        const messages = normalizeLoadedMessages(page.messages.slice(), { translator: host.translator });
        if (!messages.length) {
            state.messagesHasMore = false;
            state.messagesPageCursor = '';
            return;
        }
        // Mark before the state write: the reactive render runs after this task.
        host.surfaceAccessor?.notifyViewportPrepend?.();
        mergeMessagesPageInState(state, {
            messages,
            sections: Array.isArray(page.sections) ? page.sections : undefined,
            mode: 'prepend'
        });
        state.messagesPageCursor = messages[0]?.id || state.messagesPageCursor;
        state.messagesHasMore = page.hasMore === true;
    } catch {
        // Keep hasMore true so the next scroll retries; the session stays usable
        // when one older-page request fails transiently.
    } finally {
        if (state.sessionId === sessionId) {
            state.messagesPageLoading = false;
        }
    }
}
