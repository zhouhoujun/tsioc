import type { AgentConsoleSessionState, AgentConsoleSessionItem } from './AgentConsoleSessionState';
import { resolveSessionProjectKey } from './AgentConsoleProjectProjection';

export function resolveAgentConsoleSessionTabs(state: AgentConsoleSessionState): AgentConsoleSessionItem[] {
    const sessions = (state.sessions || []).filter(session => session && session.id);
    const anchor = sessions.find(session => session.id === state.sessionId)
        || sessions.find(session => session.current);
    const projectKey = anchor ? resolveSessionProjectKey(anchor) : '';
    const scoped = projectKey
        ? sessions.filter(session => resolveSessionProjectKey(session) === projectKey)
        : sessions;
    const openIds = (state.openSessionIds || []).filter(Boolean);
    if (!openIds.length) {
        return scoped;
    }
    const open = new Set(openIds);
    const visible = scoped.filter(session => open.has(session.id) || session.id === state.sessionId);
    if (!visible.length) {
        return scoped;
    }
    const order = new Map(openIds.map((id, index) => [id, index]));
    return visible.sort((left, right) => {
        const leftOrder = order.has(left.id) ? order.get(left.id)! : Number.MAX_SAFE_INTEGER;
        const rightOrder = order.has(right.id) ? order.get(right.id)! : Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
    });
}
