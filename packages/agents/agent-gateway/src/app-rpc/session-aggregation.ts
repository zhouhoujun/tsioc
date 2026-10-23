/**
 * Aggregation helpers for the console's session-open path.
 *
 * Opening (or resuming) a session merges todo plans and coding tasks across
 * every session of the workspace/project. That used to issue one RPC per
 * session: with 222 sessions a resume stayed blank for ~16s, and production
 * workspaces already hold 150+ sessions. These helpers read all sessions in a
 * single RPC; the deps keep the ownership/read logic in `AppRpcServer`.
 */

export interface SessionAggregationDeps {
    /** Throw when the caller may not read the session (same policy as `session.*`). */
    authorize(sessionId: string): Promise<void>;
    /** Current todo plan for one session. */
    readTodoPlan(sessionId: string): Promise<any[]>;
    /** Coding tasks for one session. */
    listCodingTasks(sessionId: string): Promise<any[]>;
    requireSessionId(params: any): string;
}

/** Deduplicated, bounded list of session ids for batched aggregation calls. */
export function sessionIdList(value: unknown, limit = 500): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    for (const entry of value) {
        if (typeof entry === 'string' && entry.trim()) {
            seen.add(entry.trim());
        }
    }
    return Array.from(seen).slice(0, limit);
}

export async function getTodoPlan(params: any, deps: SessionAggregationDeps): Promise<any> {
    const sessionId = deps.requireSessionId(params);
    await deps.authorize(sessionId);
    const todos = await deps.readTodoPlan(sessionId);
    return {
        sessionId,
        todos,
        summary: summarizePlan(todos)
    };
}

export async function getTodoPlans(params: any, deps: SessionAggregationDeps): Promise<any> {
    const sessionIds = sessionIdList(params?.sessionIds);
    const plans: Record<string, any[]> = {};
    await Promise.all(sessionIds.map(async sessionId => {
        try {
            await deps.authorize(sessionId);
            plans[sessionId] = await deps.readTodoPlan(sessionId);
        } catch {
            // A session the caller cannot read is omitted; the client used to
            // skip rejected entries of its per-session allSettled fan-out.
        }
    }));
    return { plans };
}

export async function listCodingTasks(params: any, deps: SessionAggregationDeps): Promise<any> {
    const sessionIds = sessionIdList(params?.sessionIds);
    if (sessionIds.length) {
        const batches = await Promise.all(sessionIds.map(async sessionId => {
            try {
                await deps.authorize(sessionId);
                return (await deps.listCodingTasks(sessionId))
                    .map((task: any) => ({ ...task, sourceSessionId: sessionId }));
            } catch {
                return [] as any[];
            }
        }));
        const tasks = batches.flat();
        return { tasks, total: tasks.length };
    }
    const sessionId = deps.requireSessionId(params);
    await deps.authorize(sessionId);
    const tasks = await deps.listCodingTasks(sessionId);
    return { sessionId, tasks, total: tasks.length };
}

function summarizePlan(todos: any[]): Record<string, number> {
    const summary: Record<string, number> = {
        total: todos.length,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
    };
    for (const todo of todos) {
        const status = String(todo?.status || 'pending');
        summary[status] = (summary[status] || 0) + 1;
    }
    return summary;
}
