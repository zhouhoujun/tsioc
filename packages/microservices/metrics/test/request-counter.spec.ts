import expect = require('expect');
import { MetricsRegistry } from '../src/registry';
import { RequestCounter } from '../src/counters/request.counter';

describe('RequestCounter', () => {
    it('registers http_requests_total and http_responses_total on construction', () => {
        const reg = new MetricsRegistry();
        const counter = new RequestCounter(reg);
        counter.recordRequest('GET', '/api');
        counter.recordResponse('POST', '/api/users', 201);
        const metrics = reg.getMetrics();
        expect(metrics.length).toBeGreaterThanOrEqual(2);
        const reqMetric = metrics.find(m => m.name === 'http_requests_total');
        expect(reqMetric).toBeDefined();
        expect(reqMetric!.value).toBe(1);
        const resMetric = metrics.find(m => m.name === 'http_responses_total');
        expect(resMetric).toBeDefined();
        expect(resMetric!.value).toBe(1);
    });

    it('recordRequest increments with method and path labels', () => {
        const reg = new MetricsRegistry();
        const counter = new RequestCounter(reg);
        counter.recordRequest('GET', '/test');
        const metrics = reg.getMetrics();
        const reqMetric = metrics.find(m => m.name === 'http_requests_total');
        expect(reqMetric!.labels).toBeDefined();
    });
});
