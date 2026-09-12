import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, SessionStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { SessionShareStore } from '../share/SessionShareStore';

@Injectable()
export class ShareHandler {
    constructor(private runtime: AgentRuntime, private sessions: SessionStore, private owners: SessionOwnerStore, private shares: SessionShareStore) {}
    getRoutes(): GatewayRoute[] {
        const create: RouteHandler = async (req, res, params) => {
            const sessionId = params.id;
            if (!sessionId || !await this.owners.isAuthorized(sessionId, getRequestPrincipalId(req))) {
                res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'forbidden' })); return;
            }
            try {
                const state = await this.sessions.get(sessionId);
                const snapshot = this.shares.create({ sessionId, title: state.title, summary: state.summary, messages: await this.runtime.getMessages(sessionId) }, state.workspace);
                res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: snapshot.id, token: snapshot.token, url: `/api/share/${snapshot.token}` }));
            } catch { res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'session not found' })); }
        };
        const get: RouteHandler = async (_req, res, params) => {
            const snapshot = this.shares.get(params.token || '');
            if (!snapshot) { res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'share not found' })); return; }
            const { token: _token, ...view } = snapshot;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }).end(JSON.stringify(view));
        };
        const revoke: RouteHandler = async (req, res, params) => {
            const snapshot = this.shares.get(params.token || '');
            if (!snapshot || !await this.owners.isAuthorized(snapshot.sessionId, getRequestPrincipalId(req))) {
                res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'forbidden' })); return;
            }
            this.shares.revoke(params.token); res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'revoked' }));
        };
        return [
            { method: 'POST', path: '/api/sessions/:id/share', handler: create },
            { method: 'GET', path: '/api/share/:token', auth: false, handler: get },
            { method: 'DELETE', path: '/api/share/:token', handler: revoke }
        ];
    }
}
