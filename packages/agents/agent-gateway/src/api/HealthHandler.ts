import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { ExchangeMetrics } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { GatewayServer } from '../gateway/GatewayServer';

/**
 * Health check endpoints — GET /health, GET /api/health.
 * Mirrors zeroclaw-gateway's handle_health / handle_api_health.
 */
@Injectable()
export class HealthHandler {
    constructor(
        private gateway: GatewayServer,
        @Optional() @Inject(ExchangeMetrics) private metrics?: ExchangeMetrics | null
    ) {
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
                    node: process.version,
                    exchange: this.metrics?.snapshot() ?? { dropped: 0, stale: 0, duplicate: 0, unauthorized: 0 }
                }));
        };

        return [
            { method: 'GET', path: '/health', handler: simple },
            { method: 'GET', path: '/api/health', handler: detailed }
        ];
    }
}
