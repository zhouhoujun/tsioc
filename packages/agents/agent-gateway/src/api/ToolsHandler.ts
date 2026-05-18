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
        const normalizeTools = () => this.toolRegistry.getToolDefinitions().map(t => ({
            name: t.name,
            description: t.description,
            toolset: t.toolset ?? null,
            source: t.source ?? null,
            execution: t.execution ?? null,
            inputSchema: t.inputSchema ?? null
        }));
        const normalizeBundles = () => this.bundles.map(bundle => ({
            name: bundle.name,
            description: bundle.description ?? null,
            tools: bundle.tools.slice(),
            defaultEnabled: bundle.defaultEnabled ?? false,
            deferredActivation: bundle.deferredActivation ?? false,
            enabled: bundle.enabled ?? false
        }));
        const listTools: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(normalizeTools()));
        };
        const listBundles: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(normalizeBundles()));
        };

        return [
            { method: 'GET', path: '/api/tools', handler: listTools },
            { method: 'GET', path: '/api/tool-bundles', handler: listBundles }
        ];
    }
}
