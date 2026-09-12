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
            const rangeValue = url.searchParams.get('range')?.trim();
            const range = rangeValue === 'daily' || rangeValue === 'weekly' || rangeValue === 'cumulative' ? rangeValue : undefined;
            const sinceValue = url.searchParams.get('since')?.trim();
            const since = sinceValue ? (/^\d+$/.test(sinceValue) ? Number(sinceValue) : Date.parse(sinceValue)) : undefined;
            if ((rangeValue && !range) || (sinceValue && !Number.isFinite(since))) {
                res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'invalid usage range or since' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            let sessionIds: string[] = [];
            if (sessionId) {
                if (!await this.owners.isAuthorized(sessionId, principalId)) {
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
            const usage = await summarizeUsageForSessions(this.sessions, sessionIds, this.turnDiagnostics, { since });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ usage, ...(range ? { range, selected: usage[range] } : {}), ...(since ? { since } : {}) }));
        };

        return [
            { method: 'GET', path: '/api/usage', handler: usageStats }
        ];
    }
}
