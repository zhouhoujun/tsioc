import { Abstract } from '@tsdi/ioc';
import { MetricValue } from './metrics';

/**
 * Metrics collector abstract interface.
 *
 * 指标收集器抽象接口，用于收集和存储各种类型的指标。
 */
@Abstract()
export abstract class MetricsCollector {
    /**
     * increment counter by value.
     * @param name metric name.
     * @param value increment value (default 1).
     * @param labels metric labels.
     */
    abstract increment(name: string, value?: number, labels?: Record<string, string>): void;

    /**
     * decrement counter by value.
     * @param name metric name.
     * @param value decrement value (default 1).
     * @param labels metric labels.
     */
    abstract decrement(name: string, value?: number, labels?: Record<string, string>): void;

    /**
     * set gauge value.
     * @param name metric name.
     * @param value gauge value.
     * @param labels metric labels.
     */
    abstract gauge(name: string, value: number, labels?: Record<string, string>): void;

    /**
     * observe histogram value.
     * @param name metric name.
     * @param value observed value.
     * @param labels metric labels.
     */
    abstract histogram(name: string, value: number, labels?: Record<string, string>): void;

    /**
     * record timing/duration.
     * @param name metric name.
     * @param duration duration in milliseconds.
     * @param labels metric labels.
     */
    abstract timing(name: string, duration: number, labels?: Record<string, string>): void;

    /**
     * get all collected metrics.
     * @returns array of metric values.
     */
    abstract getMetrics(): MetricValue[];

    /**
     * reset metrics (clear all or specific metric).
     * @param name optional metric name to reset.
     */
    abstract reset(name?: string): void;

    /**
     * register a metric definition.
     * @param options metric options.
     */
    abstract register(options: MetricOptions): void;
}

import { MetricOptions } from './metrics';