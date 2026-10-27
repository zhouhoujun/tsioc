import { Inject, Injectable, Optional, Injector, INJECTOR } from '@tsdi/ioc';
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
import { ShareHandler } from '../api/ShareHandler';
import { PairHandler } from '../api/PairHandler';
import { AppRpcHandler } from '../api/AppRpcHandler';
import { ChatWebSocket } from '../ws/ChatWebSocket';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';
import { ApprovalWebhookNotifier } from '../approval/ApprovalWebhookNotifier';

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
        @Optional() @Inject(ApprovalHandler) private approvals?: ApprovalHandler | null,
        @Optional() @Inject(StatsHandler) private stats?: StatsHandler | null,
        @Optional() @Inject(AppRpcHandler) private rpc?: AppRpcHandler | null,
        @Optional() @Inject(EventHandler) private events?: EventHandler | null,
        @Optional() @Inject(ReviewHandler) private reviews?: ReviewHandler | null,
        @Optional() @Inject(EvalHandler) private evals?: EvalHandler | null,
        @Optional() @Inject(ShareHandler) private shares?: ShareHandler | null,
        @Optional() @Inject(ChatWebSocket) private chatWs?: ChatWebSocket | null,
        @Optional() @Inject(INJECTOR) private injector?: Injector | null,
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig,
        /** Instantiated so its approval webhook subscription is active. */
        @Optional() @Inject(ApprovalWebhookNotifier) private approvalWebhook?: ApprovalWebhookNotifier | null,
        @Optional() @Inject(PairHandler) private pair?: PairHandler | null
    ) {
    }

    /**
     * Resolve an optional collaborator lazily. A constructor `@Optional`
     * injection can be nulled by a DI-order miss even though the provider IS
     * registered later — which silently dropped its routes. Re-resolve from the
     * injector at start() time, falling back to the injected value.
     */
    private optionalHandler<T>(ctor: any, injected?: T | null): T | null {
        try {
            const resolved = this.injector?.get(ctor, null as any);
            return (resolved as T | null) ?? injected ?? null;
        } catch {
            return injected ?? null;
        }
    }

    @Runner()
    async start(): Promise<void> {
        const approvals = this.optionalHandler(ApprovalHandler, this.approvals);
        const stats = this.optionalHandler(StatsHandler, this.stats);
        const rpc = this.optionalHandler(AppRpcHandler, this.rpc);
        const events = this.optionalHandler(EventHandler, this.events);
        const reviews = this.optionalHandler(ReviewHandler, this.reviews);
        const evals = this.optionalHandler(EvalHandler, this.evals);
        const shares = this.optionalHandler(ShareHandler, this.shares);
        const chatWs = this.optionalHandler(ChatWebSocket, this.chatWs);
        const pair = this.optionalHandler(PairHandler, this.pair);

        // Collect routes from all handlers
        const allRoutes = [
            ...this.health.getRoutes(),
            ...this.sessions.getRoutes(),
            ...this.memory.getRoutes(),
            ...this.tools.getRoutes(),
            ...(approvals?.getRoutes() ?? []),
            ...(stats?.getRoutes() ?? []),
            ...(rpc?.getRoutes() ?? []),
            ...(events?.getRoutes() ?? []),
            ...(reviews?.getRoutes() ?? []),
            ...(evals?.getRoutes() ?? []),
            ...(shares?.getRoutes() ?? []),
            ...(pair?.getRoutes() ?? []),
            ...(chatWs?.getRoutes() ?? [])
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
