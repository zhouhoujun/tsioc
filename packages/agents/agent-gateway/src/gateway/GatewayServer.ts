import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import { Inject, Injectable } from '@tsdi/ioc';
import { AgentRuntime } from '@tsdi/agent';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';
import { GatewayRoute } from '../contracts/GatewayRoute';
import { RouteMatcher } from './RouteMatcher';
import { AuthMiddleware, getRequestPrincipalId } from '../auth/AuthMiddleware';
import { RateLimiter } from '../auth/RateLimiter';
import { buildOpenApiDocument } from './OpenApiDocument';

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

    /** Return the OpenAPI document for the currently registered routes. */
    openApiDocument(): ReturnType<typeof buildOpenApiDocument> {
        return buildOpenApiDocument(this.matcher.getRoutes());
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
            if (await this.tryServeStatic(req, res, pathname)) {
                return;
            }
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
            req.on('end', () => resolve(Buffer.concat(chunks as Uint8Array[])));
        });
    }

    private static readonly MIME_TYPES: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.txt': 'text/plain; charset=utf-8'
    };

    private async tryServeStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
        const staticDir = this.config.staticDir;
        if (req.method !== 'GET' || !staticDir) {
            return false;
        }
        const root = path.resolve(staticDir);
        const decoded = decodeURIComponent(pathname);
        const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
        const resolved = path.resolve(root, relative);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'forbidden', path: pathname }));
            return true;
        }
        let stat: fs.Stats;
        try {
            stat = await fs.promises.stat(resolved);
        } catch {
            return false;
        }
        if (stat.isDirectory()) {
            const indexPath = path.join(resolved, 'index.html');
            try {
                stat = await fs.promises.stat(indexPath);
            } catch {
                return false;
            }
            return this.writeStaticFile(res, indexPath, stat);
        }
        if (!stat.isFile()) {
            return false;
        }
        return this.writeStaticFile(res, resolved, stat);
    }

    private async writeStaticFile(res: http.ServerResponse, filePath: string, stat: fs.Stats): Promise<boolean> {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = GatewayServer.MIME_TYPES[ext] ?? 'application/octet-stream';
        try {
            const content = await fs.promises.readFile(filePath);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stat.size,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
            return true;
        } catch {
            return false;
        }
    }
}
