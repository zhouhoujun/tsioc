import expect = require('expect');
import { GatewayConfigDiff } from '@tsdi/gateway';
import { buildSloAlertsCsv, countConfigDiff, formatAlertTime, formatDiffFields, formatDiffValue, routeMethodsKey, validateRouteFields } from '../web/admin.state.pure';

describe('admin state pure helpers', () => {
    const t = (key: string) => key;

    it('formats alert times as HH:MM:SS', () => {
        const timestamp = Date.UTC(2026, 10, 16, 12, 34, 56);
        expect(formatAlertTime(timestamp)).toBe('12:34:56');
        expect(formatAlertTime(Number.NaN)).toBe('');
    });

    it('builds quoted SLO alert CSV rows', () => {
        const csv = buildSloAlertsCsv([{
            key: 'users"service:/api/users:2',
            timestamp: Date.UTC(2026, 10, 16, 1, 2, 3),
            errorRate: 0.2,
            p95Ms: 1200,
            errorRateThreshold: 0.1
        }]);
        const lines = csv.split('\n');
        expect(lines[0]).toBe('"key","timestamp","isoTime","errorRate","p95Ms","errorRateThreshold","p95ThresholdMs"');
        expect(lines[1]).toContain('"users""service:/api/users:2"');
        expect(lines[1]).toContain('"2026-11-16T01:02:03.000Z"');
        expect(lines[1]).toContain('"0.2"');
        expect(lines[1]).toContain('"1200"');
        expect(lines[1]).toContain('"0.1"');
        expect(lines[1].endsWith(',""')).toBe(true);
        expect(buildSloAlertsCsv([]).split('\n').length).toBe(1);
    });

    it('formats diff values and changed fields', () => {
        expect(formatDiffValue(undefined)).toBe('undefined');
        expect(formatDiffValue(null)).toBe('null');
        expect(formatDiffValue('short')).toBe('short');
        expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
        expect(formatDiffValue('x'.repeat(61))).toBe(`${'x'.repeat(60)}…`);

        const diff: GatewayConfigDiff = {
            routes: {
                added: [],
                removed: [],
                changed: ['/api/users'],
                changedFields: { '/api/users': ['path', 'timeout', 'deleted'] },
                changedValues: {
                    '/api/users': {
                        path: { before: '/api/user', after: '/api/users' },
                        timeout: { before: 1000, after: 2000 }
                    }
                }
            },
            rules: { added: ['r1'], removed: [], changed: [] },
            options: ['rateLimit']
        };
        expect(formatDiffFields(diff, 'routes', '/api/users')).toBe('path: /api/user → /api/users, timeout: 1000 → 2000, deleted');
        expect(formatDiffFields(diff, 'routes', '/missing')).toBe('');
        expect(countConfigDiff(diff)).toBe(3);
        expect(countConfigDiff(undefined)).toBe(0);
    });

    it('normalizes route method keys', () => {
        expect(routeMethodsKey({ path: '/a' } as any)).toBe('ANY');
        expect(routeMethodsKey({ path: '/a', methods: ['post', 'GET', ' post '] } as any)).toBe('GET,POST');
    });

    it('validates route paths, targets, methods and slo thresholds', () => {
        const errors = validateRouteFields({ path: 'api', service: '' } as any, { t, routes: [] });
        expect(errors.path).toBe('validation.pathSlash');
        expect(errors.service).toBe('validation.serviceRequired');

        expect(validateRouteFields({ path: '/a b', service: 'svc' } as any, { t, routes: [] }).path)
            .toBe('validation.pathSpace');
        expect(validateRouteFields({ path: '/a', service: 'svc', targetUrl: 'ftp://x' } as any, { t, routes: [] }).targetUrl)
            .toBe('validation.url');
        expect(validateRouteFields({ path: '/a', service: 'svc', targetPath: 'v2' } as any, { t, routes: [] }).targetPath)
            .toBe('validation.pathSlash');
        expect(validateRouteFields({ path: '/a', service: 'svc', timeout: 600001 } as any, { t, routes: [] }).timeout)
            .toBe('validation.timeout');
        expect(validateRouteFields({ path: '/a', service: 'svc', methods: ['FETCH'] } as any, { t, routes: [] }).methods)
            .toBe('validation.methods');
        expect(validateRouteFields({ path: '/a', service: 'svc', slo: { errorRateThreshold: 1.5 } } as any, { t, routes: [] }).slo)
            .toBe('validation.sloErrorRate');
        expect(validateRouteFields({ path: '/a', service: 'svc', slo: { p95ThresholdMs: 0 } } as any, { t, routes: [] }).slo)
            .toBe('validation.sloP95');
    });

    it('detects duplicate path and method combinations', () => {
        const routes = [
            { path: '/api/users', methods: ['GET'] },
            { path: '/api/orders', methods: ['POST'] }
        ] as any;
        expect(validateRouteFields({ path: '/api/users', service: 'svc', methods: ['get'] } as any, { t, routes }))
            .toMatchObject({ path: 'validation.duplicate' });
        expect(validateRouteFields({ path: '/api/users', service: 'svc', methods: ['GET'] } as any, { t, routes, index: 0 }))
            .toEqual({});
        expect(validateRouteFields({ path: '/api/users', service: 'svc', methods: ['POST'] } as any, { t, routes }))
            .toEqual({});
    });
});
