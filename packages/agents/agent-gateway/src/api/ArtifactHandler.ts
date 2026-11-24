import * as http from 'http';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestAuth, getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

const MIME_BY_EXT: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg: 'image/svg+xml',
    md: 'text/markdown; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf'
};

function contentTypeFor(path: string, fallback: string): string {
    const ext = String(path || '').split('.').pop()?.toLowerCase() || '';
    return MIME_BY_EXT[ext] ?? fallback ?? 'application/octet-stream';
}

/**
 * P2.1: read-only artifact serving — GET /artifacts/:sessionId/:id/*path.
 *
 * Artifacts are agent-generated HTML/markdown/JSON; the response is sandboxed
 * (CSP sandbox, nosniff) so embedded frames cannot reach the console origin or
 * storage. Session ownership is checked like every other gateway route.
 */
@Injectable()
export class ArtifactHandler {
    constructor(
        @Optional() @Inject(AgentRuntime) private runtime?: AgentRuntime | null,
        @Optional() @Inject(SessionOwnerStore) private owners?: SessionOwnerStore | null
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const serveArtifact: RouteHandler = async (req, res, params) => {
            const sessionId = String(params?.sessionId || '').trim();
            const id = String(params?.id || '').trim();
            if (!sessionId || !id) {
                res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'sessionId and artifact id are required' }));
                return;
            }
            if (this.owners && req && getRequestAuth(req)?.role !== 'approver') {
                const principalId = getRequestPrincipalId(req);
                if (!await this.owners.isAuthorized(sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
            }
            const artifact = await (this.runtime as any)?.readArtifact?.(sessionId, id, String(params?.path || ''));
            if (!artifact) {
                res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'artifact not found' }));
                return;
            }
            res.writeHead(200, {
                'Content-Type': contentTypeFor(artifact.path, artifact.manifest?.mime),
                'Cache-Control': 'private, max-age=0, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "sandbox allow-scripts allow-forms allow-popups"
            });
            res.end(artifact.content);
        };
        return [{ method: 'GET', path: '/artifacts/:sessionId/:id/*path', handler: serveArtifact, auth: true }];
    }
}
