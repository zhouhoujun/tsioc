export interface ToolsRefreshHost {
    state: any;
    appRpc?: any;
    toolRegistry?: any;
    loadTools(sessionId: string): Promise<any[]>;
}

export async function refreshTools(host: ToolsRefreshHost, sessionId = host.state.sessionId): Promise<void> {
    const definitions = await host.loadTools(sessionId);
    if (!definitions.length) {
        if (sessionId === host.state.sessionId) {
            host.state.setTools([]);
        }
        return;
    }
    const tools = await Promise.all(definitions.map(async (def: any) => {
        const active = host.appRpc
            ? def.activation?.activated ?? true
            : host.toolRegistry && typeof host.toolRegistry.isToolActive === 'function'
            ? await host.toolRegistry.isToolActive(sessionId, def.name)
            : def.activation?.activated ?? true;
        return host.state.toToolItem(def, active);
    }));
    tools.sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (sessionId !== host.state.sessionId) {
        return;
    }
    host.state.setTools(tools);
}
