import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, MemoryStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * Memory CRUD API — GET /api/memory, POST /api/memory.
 * Mirrors zeroclaw-gateway's memory management endpoints.
 */
@Injectable()
export class MemoryHandler {
    constructor(
        private runtime: AgentRuntime,
        private memory: MemoryStore,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listMemory: RouteHandler = async (req, res) => {
            const principalId = getRequestPrincipalId(req);
            const sessionIds = this.owners.listOwned(this.owners.listSessionIds(), principalId);
            const records = await Promise.all(sessionIds.map(sessionId => this.memory.getAll(sessionId)));
            const all = records.flat();
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(all));
        };

        const storeMemory: RouteHandler = async (req, res, _params, body) => {
            if (!body || !body.sessionId || !body.key || body.value === undefined) {
                res.writeHead(400).end(JSON.stringify({ error: 'sessionId, key, value required' }));
                return;
            }
            if (!this.owners.isOwner(body.sessionId, getRequestPrincipalId(req))) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            if (body.scope && body.scope !== 'session') {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'only session scope supported' }));
                return;
            }
            const record = await this.runtime.putMemory(body.sessionId, body.key, body.value, 'session');
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(record));
        };

        return [
            { method: 'GET', path: '/api/memory', handler: listMemory },
            { method: 'POST', path: '/api/memory', handler: storeMemory }
        ];
    }
}
