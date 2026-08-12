import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { Runner } from '@tsdi/core';
import { GatewayServer } from './GatewayServer';
import { HealthHandler } from '../api/HealthHandler';
import { SessionHandler } from '../api/SessionHandler';
import { MemoryHandler } from '../api/MemoryHandler';
import { ToolsHandler } from '../api/ToolsHandler';
import { ApprovalHandler } from '../api/ApprovalHandler';
import { StatsHandler } from '../api/StatsHandler';
import { EventHandler } from '../api/EventHandler';
import { ReviewHandler } from '../api/ReviewHandler';
import { EvalHandler } from '../api/EvalHandler';
import { AppRpcHandler } from '../api/AppRpcHandler';
import { ChatWebSocket } from '../ws/ChatWebSocket';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

/**
 * Auto-registers gateway routes from all handlers on application startup,
 * then starts the HTTP server.
 *
 * Mirrors hermes-agent's gateway/run.py Gateway startup sequence and
 * zeroclaw's gateway orchestrator which collects routes from channel adapters.
 */
@Injectable()
export class GatewayBootstrap {
    constructor(
        private gateway: GatewayServer,
        private health: HealthHandler,
        private sessions: SessionHandler,
        private memory: MemoryHandler,
        private tools: ToolsHandler,
        @Optional() private approvals?: ApprovalHandler | null,
        @Optional() private stats?: StatsHandler | null,
        @Optional() private rpc?: AppRpcHandler | null,
        @Optional() private events?: EventHandler | null,
        @Optional() private reviews?: ReviewHandler | null,
        @Optional() private evals?: EvalHandler | null,
        @Optional() private chatWs?: ChatWebSocket | null,
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {
    }

    @Runner()
    async start(): Promise<void> {
        // Collect routes from all handlers
        const allRoutes = [
            ...this.health.getRoutes(),
            ...this.sessions.getRoutes(),
            ...this.memory.getRoutes(),
            ...this.tools.getRoutes(),
            ...(this.approvals?.getRoutes() ?? []),
            ...(this.stats?.getRoutes() ?? []),
            ...(this.rpc?.getRoutes() ?? []),
            ...(this.events?.getRoutes() ?? []),
            ...(this.reviews?.getRoutes() ?? []),
            ...(this.evals?.getRoutes() ?? []),
            ...(this.chatWs?.getRoutes() ?? [])
        ];

        this.gateway.addRoutes(allRoutes);
        this.gateway.addRoute({
            method: 'GET', path: '/openapi.json', auth: false,
            handler: async (_req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.gateway.openApiDocument()));
            }
        });

        // Start the HTTP server
        await this.gateway.start(this.config);
    }
}
