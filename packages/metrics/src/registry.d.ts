import { MetricValue, MetricOptions } from './metrics';
import { MetricsCollector } from './collector';
/**
 * In-memory metrics registry.
 *
 * 内存指标注册中心，存储和管理所有指标。
 */
export declare class MetricsRegistry extends MetricsCollector {
    private counters;
    private gauges;
    private histograms;
    private descriptions;
    private prefix;
    private defaultLabels;
    setPrefix(prefix: string): void;
    setDefaultLabels(labels: Record<string, string>): void;
    private getFullName;
    private getLabelsKey;
    register(options: MetricOptions): void;
    increment(name: string, value?: number, labels?: Record<string, string>): void;
    decrement(name: string, value?: number, labels?: Record<string, string>): void;
    gauge(name: string, value: number, labels?: Record<string, string>): void;
    histogram(name: string, value: number, labels?: Record<string, string>): void;
    timing(name: string, duration: number, labels?: Record<string, string>): void;
    getMetrics(): MetricValue[];
    private parseLabelsKey;
    reset(name?: string): void;
}
