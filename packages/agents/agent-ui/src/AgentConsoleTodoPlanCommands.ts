import type { AgentConsoleAppRpc } from '@tsdi/agent';
import type { AgentConsolePlanTodoItem } from './AgentConsoleSessionState';

/**
 * Host surface required by the todo/plan session merge command.
 * The component satisfies this interface structurally when delegating.
 */
export interface TodoPlanCommandHost {
    appRpc: AgentConsoleAppRpc | null;
    state: {
        sessionId: string;
        clearPlanTodos(): void;
    };
    loadLocalTodoPlan(sessionId: string): Promise<AgentConsolePlanTodoItem[]>;
    normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Merges todo/plan items across related sessions (thread or project scope).
 * Prefers active (`pending`/`in_progress`) todos over completed-only sets,
 * tracks the source session of the merged result, and clears the plan panel
 * when nothing usable is found. Returns `null` when the panel should stay
 * untouched (session switched mid-flight) or was cleared.
 */
export async function mergeTodoPlanForSessionsView(
    host: TodoPlanCommandHost,
    sessionId: string,
    sessions: Array<{ id: string; updatedAt?: number }>
): Promise<{ todos: AgentConsolePlanTodoItem[]; sourceSessionId?: string } | null> {
    if (!host.appRpc) {
        const todos = await host.loadLocalTodoPlan(sessionId);
        if (sessionId !== host.state.sessionId) {
            return null;
        }
        if (!todos.length) {
            host.state.clearPlanTodos();
            return null;
        }
        return { todos, sourceSessionId: sessionId };
    }
    const relatedSessions = sessions
        .slice()
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
    const plans = await loadTodoPlans(host, relatedSessions);
    const merged = new Map<string, { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>();
    let latestAnyTodoSessionId: string | undefined;
    let latestActiveTodoSessionId: string | undefined;
    for (const value of plans) {
        const todos = value.todos.map((item: any) => ({
            id: String(item?.id || '').trim(),
            content: String(item?.content || '').trim(),
            status: host.normalizeTodoStatus(item?.status)
        })).filter((item: any) => !!item.id && !!item.content);
        if (!todos.length) {
            continue;
        }
        latestAnyTodoSessionId ||= value.sessionId;
        if (!latestActiveTodoSessionId && todos.some((todo: any) => todo.status === 'pending' || todo.status === 'in_progress')) {
            latestActiveTodoSessionId = value.sessionId;
        }
        for (const todo of todos) {
            if (!merged.has(todo.id)) {
                merged.set(todo.id, todo);
            }
        }
    }
    const activeTodos = Array.from(merged.values()).filter(todo => todo.status === 'pending' || todo.status === 'in_progress');
    const nextTodos = activeTodos.length ? activeTodos : Array.from(merged.values());
    const sourceSessionId = activeTodos.length
        ? latestActiveTodoSessionId || latestAnyTodoSessionId
        : latestAnyTodoSessionId;
    if (sessionId !== host.state.sessionId) {
        return null;
    }
    if (!nextTodos.length) {
        host.state.clearPlanTodos();
        return null;
    }
    return { todos: nextTodos, sourceSessionId: sourceSessionId || sessionId };
}

/**
 * Read the todo plans of the related sessions.
 *
 * One batched RPC replaces the previous per-session `todo.get` fan-out, which
 * kept a long-lived workspace's session open blank for ~16s (222 sessions).
 * Older gateways without `todo.get_many` fall back to the per-session calls.
 */
async function loadTodoPlans(
    host: TodoPlanCommandHost,
    sessions: Array<{ id: string; updatedAt?: number }>
): Promise<Array<{ sessionId: string; todos: any[] }>> {
    const rpc = host.appRpc!;
    if (sessions.length > 1) {
        const batch = await rpc.request('todo.get_many', { sessionIds: sessions.map(session => session.id) })
            .catch(() => null);
        if (batch && batch.plans && typeof batch.plans === 'object') {
            return sessions.map(session => ({
                sessionId: session.id,
                todos: Array.isArray(batch.plans[session.id]) ? batch.plans[session.id] : []
            }));
        }
    }
    const results = await Promise.allSettled(sessions.map(async session => ({
        sessionId: session.id,
        result: await rpc.request('todo.get', { sessionId: session.id })
    })));
    return results
        .filter((entry): entry is PromiseFulfilledResult<{ sessionId: string; result: any }> => entry.status === 'fulfilled')
        .map(entry => ({
            sessionId: entry.value.sessionId,
            todos: Array.isArray(entry.value.result?.todos) ? entry.value.result.todos : []
        }));
}