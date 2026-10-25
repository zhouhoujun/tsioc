import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export async function collectHealthItems(
    appRpc: any,
    rpcRequestContext: () => any,
    state: any,
    translator?: AgentUiTranslator | null
): Promise<any[]> {
    const items: any[] = [];
    if (appRpc) {
        try {
            await appRpc.request('app.state', undefined, rpcRequestContext());
            items.push({ id: 'gateway', label: 'Gateway', status: 'ok', detail: formatAgentUiNotice(translator, 'healthGatewayConnected') });
        } catch {
            items.push({ id: 'gateway', label: 'Gateway', status: 'error', detail: formatAgentUiNotice(translator, 'healthGatewayUnreachable') });
        }
    } else {
        items.push({ id: 'gateway', label: 'Gateway', status: 'unknown', detail: formatAgentUiNotice(translator, 'healthGatewayLocal') });
    }
    const mcpServers = new Map<string, { total: number; active: number }>();
    const lspTools: string[] = [];
    for (const tool of state.tools) {
        if (tool.name.startsWith('mcp.')) {
            const parts = tool.name.split('.');
            const serverId = parts[1] || 'unknown';
            const entry = mcpServers.get(serverId) || { total: 0, active: 0 };
            entry.total += 1;
            if (tool.active) entry.active += 1;
            mcpServers.set(serverId, entry);
        } else if (tool.name.startsWith('lsp_')) {
            lspTools.push(tool.name);
        }
    }
    if (mcpServers.size) {
        mcpServers.forEach((stats, serverId) => {
            items.push({
                id: `mcp:${serverId}`,
                label: `MCP ${serverId}`,
                status: stats.active === 0 ? 'error' : (stats.active === stats.total ? 'ok' : 'warn'),
                detail: formatAgentUiNotice(translator, 'healthMcpToolsActive', { active: stats.active, total: stats.total })
            });
        });
    } else {
        items.push({ id: 'mcp', label: 'MCP', status: 'unknown', detail: formatAgentUiNotice(translator, 'healthNoMcpServers') });
    }
    items.push(lspTools.length
        ? { id: 'lsp', label: 'LSP', status: 'ok', detail: formatAgentUiNotice(translator, 'healthLspTools', { count: lspTools.length }) }
        : { id: 'lsp', label: 'LSP', status: 'unknown', detail: formatAgentUiNotice(translator, 'healthNoLspTools') });
    return items;
}
