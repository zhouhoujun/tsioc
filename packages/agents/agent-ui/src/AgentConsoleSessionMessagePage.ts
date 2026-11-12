import {
    AgentConsoleAppRpc,
    AgentMessage,
    AgentRuntime,
    AgentSessionSection,
    paginateSessionMessages,
    SessionStore
} from '@tsdi/agent';

/** One console transcript page; mirrors the RPC/SessionStore paging shape. */
export interface AgentConsoleSessionMessagePage {
    messages: AgentMessage[];
    sections?: AgentSessionSection[];
    goalSummary?: any;
    nextCursor?: string;
    hasMore?: boolean;
}

/** The three transports a console can use to read a session transcript. */
export interface AgentConsoleSessionMessageHost {
    appRpc?: AgentConsoleAppRpc | null;
    sessionStore?: SessionStore | null;
    runtime?: AgentRuntime | null;
}

/**
 * Read one transcript page from whichever transport the host provides.
 *
 * The TUI has no AppRpc: it reads `SessionStore.listMessagesPage` (a targeted
 * database query) instead of loading the whole session. The web console pages
 * through the gateway RPC. Only the runtime fallback (ad-hoc hosts) reads the
 * in-memory transcript, and it still slices before returning.
 */
export async function loadAgentConsoleSessionMessagePage(
    host: AgentConsoleSessionMessageHost,
    sessionId: string,
    context?: any,
    options?: { cursor?: string; before?: boolean; limit?: number }
): Promise<AgentConsoleSessionMessagePage> {
    if (host.appRpc) {
        const params: Record<string, any> = { sessionId };
        if (options?.cursor) {
            params.cursor = options.cursor;
        }
        if (options?.before) {
            params.before = true;
        }
        if (options?.limit != null) {
            params.limit = options.limit;
        }
        const page = await host.appRpc.request('session.messages', params, context);
        if (page && typeof page === 'object' && Array.isArray(page.messages)) {
            return {
                messages: page.messages,
                sections: Array.isArray(page.sections) ? page.sections : undefined,
                goalSummary: page.goalSummary,
                nextCursor: page.nextCursor,
                hasMore: !!page.hasMore
            };
        }
        return { messages: Array.isArray(page) ? page : [] };
    }
    if (host.runtime) {
        const raw = await host.runtime.getMessages(sessionId);
        const page = paginateSessionMessages(raw, options);
        const state = typeof (host.runtime as any).getSessionState === 'function'
            ? await (host.runtime as any).getSessionState(sessionId)
            : undefined;
        return {
            messages: page.messages,
            sections: Array.isArray(state?.sections) ? state.sections : undefined,
            goalSummary: await host.runtime?.getSessionGoal(sessionId),
            nextCursor: page.nextCursor,
            hasMore: page.hasMore
        };
    }
    if (host.sessionStore) {
        const page = await host.sessionStore.listMessagesPage(sessionId, options);
        const sections = await host.sessionStore.listSections(sessionId).catch(() => undefined);
        return {
            messages: page.messages,
            sections,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore
        };
    }
    return { messages: [], hasMore: false };
}

/**
 * Full transcript for callers that genuinely need every message (session
 * content search/export), never for opening a session in the timeline.
 */
export async function loadAgentConsoleAllMessages(
    host: AgentConsoleSessionMessageHost,
    sessionId: string,
    context?: any
): Promise<AgentMessage[]> {
    if (host.sessionStore) {
        const state = await host.sessionStore.get(sessionId);
        return state.messages || [];
    }
    if (host.runtime) {
        return host.runtime.getMessages(sessionId);
    }
    const page = await loadAgentConsoleSessionMessagePage(host, sessionId, context, { limit: 500 });
    return page.messages;
}
