export interface AgentConsoleMentionsHost {
    appRpc?: any;
    toolRegistry?: any;
    state: any;
    rpcRequestContext(): any;
    setMentionCatalog(catalog: any[]): void;
}

export async function refreshMentionCatalog(host: AgentConsoleMentionsHost): Promise<void> {
    const invoke = async (name: string, input: any): Promise<any> => {
        if (host.appRpc) {
            const result = await host.appRpc.request('tools.invoke', { sessionId: host.state.sessionId, name, input }, host.rpcRequestContext());
            return result?.output;
        }
        if (!host.toolRegistry || typeof host.toolRegistry.invoke !== 'function') return undefined;
        return host.toolRegistry.invoke(name, input, host.state.sessionId, undefined, host.state.workspace);
    };
    const [skillResult, pluginResult] = await Promise.all([
        invoke('skill_list', {}).catch(() => undefined),
        invoke('plugins', { action: 'list' }).catch(() => undefined)
    ]);
    const catalog = [
        ...(Array.isArray(skillResult?.skills) ? skillResult.skills : []).map((skill: any) => ({
            kind: 'skill' as const,
            id: String(skill.id || ''),
            title: String(skill.title || skill.id || ''),
            description: String(skill.summary || '')
        })),
        ...(Array.isArray(pluginResult?.plugins) ? pluginResult.plugins : []).map((plugin: any) => ({
            kind: 'plugin' as const,
            id: String(plugin.id || ''),
            title: String(plugin.manifest?.name || plugin.id || ''),
            description: String(plugin.manifest?.description || ''),
            scope: String(plugin.scope || '')
        }))
    ].filter(item => item.id);
    host.setMentionCatalog(catalog);
}
