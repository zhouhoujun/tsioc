import * as http from 'http';
import { Injectable, Optional } from '@tsdi/ioc';
import { ToolApprovalManager } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

/**
 * Approval management API — GET /api/approvals, POST /api/approvals/:id/approve, POST /api/approvals/:id/reject.
 * Exposes the runtime's tool approval queue to remote gateway clients so they
 * can inspect and resolve pending approval requests.
 */
@Injectable()
export class ApprovalHandler {
    constructor(
        @Optional() private approvalManager?: ToolApprovalManager | null,
        private owners?: SessionOwnerStore | null
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listApprovals: RouteHandler = async (req, res) => {
            if (!this.approvalManager) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ requests: [] }));
                return;
            }
            const url = new URL(req.url ?? '/api/approvals', `http://${req.headers?.host ?? 'localhost'}`);
            const sessionId = url.searchParams.get('sessionId')?.trim();
            let requests = this.approvalManager.getPending();
            if (sessionId) {
                requests = requests.filter(request => request.sessionId === sessionId);
            }
            if (this.owners && req && sessionId) {
                const principalId = getRequestPrincipalId(req);
                if (!await this.owners.isOwner(sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ requests }));
        };

        const decideApproval = (approve: boolean): RouteHandler => async (req, res, params) => {
            if (!this.approvalManager) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ applied: false, reason: 'Approval is not configured' }));
                return;
            }
            const requestId = params?.['id'];
            if (!requestId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'approval request id required' }));
                return;
            }
            const request = this.approvalManager.getPending().find(item => item.id === requestId);
            if (!request) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ requestId, applied: false }));
                return;
            }
            if (this.owners) {
                const principalId = getRequestPrincipalId(req);
                if (!await this.owners.isOwner(request.sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
            }
            const applied = approve
                ? this.approvalManager.approve(requestId)
                : this.approvalManager.reject(requestId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({
                    requestId,
                    sessionId: request.sessionId,
                    applied,
                    decision: approve ? 'approved' : 'denied'
                }));
        };

        return [
            { method: 'GET', path: '/api/approvals', handler: listApprovals },
            { method: 'POST', path: '/api/approvals/:id/approve', handler: decideApproval(true) },
            { method: 'POST', path: '/api/approvals/:id/reject', handler: decideApproval(false) }
        ];
    }
}
