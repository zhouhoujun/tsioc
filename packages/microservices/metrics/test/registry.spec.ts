import expect = require('expect');
import { MetricsRegistry } from '../src/registry';

describe('MetricsRegistry', () => {
    it('increment adds to counter', () => {
        const reg = new MetricsRegistry();
        reg.increment('requests');
        reg.increment('requests');
        const metrics = reg.getMetrics();
        const reqMetric = metrics.find(m => m.name === 'requests');
        expect(reqMetric).toBeDefined();
        expect(reqMetric!.value).toBe(2);
    });

    it('decrement subtracts from counter', () => {
        const reg = new MetricsRegistry();
        reg.increment('workers', 5);
        reg.decrement('workers', 2);
        const metrics = reg.getMetrics();
        const wMetric = metrics.find(m => m.name === 'workers');
        expect(wMetric!.value).toBe(3);
    });

    it('gauge sets value', () => {
        const reg = new MetricsRegistry();
        reg.gauge('memory', 1024);
        reg.gauge('memory', 2048);
        const metrics = reg.getMetrics();
        const memMetric = metrics.find(m => m.name === 'memory');
        expect(memMetric!.value).toBe(2048);
    });

    it('histogram records values into buckets', () => {
        const reg = new MetricsRegistry();
        reg.histogram('latency', 50);
        reg.histogram('latency', 150);
        const metrics = reg.getMetrics();
        const buckets = metrics.filter(m => m.name === 'latency_bucket');
        expect(buckets.length).toBeGreaterThan(0);
        const count = metrics.find(m => m.name === 'latency_count');
        expect(count!.value).toBe(2);
    });

    it('timing delegates to histogram', () => {
        const reg = new MetricsRegistry();
        reg.timing('request_duration', 100);
        const metrics = reg.getMetrics();
        const count = metrics.find(m => m.name === 'request_duration_count');
        expect(count!.value).toBe(1);
    });

    it('getMetrics returns all types', () => {
        const reg = new MetricsRegistry();
        reg.increment('req_total');
        reg.gauge('conn_active', 5);
        const metrics = reg.getMetrics();
        expect(metrics.length).toBe(2);
        expect(metrics[0].type).toBe('counter');
        expect(metrics[1].type).toBe('gauge');
    });

    it('reset(name) clears specific metric', () => {
        const reg = new MetricsRegistry();
        reg.increment('a');
        reg.increment('b');
        reg.reset('a');
        const metrics = reg.getMetrics();
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe('b');
    });

    it('reset() clears all', () => {
        const reg = new MetricsRegistry();
        reg.increment('a');
        reg.increment('b');
        reg.reset();
        expect(reg.getMetrics().length).toBe(0);
    });

    it('prefix affects metric names', () => {
        const reg = new MetricsRegistry();
        reg.setPrefix('myapp');
        reg.increment('requests');
        const metrics = reg.getMetrics();
        expect(metrics[0].name).toBe('myapp_requests');
    });

    it('defaultLabels are applied', () => {
        const reg = new MetricsRegistry();
        reg.setDefaultLabels({ app: 'test' });
        reg.increment('req', 1, { path: '/api' });
        const metrics = reg.getMetrics();
        expect(metrics[0].labels).toBeDefined();
    });

    it('register stores description', () => {
        const reg = new MetricsRegistry();
        reg.register({ name: 'my_metric', description: 'A test metric' });
        reg.increment('my_metric');
        const metrics = reg.getMetrics();
        expect(metrics[0].description).toBe('A test metric');
    });
});
