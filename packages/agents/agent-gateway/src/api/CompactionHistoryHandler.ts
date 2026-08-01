import { Injectable } from '@tsdi/ioc';
import { CompactionHistoryStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

@Injectable()
export class CompactionHistoryHandler {
    constructor(
        private compactionHistory: CompactionHistoryStore,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listCompactionHistory: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/compaction-history', `http://${host}`);
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
            const level = url.searchParams.get('level')?.trim();
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 200;
            const records = (await this.compactionHistory.list(sessionId, { limit }))
                .filter(record => !level || record.level === level)
                .map(record => ({
                    id: record.id,
                    sessionId: record.sessionId,
                    strategy: record.strategy,
                    compactionTriggered: record.compactionTriggered,
                    level: record.level,
                    summaryInserted: record.summaryInserted,
                    beforeMessageCount: record.beforeMessageCount,
                    afterMessageCount: record.afterMessageCount,
                    beforeTokens: record.beforeTokens,
                    afterTokens: record.afterTokens,
                    compactedMessageCount: record.compactedMessageCount,
                    preservedAnchorCount: record.preservedAnchorCount,
                    recentMessageCount: record.recentMessageCount,
                    prunedMessageCount: record.prunedMessageCount,
                    toolMessagesCompacted: record.toolMessagesCompacted,
                    compressionRatio: record.compressionRatio,
                    cumulativeTokenSavings: record.cumulativeTokenSavings,
                    createdAt: record.createdAt,
                    metadata: record.metadata ?? null
                }));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ records }));
        };

        const compactionHistoryStats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/compaction-history/stats', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId')?.trim() || undefined;
            const principalId = getRequestPrincipalId(req);
            if (sessionId && !await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const aggregates = (await this.compactionHistory.aggregate(sessionId))
                .map(aggregate => ({
                    sessionId: aggregate.sessionId,
                    recordCount: aggregate.recordCount,
                    compactedCount: aggregate.compactedCount,
                    prunedCount: aggregate.prunedCount,
                    avgCompressionRatio: aggregate.avgCompressionRatio,
                    totalTokensBefore: aggregate.totalTokensBefore,
                    totalTokensAfter: aggregate.totalTokensAfter,
                    totalTokensSaved: aggregate.totalTokensSaved,
                    timeRange: aggregate.timeRange ?? null
                }));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ aggregates }));
        };

        return [
            { method: 'GET', path: '/api/compaction-history', handler: listCompactionHistory },
            { method: 'GET', path: '/api/compaction-history/stats', handler: compactionHistoryStats }
        ];
    }
}
