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
 * filtered to a single provider when one is given.
 */
export function aggregateSummaryQuality(records: SummaryQualityRecord[], provider?: string): SummaryQualityAggregate[] {
    const scoped = provider ? records.filter(record => record.provider === provider) : records;
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
 * Persistent store for summary quality records, mirroring the
 * {@link TurnDiagnosticsStore} pattern: an abstract contract with in-memory,
 * TypeORM, and environment-aware default implementations.
 */
@Abstract()
export abstract class SummaryQualityStore {
    abstract append(record: SummaryQualityRecord): Promise<void>;
    abstract list(options?: { provider?: string; limit?: number; offset?: number }): Promise<SummaryQualityRecord[]>;
    abstract aggregate(provider?: string): Promise<SummaryQualityAggregate[]>;
}
