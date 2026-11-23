import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { MetricValue, MetricOptions, MetricsModuleOptions } from './metrics';
import { METRICS_OPTIONS } from './tokens';
import { MetricsCollector } from './collector';

interface HistogramBucketData {
    counts: number[];
    sum: number;
    count: number;
}

interface HistogramData {
    buckets: number[];
    values: Map<string, HistogramBucketData>;
}

/**
 * Default millisecond bucket boundaries. Second-based histograms derive their
 * boundaries from these (`/1000`) so both views stay consistent.
 */
const DEFAULT_MS_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function normalizeBuckets(buckets: number[]): number[] {
    return [...new Set(buckets.filter(value => Number.isFinite(value) && value > 0))]
        .sort((a, b) => a - b);
}

function deriveSecondsBuckets(msBuckets: number[]): number[] {
    return normalizeBuckets(msBuckets.map(value => value / 1000));
}

/**
 * Format a label set into a stable map key.
 *
 * Keys use code-unit ordering instead of `localeCompare` (which is an order of
 * magnitude slower) and concat instead of `map().join()`; the resulting string
 * is only used as an internal map key, so the exact ordering is irrelevant as
 * long as it is deterministic for equal label sets.
 */
function formatLabelsKey(labels: Record<string, string>): string {
    const keys = Object.keys(labels);
    if (keys.length === 0) {
        return '';
    }
    if (keys.length > 1) {
        keys.sort();
    }
    let key = `${keys[0]}="${labels[keys[0]]}"`;
    for (let i = 1; i < keys.length; i++) {
        key += `,${keys[i]}="${labels[keys[i]]}"`;
    }
    return key;
}

/**
 * In-memory metrics registry.
 *
 * 内存指标注册中心，存储和管理所有指标。
 */
@Injectable()
export class MetricsRegistry extends MetricsCollector {
    private counters: Map<string, Map<string, number>> = new Map();
    private gauges: Map<string, Map<string, number>> = new Map();
    private histograms: Map<string, HistogramData> = new Map();
    private descriptions: Map<string, string> = new Map();
    private prefix: string = '';
    private defaultLabels: Record<string, string> = {};
    private hasDefaultLabels = false;
    private buckets: number[] = DEFAULT_MS_BUCKETS.slice();
    private secondsBuckets: number[] = deriveSecondsBuckets(DEFAULT_MS_BUCKETS);
    private maxSeriesPerMetric = 1000;
    private droppedSeries = 0;

    constructor(@Optional() @Inject(METRICS_OPTIONS) options?: MetricsModuleOptions) {
        super();
        if (options?.prefix) {
            this.prefix = options.prefix;
        }
        if (options?.defaultLabels) {
            this.setDefaultLabels(options.defaultLabels);
        }
        if (options?.latencyBuckets?.length) {
            this.setBuckets(options.latencyBuckets);
        }
        if (options?.latencyBucketsSeconds?.length) {
            this.setSecondsBuckets(options.latencyBucketsSeconds);
        }
        if (options?.maxSeriesPerMetric != null) {
            this.maxSeriesPerMetric = Math.max(1, options.maxSeriesPerMetric);
        }
    }

    /**
     * Set millisecond bucket boundaries. Second-based histograms re-derive
     * their boundaries from these unless `setSecondsBuckets` is called.
     */
    setBuckets(buckets: number[]): void {
        this.buckets = normalizeBuckets(buckets);
        this.secondsBuckets = deriveSecondsBuckets(this.buckets);
    }

    /** Set second-based bucket boundaries explicitly (overrides derivation). */
    setSecondsBuckets(buckets: number[]): void {
        this.secondsBuckets = normalizeBuckets(buckets);
    }

    setMaxSeriesPerMetric(max: number): void {
        this.maxSeriesPerMetric = Math.max(1, max);
    }

    getDroppedSeries(): number {
        return this.droppedSeries;
    }

    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    setDefaultLabels(labels: Record<string, string>): void {
        this.defaultLabels = labels ?? {};
        this.hasDefaultLabels = Object.keys(this.defaultLabels).length > 0;
    }

    private getFullName(name: string): string {
        return this.prefix ? `${this.prefix}_${name}` : name;
    }

    private getLabelsKey(labels?: Record<string, string>): string {
        if (!this.hasDefaultLabels) {
            return labels ? formatLabelsKey(labels) : '';
        }
        // Merge only when defaults exist; merging allocates a fresh object.
        return formatLabelsKey(labels ? { ...this.defaultLabels, ...labels } : this.defaultLabels);
    }

    /**
     * Bucket set for a metric. Second-based names use second boundaries so
     * `recordDuration`'s `*_seconds` view stays meaningful.
     */
    private bucketsFor(fullName: string): number[] {
        return fullName.endsWith('_seconds') ? this.secondsBuckets : this.buckets;
    }

