import { Injectable } from '@tsdi/ioc';
import { DelegationEdgeStatus, DelegationGraphStore, DelegationTreeNode } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

@Injectable()
export class DelegationHandler {
    constructor(
        private delegation: DelegationGraphStore,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const delegationTree: RouteHandler = async (req, res) => {
            const sessionId = this.requireSessionId(req);
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            if (!await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const status = this.parseStatus(req);
            const depth = this.parseDepth(req);
            const tree = await this.delegation.tree(sessionId, { status, depth });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ tree: this.toTreeView(tree) }));
        };

        const delegationLineage: RouteHandler = async (req, res) => {
            const sessionId = this.requireSessionId(req);
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            if (!await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const edges = await this.delegation.ancestors(sessionId, { limit: this.parseLimit(req) });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ lineage: edges.map(edge => this.toEdgeView(edge)) }));
        };

        const delegationChildren: RouteHandler = async (req, res) => {
            const sessionId = this.requireSessionId(req);
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            if (!await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const status = this.parseStatus(req);
            const edges = await this.delegation.children(sessionId, { status, limit: this.parseLimit(req) });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ children: edges.map(edge => this.toEdgeView(edge)) }));
        };

        const delegationList: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/delegation', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId')?.trim() || undefined;
            const principalId = getRequestPrincipalId(req);
            if (sessionId && !await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 200;
            const offsetRaw = url.searchParams.get('offset')?.trim();
            const offset = offsetRaw && /^\d+$/.test(offsetRaw) ? parseInt(offsetRaw, 10) : 0;
            const edges = await this.delegation.list({ sessionId, limit, offset });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ edges: edges.map(edge => this.toEdgeView(edge)) }));
        };

        return [
            { method: 'GET', path: '/api/delegation/tree', handler: delegationTree },
            { method: 'GET', path: '/api/delegation/lineage', handler: delegationLineage },
            { method: 'GET', path: '/api/delegation/children', handler: delegationChildren },
            { method: 'GET', path: '/api/delegation/list', handler: delegationList }
        ];
    }

    private requireSessionId(req: any): string | undefined {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/delegation', `http://${host}`);
        return url.searchParams.get('sessionId')?.trim() || undefined;
    }

    private parseStatus(req: any): DelegationEdgeStatus | DelegationEdgeStatus[] | undefined {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/delegation', `http://${host}`);
        const raw = url.searchParams.get('status')?.trim();
        if (!raw) {
            return undefined;
        }
        const statuses = raw.split(',').map(value => value.trim()).filter((value): value is DelegationEdgeStatus => ['active', 'completed', 'failed', 'cancelled'].includes(value));
        if (!statuses.length) {
            return undefined;
        }
        return statuses.length === 1 ? statuses[0] : statuses;
    }

    private parseDepth(req: any): number | undefined {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/delegation', `http://${host}`);
        const raw = url.searchParams.get('depth')?.trim();
        if (!raw || !/^\d+$/.test(raw)) {
            return undefined;
        }
        return Math.min(parseInt(raw, 10), 100);
    }

    private parseLimit(req: any): number | undefined {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/delegation', `http://${host}`);
        const raw = url.searchParams.get('limit')?.trim();
        if (!raw || !/^\d+$/.test(raw)) {
            return undefined;
        }
        return Math.min(parseInt(raw, 10), 200);
    }

    private toEdgeView(edge: any): Record<string, any> {
        return {
            id: edge.id,
            parentSessionId: edge.parentSessionId,
            childSessionId: edge.childSessionId,
            kind: edge.kind ?? null,
            status: edge.status,
            createdAt: edge.createdAt,
            completedAt: edge.completedAt ?? null,
            metadata: edge.metadata ?? null
        };
    }

    private toTreeView(node: DelegationTreeNode): Record<string, any> {
        return {
            sessionId: node.sessionId,
            edgeId: node.edgeId ?? null,
            kind: node.kind ?? null,
            status: node.status ?? null,
            createdAt: node.createdAt ?? null,
            completedAt: node.completedAt ?? null,
            metadata: node.metadata ?? null,
            children: node.children.map(child => this.toTreeView(child))
        };
    }
}
