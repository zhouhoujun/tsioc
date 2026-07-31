import { Injectable } from '@tsdi/ioc';
import { AuditSink, AgentAuditRecord } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

interface StatsCounts {
    runs: number;
    ok: number;
    fail: number;
    skipped: number;
    avgDurationMs: number | null;
    durationMsSum: number;
    durationCount: number;
}

function emptyCounts(): StatsCounts {
    return { runs: 0, ok: 0, fail: 0, skipped: 0, avgDurationMs: null, durationMsSum: 0, durationCount: 0 };
}

function addCount(target: StatsCounts, record: AgentAuditRecord): void {
    target.runs++;
    if (record.status === 'success') {
        target.ok++;
    } else if (record.status === 'error') {
        target.fail++;
    } else {
        target.skipped++;
    }
    if (record.durationMs != null) {
        target.durationMsSum += record.durationMs;
        target.durationCount++;
        target.avgDurationMs = Math.round(target.durationMsSum / target.durationCount);
    }
}

function aggregate(records: AgentAuditRecord[]) {
    const overall = emptyCounts();
    const byTool = new Map<string, StatsCounts>();
    const byKind = new Map<string, StatsCounts>();
    let from = Number.POSITIVE_INFINITY;
    let to = Number.NEGATIVE_INFINITY;

    for (const record of records) {
        addCount(overall, record);
        let toolCounts = byTool.get(record.toolName);
        if (!toolCounts) {
            toolCounts = emptyCounts();
            byTool.set(record.toolName, toolCounts);
        }
        addCount(toolCounts, record);
        const kind = record.metadata?.kind === 'approval' ? 'approval' : 'execution';
        let kindCounts = byKind.get(kind);
        if (!kindCounts) {
            kindCounts = emptyCounts();
            byKind.set(kind, kindCounts);
        }
        addCount(kindCounts, record);
        if (record.createdAt < from) from = record.createdAt;
        if (record.createdAt > to) to = record.createdAt;
    }

    const serialize = (counts: StatsCounts) => ({
        runs: counts.runs,
        ok: counts.ok,
        fail: counts.fail,
        skipped: counts.skipped,
        successRate: counts.runs ? Math.round((counts.ok / counts.runs) * 1000) / 10 : 0,
        avgDurationMs: counts.avgDurationMs
    });

    return {
        runs: overall.runs,
        ok: overall.ok,
        fail: overall.fail,
        skipped: overall.skipped,
        successRate: overall.runs ? Math.round((overall.ok / overall.runs) * 1000) / 10 : 0,
        avgDurationMs: overall.avgDurationMs,
        sessions: new Set(records.map(record => record.sessionId)).size,
        timeRange: records.length ? { from, to } : null,
        byTool: Object.fromEntries([...byTool.entries()].map(([name, counts]) => [name, serialize(counts)])),
        byKind: Object.fromEntries([...byKind.entries()].map(([name, counts]) => [name, serialize(counts)]))
    };
}

/**
 * Aggregate audit statistics — GET /api/stats?sessionId=&status=&toolName=.
 * With a sessionId the stats are scoped to one owned session; without one the
 * stats aggregate across every session owned by the authenticated principal.
 */
@Injectable()
export class StatsHandler {
    constructor(
        private audit: AuditSink,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const stats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/stats', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId')?.trim();
            const principalId = getRequestPrincipalId(req);

            if (sessionId) {
                if (!await this.owners.isOwner(sessionId, principalId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ error: 'forbidden' }));
                    return;
                }
                const records = await this.audit.list(sessionId);
                res.writeHead(200, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify(aggregate(records)));
                return;
            }

            let records = await this.audit.list();
            if (principalId) {
                const sessionIds = [...new Set(records.map(record => record.sessionId))];
                const owned = new Set(await this.owners.listOwned(sessionIds, principalId));
                records = records.filter(record => owned.has(record.sessionId));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(aggregate(records)));
        };

        return [
            { method: 'GET', path: '/api/stats', handler: stats }
        ];
    }
}
