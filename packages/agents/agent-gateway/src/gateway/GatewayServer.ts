import * as http from 'http';
import { Buffer } from 'buffer';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { Dispose } from '@tsdi/core';
import { AgentRuntime } from '@tsdi/agent';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';
import { GatewayRoute } from '../contracts/GatewayRoute';
import { RouteMatcher } from './RouteMatcher';
import { AuthMiddleware, getRequestPrincipalId } from '../auth/AuthMiddleware';
import { RateLimiter } from '../auth/RateLimiter';
import { buildOpenApiDocument } from './OpenApiDocument';
import { MdnsServiceDiscovery } from '../discovery/MdnsServiceDiscovery';
import {
    applyGatewayCorsHeaders,
    handleGatewayCorsPreflight,
    sendGatewayError,
    serveGatewayStaticFile
} from '@tsdi/gateway-kit';

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
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig,
        @Optional() @Inject(MdnsServiceDiscovery) private mdns?: MdnsServiceDiscovery | null
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

    /** Return the OpenAPI document for the currently registered routes. */
    openApiDocument(): ReturnType<typeof buildOpenApiDocument> {
        return buildOpenApiDocument(this.matcher.getRoutes());
    }

    /** Start the HTTP server — equivalent to zeroclaw's run_gateway() */
    async start(options?: Partial<GatewayConfig>): Promise<void> {
        if (this.isRunning) return;
        if (options) this.config = { ...this.config, ...options };

        return new Promise<void>((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));

            const port = this.config.port ?? defaultGatewayConfig.port!;
            const host = this.config.host ?? defaultGatewayConfig.host!;

            this.server.once('error', reject);
            this.server.listen(port, host, async () => {
                this.server?.removeListener('error', reject);
                this.isRunning = true;
                try {
                    if (this.config.mdns && this.mdns) {
                        const address = this.address()!;
                        await this.mdns.advertise({
                            port: address.port,
                            host: host === '0.0.0.0' ? undefined : host,
                            serviceType: this.config.mdnsServiceType,
                            domain: this.config.mdnsDomain,
                            name: this.config.mdnsName
                        });
                    }
                    resolve();
                } catch (error) {
                    this.server?.close(() => undefined);
                    this.isRunning = false;
                    reject(error);
                }
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

    /** Close the listener when the application context is disposed. */
    @Dispose()
    protected async onDispose(): Promise<void> {
        await this.stop();
    }

    /** Stop the server */
    async stop(): Promise<void> {
        if (!this.isRunning) return;
        await this.mdns?.stop();
        return new Promise((resolve) => {
            this.server?.close(() => {
                this.isRunning = false;
                resolve();
            });
        });
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // CORS preflight
        if (this.config.cors && handleGatewayCorsPreflight(req.method, res, { origins: this.config.corsOrigins })) {
            return;
        }

        // Parse URL
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const pathname = url.pathname;

        // Route matching
        const matched = this.matcher.match(req.method ?? 'GET', pathname);

        if (!matched) {
            // The static shell is public and must always load: limiting it made
            // browsers render a blank page after a few refreshes (429 on CSS/JS).
            if (await this.tryServeStatic(req, res, pathname)) {
                return;
            }
            sendGatewayError(res, 404, 'not found', { extra: { path: pathname } });
            return;
        }

        // Rate limiting by IP (API routes only)
        const ip = req.socket.remoteAddress ?? 'unknown';
        if (!this.rateLimiter.checkAndRespond(ip, res)) return;

        // Auth check
        if (matched.route.auth !== false) {
            if (!await this.auth.authenticate(req, res)) return;
        }

        // CORS headers
        if (this.config.cors) {
            applyGatewayCorsHeaders(res, { origins: this.config.corsOrigins });
        }

        try {
            const state = { principalId: getRequestPrincipalId(req) };
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                const body = await this.readBody(req);
                let parsed: any;
                const ct = req.headers['content-type'] ?? '';
                if (ct.includes('application/json')) {
                    try { parsed = JSON.parse(body.toString()); } catch { parsed = body.toString(); }
                } else {
                    parsed = body.toString();
                }
                await matched.route.handler(req, res, matched.params, parsed, state);
            } else {
                await matched.route.handler(req, res, matched.params, undefined, state);
            }
        } catch (err: any) {
            sendGatewayError(res, 500, err?.message ?? 'internal server error');
        }
    }

    /** Serve a public static asset (the console shell is never rate limited). */
    protected async tryServeStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
        if (!this.config.staticDir) {
            return false;
        }
        const result = await serveGatewayStaticFile(req, res, this.config.staticDir, pathname);
        if (result === 'forbidden') {
            sendGatewayError(res, 403, 'forbidden', { extra: { path: pathname } });
            return true;
        }
        return result === 'served';
    }

    private readBody(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks as Uint8Array[])));
        });
    }
}
