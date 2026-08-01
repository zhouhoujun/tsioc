import { Injectable } from '@tsdi/ioc';
import { TurnDiagnosticsStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

@Injectable()
export class TurnDiagnosticsHandler {
    constructor(
        private diagnostics: TurnDiagnosticsStore,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listTurnDiagnostics: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/turn-diagnostics', `http://${host}`);
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
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 200;
            const records = (await this.diagnostics.list(sessionId, { limit }))
                .map(record => this.toView(record));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ records }));
        };

        const aggregateStats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/turn-diagnostics/stats', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId')?.trim();
            const principalId = getRequestPrincipalId(req);
            if (sessionId) {
                if (!await this.owners.isOwner(sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
                const aggregate = await this.diagnostics.aggregate([sessionId]);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ aggregate }));
                return;
            }
            const owned = await this.listOwnedSessionIds(principalId);
            const aggregate = await this.diagnostics.aggregate(owned);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ aggregate }));
        };

        return [
            { method: 'GET', path: '/api/turn-diagnostics', handler: listTurnDiagnostics },
            { method: 'GET', path: '/api/turn-diagnostics/stats', handler: aggregateStats }
        ];
    }

    private async listOwnedSessionIds(principalId?: string): Promise<string[]> {
        if (!principalId) {
            return [];
        }
        const all = await this.diagnostics.list();
        const sessionIds = [...new Set(all.map(record => record.sessionId))];
        return this.owners.listOwned(sessionIds, principalId);
    }

    private toView(record: import('@tsdi/agent').TurnDiagnosticsRecord): Record<string, any> {
        return {
            id: record.id,
            sessionId: record.sessionId,
            createdAt: record.createdAt,
            emptyResponseRetryCount: record.emptyResponseRetryCount,
            followUpRecoveryCount: record.followUpRecoveryCount,
            followUpContextRewritten: record.followUpContextRewritten,
            finalAssistantWasClarification: record.finalAssistantWasClarification,
            repeatedClarificationDetected: record.repeatedClarificationDetected,
            compactionCount: record.compactionCount,
            totalTokenSavings: record.totalTokenSavings,
            compressionRatio: record.compressionRatio ?? null,
            compactionLevel: record.compactionLevel ?? null,
            promptCache: record.promptCache ?? null
        };
    }
}
