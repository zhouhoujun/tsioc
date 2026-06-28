import expect = require('expect');
import { MetricsRegistry } from '../src/registry';
import { ErrorCounter } from '../src/counters/error.counter';

describe('ErrorCounter', () => {
    it('registers http_errors_total on construction', () => {
        const reg = new MetricsRegistry();
        const counter = new ErrorCounter(reg);
        counter.recordError('GET', '/api', 500);
        const metrics = reg.getMetrics();
        const errorMetric = metrics.find(m => m.name === 'http_errors_total');
        expect(errorMetric).toBeDefined();
        expect(errorMetric!.value).toBe(1);
    });

    it('recordException increments with exception label', () => {
        const reg = new MetricsRegistry();
        const counter = new ErrorCounter(reg);
        counter.recordException('POST', '/api', 'TypeError');
        const metrics = reg.getMetrics();
        const errorMetric = metrics.find(m => m.name === 'http_errors_total');
        expect(errorMetric!.value).toBe(1);
    });

    it('recordError with different statuses records separate entries', () => {
        const reg = new MetricsRegistry();
        const counter = new ErrorCounter(reg);
        counter.recordError('GET', '/api', 500);
        counter.recordError('GET', '/api', 502);
        const metrics = reg.getMetrics().filter(m => m.name === 'http_errors_total');
        expect(metrics.length).toBe(2);
        const total = metrics.reduce((s, m) => s + m.value, 0);
        expect(total).toBe(2);
    });
});
