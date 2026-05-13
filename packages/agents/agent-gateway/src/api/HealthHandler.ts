import { Injectable } from '@tsdi/ioc';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { GatewayServer } from '../gateway/GatewayServer';

/**
 * Health check endpoints — GET /health, GET /api/health.
 * Mirrors zeroclaw-gateway's handle_health / handle_api_health.
 */
@Injectable()
export class HealthHandler {
    constructor(private gateway: GatewayServer) {
    }

    getRoutes(): GatewayRoute[] {
        const simple: RouteHandler = async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ status: 'ok' }));
        };

        const detailed: RouteHandler = async (_req, res) => {
            const addr = this.gateway.address();
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({
                    gateway: 'running',
                    uptime: process.uptime(),
                    address: addr,
                    node: process.version
                }));
        };

        return [
            { method: 'GET', path: '/health', handler: simple },
            { method: 'GET', path: '/api/health', handler: detailed }
        ];
    }
}
