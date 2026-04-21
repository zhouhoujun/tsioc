"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsRegistry = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("./collector");
/**
 * In-memory metrics registry.
 *
 * 内存指标注册中心，存储和管理所有指标。
 */
let MetricsRegistry = class MetricsRegistry extends collector_1.MetricsCollector {
    constructor() {
        super(...arguments);
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.descriptions = new Map();
        this.prefix = '';
        this.defaultLabels = {};
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
    setDefaultLabels(labels) {
        this.defaultLabels = labels;
    }
    getFullName(name) {
        return this.prefix ? `${this.prefix}_${name}` : name;
    }
    getLabelsKey(labels) {
        const allLabels = { ...this.defaultLabels, ...labels };
        return Object.entries(allLabels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }
    register(options) {
        const fullName = this.getFullName(options.name);
        if (options.description) {
            this.descriptions.set(fullName, options.description);
        }
    }
    increment(name, value = 1, labels) {
        const fullName = this.getFullName(name);
        if (!this.counters.has(fullName)) {
            this.counters.set(fullName, new Map());
        }
        const key = this.getLabelsKey(labels);
        const current = this.counters.get(fullName).get(key) || 0;
        this.counters.get(fullName).set(key, current + value);
    }
    decrement(name, value = 1, labels) {
        this.increment(name, -value, labels);
    }
    gauge(name, value, labels) {
        const fullName = this.getFullName(name);
        if (!this.gauges.has(fullName)) {
            this.gauges.set(fullName, new Map());
        }
        const key = this.getLabelsKey(labels);
        this.gauges.get(fullName).set(key, value);
    }
    histogram(name, value, labels) {
        const fullName = this.getFullName(name);
        if (!this.histograms.has(fullName)) {
            this.histograms.set(fullName, {
                buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
                values: new Map()
            });
        }
        const key = this.getLabelsKey(labels);
        const hist = this.histograms.get(fullName);
        if (!hist.values.has(key)) {
            hist.values.set(key, { counts: new Array(hist.buckets.length + 1).fill(0), sum: 0, count: 0 });
        }
        const data = hist.values.get(key);
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
    timing(name, duration, labels) {
        this.histogram(name, duration, labels);
    }
    getMetrics() {
        const result = [];
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
    parseLabelsKey(key) {
        if (!key)
            return {};
        const result = {};
        const pairs = key.split(',');
        for (const pair of pairs) {
            const [k, v] = pair.split('=');
            if (k && v) {
                result[k] = v.replace(/^"|"$/g, '');
            }
        }
        return result;
    }
    reset(name) {
        if (name) {
            const fullName = this.getFullName(name);
            this.counters.delete(fullName);
            this.gauges.delete(fullName);
            this.histograms.delete(fullName);
        }
        else {
            this.counters.clear();
            this.gauges.clear();
            this.histograms.clear();
        }
    }
};
exports.MetricsRegistry = MetricsRegistry;
exports.MetricsRegistry = MetricsRegistry = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], MetricsRegistry);
//# sourceMappingURL=registry.js.map