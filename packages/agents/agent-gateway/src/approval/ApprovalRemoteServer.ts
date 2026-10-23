import * as http from 'http';
import { AddressInfo } from 'net';
import { ApprovalManager } from '@tsdi/agent';
import { HttpAuthService } from '@tsdi/security';
import { ApprovalHandler } from '../api/ApprovalHandler';
import { AuthMiddleware, parseApproverTokens } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { GatewayApproverToken } from '../contracts/GatewayConfig';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

export interface ApprovalRemoteServerOptions {
    /** In-process approval queue (the shared runtime manager). */
    manager: ApprovalManager;
    /** Ownership checks for owner tokens; approver tokens bypass them. */
    owners?: SessionOwnerStore | null;
    /** Listen port; `0` picks a free port. */
    port: number;
    /** Bind host; defaults to loopback only. */
    host?: string;
    /** Owner bearer token. */
    authToken?: string;
    /** Dedicated approver tokens. */
    approvers?: GatewayApproverToken[];
}

export interface ApprovalRemoteServerHandle {
    host: string;
    port: number;
    close(): Promise<void>;
}

/**
 * Minimal approval HTTP endpoint for a TUI-hosted session.
 *
 * `tsdi-agent chat` keeps approvals inside its process, so a third party cannot
 * reach them without a gateway. This server exposes only
 * `GET /api/approvals` and `POST /api/approvals/:id/approve|reject` (plus
 * `/health`) on loopback, using the same shared `ApprovalManager`.
 *
 * Refuses to start without an owner token or approver token: an unauthenticated
 * approval API would let any local process approve tool calls.
 */
export async function startApprovalRemoteServer(options: ApprovalRemoteServerOptions): Promise<ApprovalRemoteServerHandle> {
    const host = String(options.host || '127.0.0.1').trim() || '127.0.0.1';
    const authToken = String(options.authToken || '').trim();
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const approvers = (options.approvers?.length ? options.approvers : parseApproverTokens(env?.TSDI_AGENT_APPROVER_TOKENS))
        .filter(approver => approver?.token);
    if (!authToken && !approvers.length) {
        throw new Error('Remote approvals need a token: pass --gateway-token <token> or set TSDI_AGENT_APPROVER_TOKENS="id=token".');
    }
    const middleware = new AuthMiddleware(new HttpAuthService(), {
        authToken: authToken || undefined,
        approvers
    });
    const handler = new ApprovalHandler(options.manager, options.owners);
    const routes = [...handler.getRoutes(), healthRoute()];

    const server = http.createServer((req, res) => {
        void serve(req, res, routes, middleware);
    });
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port, host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });
    // A sidecar listener must not keep the TUI process alive after it exits.
    server.unref();
    const address = server.address() as AddressInfo;
    return {
        host,
        port: address.port,
        close: () => new Promise<void>(resolve => server.close(() => resolve()))
    };
}

async function serve(req: http.IncomingMessage, res: http.ServerResponse, routes: GatewayRoute[], middleware: AuthMiddleware): Promise<void> {
    try {
        const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
        const matched = matchRoute(routes, String(req.method || 'GET'), url.pathname);
        if (!matched) {
            res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'not found', path: url.pathname }));
            return;
        }
        if (matched.route.auth !== false && !await middleware.authenticate(req, res)) {
            return;
        }
        await (matched.route.handler as RouteHandler)(req, res, matched.params);
        if (!res.writableEnded) {
            res.end();
        }
    } catch (error) {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
        }
        if (!res.writableEnded) {
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
    }
}

function healthRoute(): GatewayRoute {
    return {
        method: 'GET',
        path: '/health',
        auth: false,
        handler: async (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok' }));
        }
    };
}

function matchRoute(routes: GatewayRoute[], method: string, pathname: string): { route: GatewayRoute; params: Record<string, string> } | undefined {
    for (const route of routes) {
        if (route.method !== method) {
            continue;
        }
        const params = matchPath(route.path, pathname);
        if (params) {
            return { route, params };
        }
    }
    return undefined;
}

function matchPath(pattern: string, pathname: string): Record<string, string> | undefined {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return undefined;
    }
    const params: Record<string, string> = {};
    for (let index = 0; index < patternParts.length; index++) {
        const expected = patternParts[index];
        const actual = pathParts[index];
        if (expected.startsWith(':')) {
            params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
            return undefined;
        }
    }
    return params;
}
