import { Injectable } from '@tsdi/ioc';
import { ToolRegistry } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

/**
 * Tools listing API — GET /api/tools.
 * Mirrors zeroclaw-gateway's handle_api_tools.
 */
@Injectable()
export class ToolsHandler {
    constructor(private toolRegistry: ToolRegistry) {
    }

    getRoutes(): GatewayRoute[] {
        const listTools: RouteHandler = async (_req, res) => {
            const tools = this.toolRegistry.getTools().map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(tools));
        };

        return [
            { method: 'GET', path: '/api/tools', handler: listTools }
        ];
    }
}
