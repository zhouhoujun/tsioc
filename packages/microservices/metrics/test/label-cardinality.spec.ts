import expect = require('expect');
import { normalizeMetricPath } from '../src/interceptors/metrics.interceptor';

describe('metric label cardinality', () => {
    it('prefers the matched route pattern over the raw url', () => {
        expect(normalizeMetricPath({
            pattern: '/api/users/:id',
            url: '/api/users/42?expand=roles'
        })).toBe('/api/users/:id');
        expect(normalizeMetricPath({
            pattern: { path: '/orders/:orderId' },
            url: '/orders/abc'
        })).toBe('/orders/:orderId');
    });

    it('strips queries and replaces numeric/uuid segments', () => {
        expect(normalizeMetricPath({ url: '/api/users/42/orders?page=2' })).toBe('/api/users/:id/orders');
        expect(normalizeMetricPath({
            url: '/api/users/550e8400-e29b-41d4-a716-446655440000/orders'
        })).toBe('/api/users/:id/orders');
    });

    it('normalizes relative and duplicate slashes', () => {
        expect(normalizeMetricPath({ url: 'api//users//42' })).toBe('/api/users/:id');
        expect(normalizeMetricPath({})).toBe('/');
    });

    it('caps very long paths so labels stay bounded', () => {
        const path = normalizeMetricPath({ url: `/${'segment/'.repeat(600)}` });
        expect(path.length).toBe(201);
        expect(path.endsWith('…')).toBe(true);
    });
});
