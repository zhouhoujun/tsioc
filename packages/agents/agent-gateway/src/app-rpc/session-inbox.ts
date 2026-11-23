import type { AgentSessionInboxItem } from '@tsdi/agent';
import { requireSessionId } from './request-helpers';

interface SessionInboxHost {
    sessions: { listInbox(sessionId: string): Promise<AgentSessionInboxItem[]>; replaceInbox(sessionId: string, items: AgentSessionInboxItem[]): Promise<AgentSessionInboxItem[]>; appendInboxItem(sessionId: string, item: AgentSessionInboxItem): Promise<AgentSessionInboxItem> };
    ensureSessionAccess(sessionId: string, context: any): Promise<void>;
}

/** `session.inbox.get`: durable queue/steer items for one session. */
export async function getSessionInbox(host: SessionInboxHost, params: any, context: any): Promise<{ sessionId: string; items: AgentSessionInboxItem[] }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    return { sessionId, items: await host.sessions.listInbox(sessionId) };
}

/** `session.inbox.replace`: atomically replace the ordered queue. */
export async function replaceSessionInbox(host: SessionInboxHost, params: any, context: any): Promise<{ sessionId: string; items: AgentSessionInboxItem[] }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    const items = Array.isArray(params?.items) ? params.items as AgentSessionInboxItem[] : [];
    return { sessionId, items: await host.sessions.replaceInbox(sessionId, items) };
}

/** `session.inbox.append`: add one steer/queue item atomically. */
export async function appendSessionInbox(host: SessionInboxHost, params: any, context: any): Promise<{ sessionId: string; item: AgentSessionInboxItem }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    const item = (params?.item || {}) as AgentSessionInboxItem;
    return { sessionId, item: await host.sessions.appendInboxItem(sessionId, item) };
}
