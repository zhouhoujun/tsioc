import { Injectable, Optional } from '@tsdi/ioc';
import { SessionStore, TurnDiagnosticsStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { summarizeUsageForSessions } from '../usage/UsageStats';

@Injectable()
export class UsageHandler {
    constructor(
        private sessions: SessionStore,
        private owners: SessionOwnerStore,
        @Optional() private turnDiagnostics?: TurnDiagnosticsStore | null
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const usageStats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/usage', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId')?.trim() || undefined;
            const principalId = getRequestPrincipalId(req);
            let sessionIds: string[] = [];
            if (sessionId) {
                if (!await this.owners.isOwner(sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
                sessionIds = [sessionId];
            } else {
                const allSessionIds = await this.sessions.listSessionIds();
                sessionIds = principalId
                    ? await this.owners.listOwned(allSessionIds, principalId)
                    : allSessionIds;
            }
            const usage = await summarizeUsageForSessions(this.sessions, sessionIds, this.turnDiagnostics);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ usage }));
        };

        return [
            { method: 'GET', path: '/api/usage', handler: usageStats }
        ];
    }
}
