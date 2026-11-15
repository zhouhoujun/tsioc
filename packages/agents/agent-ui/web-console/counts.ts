export interface AgentConsoleAttentionCountHost {
    request(method: string, params?: any): Promise<any>;
    sessionId(): string;
    pendingQuestions(): number;
    queuedPrompts(): number;
}

/**
 * Cross-session attention counters for the agent-center sidebar:
 * pending approvals (all sessions), failed/running background tasks below the
 * current delegation root, current questions and queued prompts.
 */
export async function loadAgentConsoleAttentionCounts(
    host: AgentConsoleAttentionCountHost
): Promise<{ work: number; inbox: number }> {
    const [approvals, tasks] = await Promise.all([
        host.request('approval.list', {}).catch(() => null),
        host.request('background_task.list', { delegationRoot: host.sessionId(), limit: 500 }).catch(() => null)
    ]);
    const items = Array.isArray(tasks?.items) ? tasks.items : [];
    const failed = items.filter((task: any) => String(task?.status) === 'failed').length;
    const work = items.filter((task: any) =>
        String(task?.status) === 'running' || String(task?.status) === 'queued').length;
    const inbox = (Array.isArray(approvals?.requests) ? approvals.requests.length : 0)
        + failed
        + Math.max(0, host.pendingQuestions())
        + (host.queuedPrompts() > 0 ? 1 : 0);
    return { work, inbox };
}
