import { MetricValue } from '../metrics';
import { MetricsExporter } from './exporter';

export interface OtlpHttpExporterOptions {
    /**
     * OTLP/HTTP metrics endpoint, e.g. `http://collector:4318/v1/metrics`.
     */
    url: string;
    /**
     * extra request headers (auth, tenant, ...).
     */
    headers?: Record<string, string>;
    /**
     * `service.name` resource attribute.
     */
    serviceName?: string;
    /**
     * additional resource attributes.
     */
    resourceAttributes?: Record<string, string>;
    /**
     * request timeout in milliseconds. Default 10s.
     */
    timeoutMs?: number;
    /**
     * injectable fetch implementation (tests / custom agent).
     */
    fetchImpl?: typeof fetch;
}

/**
 * OTLP/HTTP JSON metrics exporter.
 *
 * Counters are exported as monotonic sums, gauges as gauges, and histograms
 * are reconstructed from the flat `_bucket/_sum/_count` snapshot produced by
 * `MetricsCollector.getMetrics()`.
 */
export class OtlpHttpMetricsExporter implements MetricsExporter {
    constructor(private readonly options: OtlpHttpExporterOptions) { }

    async export(metrics: MetricValue[]): Promise<void> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const timeout = this.options.timeoutMs ?? 10_000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        (timer as any)?.unref?.();
        try {
            const response = await fetchImpl(this.options.url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(this.options.headers ?? {})
                },
                body: JSON.stringify(this.toPayload(metrics)),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`OTLP metrics export failed: ${response.status}`);
            }
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Build an OTLP/HTTP JSON payload. Kept public for tests and custom
     * transports.
     */
    toPayload(metrics: MetricValue[]): Record<string, any> {
        return {
            resourceMetrics: [{
                resource: {
                    attributes: toAttributes({
                        'service.name': this.options.serviceName ?? 'unknown',
                        ...(this.options.resourceAttributes ?? {})
                    })
                },
                scopeMetrics: [{
                    scope: { name: '@tsdi/metrics' },
                    metrics: this.toOtlpMetrics(metrics)
                }]
            }]
        };
    }

    private toOtlpMetrics(metrics: MetricValue[]): any[] {
        const now = String(Date.now() * 1_000_000);
        const output: any[] = [];

        for (const metric of metrics) {
            if (metric.type === 'counter' || metric.type === 'gauge') {
                const dataPoint = {
                    attributes: toAttributes(metric.labels),
                    startTimeUnixNano: now,
                    timeUnixNano: now,
                    asDouble: metric.value
                };
                output.push(metric.type === 'counter'
                    ? {
                        name: metric.name,
                        unit: metricUnit(metric.name),
                        description: metric.description,
                        sum: {
                            aggregationTemporality: 2,
                            isMonotonic: true,
                            dataPoints: [dataPoint]
                        }
                    }
                    : {
                        name: metric.name,
                        unit: metricUnit(metric.name),
                        description: metric.description,
                        gauge: { dataPoints: [dataPoint] }
                    });
            }
        }

        output.push(...this.toHistograms(metrics, now));
        return output;
    }

    private toHistograms(metrics: MetricValue[], now: string): any[] {
        const groups = new Map<string, {
            name: string;
            labels: Record<string, string>;
            buckets: Map<string, number>;
            sum?: number;
            count?: number;
        }>();

        for (const metric of metrics) {
            if (metric.type !== 'histogram') {
                continue;
            }
            const match = /^(.*)_(bucket|sum|count)$/.exec(metric.name);
            if (!match) {
                continue;
            }
            const baseName = match[1];
            const labels = { ...(metric.labels ?? {}) };
            const bucketLabel = labels.le;
            delete labels.le;
            const key = `${baseName}|${JSON.stringify(Object.entries(labels).sort())}`;
            let group = groups.get(key);
            if (!group) {
                group = { name: baseName, labels, buckets: new Map() };
                groups.set(key, group);
            }
            if (match[2] === 'bucket' && bucketLabel != null) {
                group.buckets.set(bucketLabel, metric.value);
            } else if (match[2] === 'sum') {
                group.sum = metric.value;
            } else if (match[2] === 'count') {
                group.count = metric.value;
            }
        }

        return Array.from(groups.values()).map(group => {
            const bounds = Array.from(group.buckets.keys())
                .filter(le => le !== '+Inf')
                .map(Number)
                .filter(value => Number.isFinite(value))
                .sort((a, b) => a - b);
            const cumulative = bounds.map(bound => group.buckets.get(String(bound)) ?? 0);
            const inf = group.buckets.get('+Inf') ?? group.count ?? 0;
            const bucketCounts: number[] = [];
            let previous = 0;
            for (const value of cumulative) {
                bucketCounts.push(Math.max(0, value - previous));
                previous = value;
            }
            bucketCounts.push(Math.max(0, inf - previous));

            return {
                name: group.name,
                unit: metricUnit(group.name),
                histogram: {
                    aggregationTemporality: 2,
                    dataPoints: [{
                        attributes: toAttributes(group.labels),
                        startTimeUnixNano: now,
                        timeUnixNano: now,
                        count: group.count ?? inf,
                        sum: group.sum ?? 0,
                        bucketCounts,
                        explicitBounds: bounds
                    }]
                }
            };
        });
    }
}

/**
 * OTLP unit for a metric name. Duration metrics follow the Prometheus naming
 * convention (`_seconds` / `_ms`); everything else is unit-less.
 */
function metricUnit(name: string): string {
    if (name.endsWith('_seconds')) {
        return 's';
    }
    if (name.endsWith('_bytes')) {
        return 'By';
    }
    if (name.endsWith('_ms')) {
        return 'ms';
    }
    return '1';
}

function toAttributes(labels?: Record<string, string>): Array<{ key: string; value: { stringValue: string } }> {
    return Object.entries(labels ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value: { stringValue: String(value) } }));
}
