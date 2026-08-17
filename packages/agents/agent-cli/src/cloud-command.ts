export interface AgentCloudCommandOptions {
    gatewayUrl?: string;
    token?: string;
    session?: string;
    profile?: string;
    source?: string;
    externalId?: string;
    json?: boolean;
}

export type AgentCloudFetch = (input: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export async function callAgentCloudRpc(
    method: string,
    params: any,
    options: AgentCloudCommandOptions = {},
    fetcher: AgentCloudFetch = (globalThis as any).fetch
): Promise<any> {
    const baseUrl = String(options.gatewayUrl || process.env.TSDI_AGENT_GATEWAY_URL || 'http://127.0.0.1:4317').replace(/\/$/, '');
    if (typeof fetcher !== 'function') throw new Error('Cloud commands require a fetch-compatible runtime.');
    const token = String(options.token || process.env.TSDI_AGENT_GATEWAY_TOKEN || '').trim();
    const response = await fetcher(`${baseUrl}/rpc`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
    });
    const payload = await response.json();
    if (!response.ok || payload?.error) {
        throw new Error(payload?.error?.message || `Gateway request failed (${response.status}).`);
    }
    return payload?.result;
}

export async function runAgentCloudAction(
    action: 'run' | 'list' | 'status' | 'cancel' | 'apply',
    value: string | undefined,
    options: AgentCloudCommandOptions = {},
    fetcher?: AgentCloudFetch,
    output: (line: string) => void = console.log
): Promise<any> {
    const method = action === 'run' ? 'cloud.task.submit'
        : action === 'list' ? 'cloud.task.list'
            : action === 'status' ? 'cloud.task.get'
                : action === 'cancel' ? 'cloud.task.cancel'
                    : 'cloud.task.apply';
    const params = action === 'run'
        ? { prompt: value, sessionId: options.session, profile: options.profile, source: options.source, externalId: options.externalId }
        : action === 'list' ? {} : { taskId: value };
    const result = await callAgentCloudRpc(method, params, options, fetcher);
    if (options.json) {
        output(JSON.stringify(result, null, 2));
        return result;
    }
    const tasks = Array.isArray(result?.tasks) ? result.tasks : result?.task ? [result.task] : [];
    if (!tasks.length) {
        output('No cloud tasks.');
        return result;
    }
    for (const task of tasks) {
        output(`${task.id} · ${task.status} · session ${task.sessionId}${task.error ? ` · ${task.error}` : ''}`);
        if (action === 'apply' && task.result?.message?.content) output(String(task.result.message.content));
    }
    return result;
}