    register(options: MetricOptions): void {
        const fullName = this.getFullName(options.name);
        if (options.description) {
            this.descriptions.set(fullName, options.description);
        }
    }

    increment(name: string, value = 1, labels?: Record<string, string>): void {
        const fullName = this.getFullName(name);
        if (!this.counters.has(fullName)) {
            this.counters.set(fullName, new Map());
        }
        const key = this.getLabelsKey(labels);
        const values = this.counters.get(fullName)!;
        if (!values.has(key) && !this.reserveSeries(values)) {
            return;
        }
        const current = values.get(key) || 0;
        values.set(key, current + value);
    }

    decrement(name: string, value = 1, labels?: Record<string, string>): void {
        this.increment(name, -value, labels);
    }

    gauge(name: string, value: number, labels?: Record<string, string>): void {
        const fullName = this.getFullName(name);
        if (!this.gauges.has(fullName)) {
            this.gauges.set(fullName, new Map());
        }
        const key = this.getLabelsKey(labels);
        const values = this.gauges.get(fullName)!;
        if (!values.has(key) && !this.reserveSeries(values)) {
            return;
        }
        values.set(key, value);
    }

    histogram(name: string, value: number, labels?: Record<string, string>): void {
        const fullName = this.getFullName(name);
        if (!this.histograms.has(fullName)) {
            this.histograms.set(fullName, {
                buckets: this.bucketsFor(fullName).slice(),
                values: new Map()
            });
        }
        const key = this.getLabelsKey(labels);
        const hist = this.histograms.get(fullName)!;
        if (!hist.values.has(key)) {
            if (!this.reserveSeries(hist.values)) {
                return;
            }
            hist.values.set(key, { counts: new Array(hist.buckets.length + 1).fill(0), sum: 0, count: 0 });
        }
        const data = hist.values.get(key)!;
        data.sum += value;
        data.count++;

        // Count in appropriate buckets
        for (let i = 0; i < hist.buckets.length; i++) {
            if (value <= hist.buckets[i]) {
                data.counts[i]++;
            }
        }
        data.counts[hist.buckets.length]++; // +Inf bucket
    }

    timing(name: string, duration: number, labels?: Record<string, string>): void {
        this.histogram(name, duration, labels);
    }

    getMetrics(): MetricValue[] {
        const result: MetricValue[] = [];

        // Collect counters
        for (const [name, values] of this.counters) {
            for (const [labelsKey, value] of values) {
                result.push({
                    name,
                    type: 'counter',
                    value,
                    labels: this.parseLabelsKey(labelsKey),
                    description: this.descriptions.get(name)
                });
            }
        }

        // Collect gauges
        for (const [name, values] of this.gauges) {
            for (const [labelsKey, value] of values) {
                result.push({
                    name,
                    type: 'gauge',
                    value,
                    labels: this.parseLabelsKey(labelsKey),
                    description: this.descriptions.get(name)
                });
            }
        }

        // Collect histograms
        for (const [name, hist] of this.histograms) {
            for (const [labelsKey, data] of hist.values) {
                const labels = this.parseLabelsKey(labelsKey);
                // Add bucket values
                for (let i = 0; i < hist.buckets.length; i++) {
                    result.push({
                        name: `${name}_bucket`,
                        type: 'histogram',
                        value: data.counts[i],
                        labels: { ...labels, le: String(hist.buckets[i]) },
                        description: this.descriptions.get(name)
                    });
                }
                // +Inf bucket
                result.push({
                    name: `${name}_bucket`,
                    type: 'histogram',
                    value: data.counts[hist.buckets.length],
                    labels: { ...labels, le: '+Inf' },
                    description: this.descriptions.get(name)
                });
                // Sum and count
                result.push({
                    name: `${name}_sum`,
                    type: 'histogram',
                    value: data.sum,
                    labels,
                    description: this.descriptions.get(name)
                });
                result.push({
                    name: `${name}_count`,
                    type: 'histogram',
                    value: data.count,
                    labels,
                    description: this.descriptions.get(name)
                });
            }
        }

        return result;
    }

    private reserveSeries(values: Map<string, any>): boolean {
        if (values.size < this.maxSeriesPerMetric) {
            return true;
        }
        this.droppedSeries += 1;
        return false;
    }

    private parseLabelsKey(key: string): Record<string, string> {
        if (!key) return {};
        const result: Record<string, string> = {};
        const pairs = key.split(',');
        for (const pair of pairs) {
            const [k, v] = pair.split('=');
            if (k && v) {
                result[k] = v.replace(/^"|"$/g, '');
            }
        }
        return result;
    }

    reset(name?: string): void {
        if (name) {
            const fullName = this.getFullName(name);
            this.counters.delete(fullName);
            this.gauges.delete(fullName);
            this.histograms.delete(fullName);
        } else {
            this.counters.clear();
            this.gauges.clear();
            this.histograms.clear();
        }
    }
}