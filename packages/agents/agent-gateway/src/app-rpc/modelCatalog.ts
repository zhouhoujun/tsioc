import { AgentOptions, fetchAgentModelCatalog } from '@tsdi/agent';

export async function resolveModelCatalog(options: AgentOptions | undefined, provider?: string): Promise<{
    provider: string;
    source: string;
    routingSupported: boolean;
    models: Array<{ id: string; name?: string; effort?: unknown }>;
}> {
    const model = options?.model || {};
    const catalog = await fetchAgentModelCatalog({
        baseUrl: String(model.baseUrl || ''),
        apiKey: model.apiKey,
        apiKeyEnv: model.apiKeyEnv,
        timeoutMs: model.timeoutMs
    });
    return {
        provider: catalog.provider || String(provider || model.provider || '').trim(),
        source: catalog.source,
        routingSupported: false,
        models: catalog.models.map(entry => ({ id: entry.id, name: entry.name, effort: entry.effort }))
    };
}
