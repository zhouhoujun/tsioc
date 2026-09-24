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
    const results = await Promise.allSettled(relatedSessions.map(async session => ({
        sessionId: session.id,
        updatedAt: session.updatedAt || 0,
        result: await host.appRpc!.request('todo.get', { sessionId: session.id })
    })));
    const merged = new Map<string, { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>();
    let latestAnyTodoSessionId: string | undefined;
    let latestActiveTodoSessionId: string | undefined;
    for (const entry of results) {
        if (entry.status !== 'fulfilled') {
            continue;
        }
        const value = entry.value;
        const todos = Array.isArray(value.result?.todos)
            ? value.result.todos.map((item: any) => ({
                id: String(item?.id || '').trim(),
                content: String(item?.content || '').trim(),
                status: host.normalizeTodoStatus(item?.status)
            })).filter((item: any) => !!item.id && !!item.content)
            : [];
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