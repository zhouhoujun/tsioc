import { Inject, Injectable } from '@tsdi/ioc';
import { AGENT_TOOL_BUNDLES, AgentCapabilityBundle, ToolRegistry } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

/**
 * Tools listing API — GET /api/tools.
 * Mirrors zeroclaw-gateway's handle_api_tools.
 */
@Injectable()
export class ToolsHandler {
    constructor(
        private toolRegistry: ToolRegistry,
        @Inject(AGENT_TOOL_BUNDLES, { defaultValue: [] }) private bundles: AgentCapabilityBundle[] = []
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const normalizeTool = (t: any) => ({
            name: t.name,
            description: t.description,
            toolset: t.toolset ?? null,
            source: t.source ?? null,
            execution: t.execution ?? null,
            inputSchema: t.inputSchema ?? null,
            outputSchema: t.outputSchema ?? null,
            canonicalName: t.canonicalName ?? null,
            aliases: t.aliases ?? null,
            tags: t.tags ?? null,
            activation: t.activation ?? null,
            provenance: t.provenance ?? null
        });
        const mcpListTool = () => this.toolRegistry.getToolDefinition('mcp.list_tools');
        const mcpCallTool = () => this.toolRegistry.getToolDefinition('mcp.call_tool');
        const normalizeTools = () => this.toolRegistry.getToolDefinitions().map(normalizeTool);
        const normalizeBundles = () => this.bundles.map(bundle => ({
            name: bundle.name,
            description: bundle.description ?? null,
            tools: bundle.tools.slice(),
            defaultEnabled: bundle.defaultEnabled ?? false,
            deferredActivation: bundle.deferredActivation ?? false,
            enabled: bundle.enabled ?? false,
            source: bundle.source ?? null,
            providerId: bundle.providerId ?? null,
            activation: bundle.activation ?? null,
            sessionScoped: bundle.sessionScoped ?? false
        }));
        const listTools: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(normalizeTools()));
        };
        const listBundles: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(normalizeBundles()));
        };
        const listMcpTools: RouteHandler = async (req, res) => {
            const url = new URL(req.url ?? '/api/mcp/tools', `http://${req.headers?.host ?? 'localhost'}`);
            const serverId = url.searchParams.get('serverId')?.trim();
            if (!serverId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'serverId is required.' }));
                return;
            }
            const listTool = mcpListTool();
            if (!listTool) {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'MCP discovery is not configured.' }));
                return;
            }
            const callTool = mcpCallTool();
            try {
                const discovered = await this.toolRegistry.invoke(listTool.name, { serverId }, '__gateway__');
                const tools = Array.isArray(discovered?.tools)
                    ? discovered.tools.map((tool: any) => normalizeTool({
                        name: tool.fullName,
                        description: tool.description,
                        toolset: tool.toolset,
                        source: tool.source,
                        execution: callTool?.execution ?? null,
                        inputSchema: tool.inputSchema,
                        canonicalName: tool.name,
                        aliases: null,
                        tags: ['mcp', serverId],
                        activation: { kind: 'deferred', scope: 'session', activated: false },
                        provenance: {
                            origin: 'mcp',
                            providerId: listTool.provenance?.providerId ?? callTool?.provenance?.providerId ?? null,
                            serverId,
                            sessionScoped: true
                        }
                    }))
                    : [];
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify(tools));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'MCP discovery failed.';
                const lowered = message.toLowerCase();
                const status = lowered.includes('not configured') || lowered.includes('not found')
                    ? 404
                    : lowered.includes('unavailable') || lowered.includes('timed out')
                        ? 503
                        : 502;
                res.writeHead(status, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: message }));
            }
        };

        return [
            { method: 'GET', path: '/api/tools', handler: listTools },
            { method: 'GET', path: '/api/tool-bundles', handler: listBundles },
            { method: 'GET', path: '/api/mcp/tools', handler: listMcpTools }
        ];
    }
}
