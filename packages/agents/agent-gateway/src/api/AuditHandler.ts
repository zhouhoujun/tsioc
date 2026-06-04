import { Injectable } from '@tsdi/ioc';
import { AuditSink } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

@Injectable()
export class AuditHandler {
    constructor(
        private audit: AuditSink,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listAudit: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/audit', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId');
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
            const toolName = url.searchParams.get('toolName')?.trim();
            const status = url.searchParams.get('status')?.trim();
            const records = await this.audit.list(sessionId);
            const filtered = records.filter(record => {
                if (toolName && record.toolName !== toolName) {
                    return false;
                }
                if (status && record.status !== status) {
                    return false;
                }
                return true;
            }).map(record => ({
                id: record.id,
                sessionId: record.sessionId,
                toolName: record.toolName,
                toolCallId: record.toolCallId,
                status: record.status,
                inputSummary: record.inputSummary ?? null,
                outputSummary: record.outputSummary ?? null,
                error: record.error ?? null,
                durationMs: record.durationMs ?? null,
                attemptCount: record.attemptCount ?? null,
                principalId: record.principalId ?? null,
                createdAt: record.createdAt,
                metadata: record.metadata ?? null
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ records: filtered }));
        };

        return [
            { method: 'GET', path: '/api/audit', handler: listAudit }
        ];
    }
}
