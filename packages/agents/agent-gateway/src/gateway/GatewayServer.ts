import * as http from 'http';
import { Inject, Injectable } from '@tsdi/ioc';
import { AgentRuntime } from '@tsdi/agent';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';
import { GatewayRoute } from '../contracts/GatewayRoute';
import { RouteMatcher } from './RouteMatcher';
import { AuthMiddleware } from '../auth/AuthMiddleware';
import { RateLimiter } from '../auth/RateLimiter';

/**
 * Main HTTP gateway server.
 * Mirrors zeroclaw-gateway's run_gateway() — owns the HTTP server,
 * route table, auth, rate limiting, and lifecycle.
 */
@Injectable()
export class GatewayServer {
    private server?: http.Server;
    private matcher = new RouteMatcher();
    private isRunning = false;

    constructor(
        private auth: AuthMiddleware,
        private rateLimiter: RateLimiter,
        private runtime: AgentRuntime,
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {
    }

    /** Register one or more routes */
    addRoutes(routes: GatewayRoute[]): void {
        this.matcher.addMany(routes);
    }

    /** Register a single route */
    addRoute(route: GatewayRoute): void {
        this.matcher.add(route);
    }

    /** Start the HTTP server — equivalent to zeroclaw's run_gateway() */
    async start(options?: Partial<GatewayConfig>): Promise<void> {
        if (this.isRunning) return;
        if (options) this.config = { ...this.config, ...options };

        return new Promise<void>((resolve) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));

            const port = this.config.port ?? defaultGatewayConfig.port!;
            const host = this.config.host ?? defaultGatewayConfig.host!;

            this.server.listen(port, host, () => {
                this.isRunning = true;
                resolve();
            });
        });
    }

    /** Get listen address */
    address(): { port: number; host: string } | null {
        if (!this.server?.listening) return null;
        const addr = this.server.address() as any;
        return { port: addr?.port ?? 0, host: addr?.address ?? '0.0.0.0' };
    }

    /** Check if the server is running */
    get running(): boolean {
        return this.isRunning;
    }

    /** Stop the server */
    async stop(): Promise<void> {
        if (!this.isRunning) return;
        return new Promise((resolve) => {
            this.server?.close(() => {
                this.isRunning = false;
                resolve();
            });
        });
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // CORS preflight
        if (this.config.cors && req.method === 'OPTIONS') {
            this.setCorsHeaders(res);
            res.writeHead(204).end();
            return;
        }

        // Rate limiting by IP
        const ip = req.socket.remoteAddress ?? 'unknown';
        if (!this.rateLimiter.checkAndRespond(ip, res)) return;

        // Parse URL
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const pathname = url.pathname;

        // Route matching
        const matched = this.matcher.match(req.method ?? 'GET', pathname);

        if (!matched) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'not found', path: pathname }));
            return;
        }

        // Auth check
        if (matched.route.auth !== false) {
            if (!await this.auth.authenticate(req, res)) return;
        }

        // CORS headers
        if (this.config.cors) {
            this.setCorsHeaders(res);
        }

        try {
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                const body = await this.readBody(req);
                let parsed: any;
                const ct = req.headers['content-type'] ?? '';
                if (ct.includes('application/json')) {
                    try { parsed = JSON.parse(body.toString()); } catch { parsed = body.toString(); }
                } else {
                    parsed = body.toString();
                }
                await matched.route.handler(req, res, matched.params, parsed);
            } else {
                await matched.route.handler(req, res, matched.params);
            }
        } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: err?.message ?? 'internal server error' }));
        }
    }

    private setCorsHeaders(res: http.ServerResponse): void {
        const origins = this.config.corsOrigins ?? ['*'];
        res.setHeader('Access-Control-Allow-Origin', origins[0] === '*' ? '*' : origins.join(', '));
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    private readBody(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
}
