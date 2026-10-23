/**
 * Coding-task loading for the project aggregation the console runs on session
 * open.
 *
 * `coding_task.list` used to be issued once per session of the workspace; with
 * a long-lived project (222 sessions in a test workspace) resuming a session
 * stayed blank for ~16s. The batched call returns every task with its
 * `sourceSessionId`; older gateways fall back to the per-session fan-out.
 */

export interface CodingTaskListRpc {
    request(method: string, params?: any, context?: any): Promise<any>;
}

export async function loadProjectCodingTasks(
    rpc: CodingTaskListRpc,
    sessionIds: string[]
): Promise<any[]> {
    if (sessionIds.length > 1) {
        const batch = await rpc.request('coding_task.list', { sessionIds }).catch(() => null);
        if (batch && Array.isArray(batch.tasks)) {
            return batch.tasks.map((task: any) => ({
                ...task,
                sourceSessionId: task?.sourceSessionId || task?.sessionId || ''
            }));
        }
    }
    const responses = await Promise.allSettled(sessionIds.map(async sessionId => {
        const result = await rpc.request('coding_task.list', { sessionId });
        return (Array.isArray(result?.tasks) ? result.tasks : []).map((task: any) => ({
            ...task,
            sourceSessionId: sessionId
        }));
    }));
    return responses.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}
