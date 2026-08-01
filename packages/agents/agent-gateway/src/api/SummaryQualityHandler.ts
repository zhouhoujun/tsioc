import { Injectable } from '@tsdi/ioc';
import { buildSummaryQualityTrend, SummaryQualityRecord, SummaryQualityStore } from '@tsdi/agent';
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
            const model = url.searchParams.get('model')?.trim() || undefined;
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 200;
            const records = (await this.quality.list({ provider, model, limit }))
                .map(record => this.toView(record));
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ records }));
        };

        const aggregateStats: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/summary-quality/stats', `http://${host}`);
            const provider = url.searchParams.get('provider')?.trim() || undefined;
            const model = url.searchParams.get('model')?.trim() || undefined;
            const aggregates = await this.quality.aggregate(provider, model);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ aggregates }));
        };

        const qualityTrend: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/summary-quality/trend', `http://${host}`);
            const provider = url.searchParams.get('provider')?.trim() || undefined;
            const model = url.searchParams.get('model')?.trim() || undefined;
            const limitRaw = url.searchParams.get('limit')?.trim();
            const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(Math.max(0, parseInt(limitRaw, 10)), 500) : 500;
            const bucketSizeRaw = url.searchParams.get('bucketSize')?.trim();
            const bucketSize = bucketSizeRaw && /^\d+$/.test(bucketSizeRaw) && parseInt(bucketSizeRaw, 10) > 0
                ? parseInt(bucketSizeRaw, 10)
                : undefined;
            const maxBucketsRaw = url.searchParams.get('maxBuckets')?.trim();
            const maxBuckets = maxBucketsRaw && /^\d+$/.test(maxBucketsRaw)
                ? Math.min(Math.max(1, parseInt(maxBucketsRaw, 10)), 90)
                : undefined;
            const records = await this.quality.list({ provider, model, limit });
            const trend = buildSummaryQualityTrend(records, { provider, model, bucketSize, maxBuckets });
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ trend: trend.map(point => this.toTrendPoint(point)) }));
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
            },
            {
                method: 'GET',
                path: '/api/summary-quality/trend',
                handler: qualityTrend
            }
        ];
    }

    private toTrendPoint(point: ReturnType<typeof buildSummaryQualityTrend>[number]): Record<string, any> {
        return {
            provider: point.provider,
            bucketStart: point.bucketStart,
            recordCount: point.recordCount,
            avgTotal: point.avgTotal,
            minTotal: point.minTotal,
            maxTotal: point.maxTotal,
            avgFieldCompleteness: point.avgFieldCompleteness,
            avgAnnotationQuality: point.avgAnnotationQuality,
            avgLengthBalance: point.avgLengthBalance,
            avgTruncationScore: point.avgTruncationScore,
            fallbackRate: point.fallbackRate
        };
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
