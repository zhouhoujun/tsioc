import { Injectable } from '@tsdi/ioc';
import { SummaryQualityRecord, SummaryQualityStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

@Injectable()
export class SummaryQualityHandler {
    constructor(private quality: SummaryQualityStore) {
    }

    getRoutes(): GatewayRoute[] {
        const listSummaryQuality: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/summary-quality', `http://${host}`);
            const provider = url.searchParams.get('provider')?.trim() || undefined;
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 200;
            const records = (await this.quality.list({ provider, limit }))
                .map(record => this.toView(record));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ records }));
        };

        const aggregateStats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/summary-quality/stats', `http://${host}`);
            const provider = url.searchParams.get('provider')?.trim() || undefined;
            const aggregates = await this.quality.aggregate(provider);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ aggregates }));
        };

        return [
            {
                method: 'GET',
                path: '/api/summary-quality',
                handler: listSummaryQuality
            },
            {
                method: 'GET',
                path: '/api/summary-quality/stats',
                handler: aggregateStats
            }
        ];
    }

    private toView(record: SummaryQualityRecord): Record<string, any> {
        return {
            id: record.id,
            provider: record.provider,
            model: record.model ?? null,
            total: record.total,
            fieldCompleteness: record.fieldCompleteness,
            annotationQuality: record.annotationQuality,
            lengthBalance: record.lengthBalance,
            truncationScore: record.truncationScore,
            fallbackUsed: record.fallbackUsed,
            summaryLength: record.summaryLength,
            createdAt: record.createdAt
        };
    }
}
