import { Abstract } from '@tsdi/ioc';

/**
 * One scored compaction summary. `provider` is the normalized model provider
 * reported by the model adapter (for example `deepseek`, `openai-compatible`,
 * `anthropic`, or `echo`), enabling per-provider quality comparisons.
 */
export interface SummaryQualityRecord {
    id: string;
    /** Normalized model provider name; `unknown` when no adapter was used. */
    provider: string;
    /** Model name reported by the adapter, when available. */
    model?: string;
    total: number;
    fieldCompleteness: number;
    annotationQuality: number;
    lengthBalance: number;
    truncationScore: number;
    fallbackUsed: boolean;
    summaryLength: number;
    createdAt: number;
    metadata?: Record<string, any>;
}

/**
 * Per-provider aggregation of summary quality scores. Averages are rounded to
 * one decimal place; `fallbackRate` is a percentage.
 */
export interface SummaryQualityAggregate {
    provider: string;
    recordCount: number;
    avgTotal: number;
    minTotal: number;
    maxTotal: number;
    avgFieldCompleteness: number;
    avgAnnotationQuality: number;
    avgLengthBalance: number;
    avgTruncationScore: number;
    fallbackRate: number;
    timeRange?: { from: number; to: number };
}

/**
 * Shared reduction used by every store implementation so in-memory and
 * TypeORM aggregation behave identically. Returns one aggregate per provider,
 * optionally scoped to a single provider and/or model.
 */
export function aggregateSummaryQuality(
    records: SummaryQualityRecord[],
    provider?: string,
    model?: string
): SummaryQualityAggregate[] {
    let scoped = provider ? records.filter(record => record.provider === provider) : records;
    if (model) {
        scoped = scoped.filter(record => record.model === model);
    }
    const byProvider = new Map<string, SummaryQualityRecord[]>();
    for (const record of scoped) {
        const group = byProvider.get(record.provider) ?? [];
        group.push(record);
        byProvider.set(record.provider, group);
    }

    const avg = (values: number[]): number => values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
    const aggregates: SummaryQualityAggregate[] = [];
    for (const [providerName, recordsGroup] of byProvider) {
        const totals = recordsGroup.map(record => record.total);
        aggregates.push({
            provider: providerName,
            recordCount: recordsGroup.length,
            avgTotal: avg(totals),
            minTotal: Math.min(...totals),
            maxTotal: Math.max(...totals),
            avgFieldCompleteness: avg(recordsGroup.map(record => record.fieldCompleteness)),
            avgAnnotationQuality: avg(recordsGroup.map(record => record.annotationQuality)),
            avgLengthBalance: avg(recordsGroup.map(record => record.lengthBalance)),
            avgTruncationScore: avg(recordsGroup.map(record => record.truncationScore)),
            fallbackRate: Math.round((recordsGroup.filter(record => record.fallbackUsed).length / recordsGroup.length) * 1000) / 10,
            timeRange: {
                from: Math.min(...recordsGroup.map(record => record.createdAt)),
                to: Math.max(...recordsGroup.map(record => record.createdAt))
            }
        });
    }
    return aggregates.sort((a, b) => a.provider.localeCompare(b.provider));
}

/**
 * One time-bucketed trend point for a provider. `bucketStart` is the start of
 * the bucket window (aligned to `bucketSize`), and the averages mirror the
 * aggregate shape so the console can render a per-provider quality sparkline.
 */
export interface SummaryQualityTrendPoint {
    provider: string;
    bucketStart: number;
    recordCount: number;
    avgTotal: number;
    minTotal: number;
    maxTotal: number;
    avgFieldCompleteness: number;
    avgAnnotationQuality: number;
    avgLengthBalance: number;
    avgTruncationScore: number;
    fallbackRate: number;
}

const DEFAULT_TREND_BUCKET_SIZE = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_MAX_BUCKETS = 30;

/**
 * Buckets scored records into chronological windows (one day by default) per
 * provider, producing trend points that show how summary quality evolves over
 * time. Only non-empty buckets are returned, limited to the most recent
 * `maxBuckets` windows. Shared by the gateway RPC and console rendering so both
 * surfaces see the same shape.
 */
export function buildSummaryQualityTrend(
    records: SummaryQualityRecord[],
    options?: { provider?: string; model?: string; bucketSize?: number; maxBuckets?: number }
): SummaryQualityTrendPoint[] {
    let scoped = options?.provider ? records.filter(record => record.provider === options.provider) : records;
    if (options?.model) {
        scoped = scoped.filter(record => record.model === options.model);
    }
    const bucketSize = Number.isFinite(options?.bucketSize) && (options?.bucketSize as number) > 0
        ? options?.bucketSize as number
        : DEFAULT_TREND_BUCKET_SIZE;
    const maxBuckets = Number.isFinite(options?.maxBuckets) && (options?.maxBuckets as number) > 0
        ? Math.min(Math.floor(options?.maxBuckets as number), 90)
        : DEFAULT_TREND_MAX_BUCKETS;

    const avg = (values: number[]): number => values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
    const byProvider = new Map<string, Map<number, SummaryQualityRecord[]>>();
    for (const record of scoped) {
        const bucketStart = Math.floor(record.createdAt / bucketSize) * bucketSize;
        const providerBuckets = byProvider.get(record.provider) ?? new Map<number, SummaryQualityRecord[]>();
        const group = providerBuckets.get(bucketStart) ?? [];
        group.push(record);
        providerBuckets.set(bucketStart, group);
        byProvider.set(record.provider, providerBuckets);
    }

    const points: SummaryQualityTrendPoint[] = [];
    for (const [providerName, providerBuckets] of byProvider) {
        const bucketStarts = [...providerBuckets.keys()].sort((a, b) => a - b).slice(-maxBuckets);
        for (const bucketStart of bucketStarts) {
            const group = providerBuckets.get(bucketStart) as SummaryQualityRecord[];
            const totals = group.map(record => record.total);
            points.push({
                provider: providerName,
                bucketStart,
                recordCount: group.length,
                avgTotal: avg(totals),
                minTotal: Math.min(...totals),
                maxTotal: Math.max(...totals),
                avgFieldCompleteness: avg(group.map(record => record.fieldCompleteness)),
                avgAnnotationQuality: avg(group.map(record => record.annotationQuality)),
                avgLengthBalance: avg(group.map(record => record.lengthBalance)),
                avgTruncationScore: avg(group.map(record => record.truncationScore)),
                fallbackRate: Math.round((group.filter(record => record.fallbackUsed).length / group.length) * 1000) / 10
            });
        }
    }
    return points.sort((a, b) => a.provider.localeCompare(b.provider) || a.bucketStart - b.bucketStart);
}

/**
 * Persistent store for summary quality records, mirroring the
 * {@link TurnDiagnosticsStore} pattern: an abstract contract with in-memory,
 * TypeORM, and environment-aware default implementations.
 */
@Abstract()
export abstract class SummaryQualityStore {
    abstract append(record: SummaryQualityRecord): Promise<void>;
    abstract list(options?: { provider?: string; model?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]>;
    abstract aggregate(provider?: string, model?: string): Promise<SummaryQualityAggregate[]>;
}
