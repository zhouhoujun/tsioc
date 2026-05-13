import { Injectable } from '@tsdi/ioc';
import { AgentRuntime, MemoryStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

/**
 * Memory CRUD API — GET /api/memory, POST /api/memory.
 * Mirrors zeroclaw-gateway's memory management endpoints.
 */
@Injectable()
export class MemoryHandler {
    constructor(
        private runtime: AgentRuntime,
        private memory: MemoryStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listMemory: RouteHandler = async (_req, res) => {
            const all = await this.memory.getAll('');
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(all));
        };

        const storeMemory: RouteHandler = async (_req, res, _params, body) => {
            if (!body || !body.sessionId || !body.key || body.value === undefined) {
                res.writeHead(400).end(JSON.stringify({ error: 'sessionId, key, value required' }));
                return;
            }
            const record = await this.runtime.putMemory(body.sessionId, body.key, body.value, body.scope);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(record));
        };

        return [
            { method: 'GET', path: '/api/memory', handler: listMemory },
            { method: 'POST', path: '/api/memory', handler: storeMemory }
        ];
    }
}
