import expect = require('expect');
import { AdminViewController } from '../web/admin.view.controller';

describe('admin view derived caches', () => {
    function createHost(overrides: any = {}) {
        return {
            page: 'routes',
            locale: 'en',
            routeQuery: '',
            routeFilter: 'all',
            routes: [
                { path: '/api/users', service: 'users-service', enabled: true, auth: {}, rateLimit: { limit: 1 } },
                { path: '/api/orders', service: 'orders-service', enabled: false }
            ],
            diagnostics: undefined,
            routeDetail: undefined,
            serviceDetails: [],
            authMode: 'none',
            t: (key: string) => key,
            ...overrides
        } as any;
    }

    it('reuses filtered routes until the source, query or filter changes', () => {
        const host = createHost();
        const view = new AdminViewController(host);

        const first = view.filteredRoutes;
        expect(view.filteredRoutes).toBe(first);
        expect(view.enabledRoutes).toBe(1);

        host.routeQuery = 'orders';
        const filtered = view.filteredRoutes;
        expect(filtered).not.toBe(first);
        expect(filtered.map((route: any) => route.path)).toEqual(['/api/orders']);
        expect(view.filteredRoutes).toBe(filtered);

        host.routes = [...host.routes, { path: '/api/teams', service: 'teams-service', enabled: true }];
        expect(view.enabledRoutes).toBe(2);
        expect(view.filteredRoutes).not.toBe(filtered);
    });

    it('caches service/policy summaries by routes reference', () => {
        const host = createHost();
        const view = new AdminViewController(host);

        const summaries = view.serviceSummaries;
        expect(view.serviceSummaries).toBe(summaries);
        expect(summaries).toEqual([
            { name: 'orders-service', routes: 1, enabled: 0 },
            { name: 'users-service', routes: 1, enabled: 1 }
        ]);
        const counts = view.policyCounts;
        expect(view.policyCounts).toBe(counts);
        expect(counts).toMatchObject({ auth: 1, rateLimit: 1 });

        host.routes = host.routes.map((route: any) => route.service === 'users-service'
            ? { ...route, auth: undefined }
            : route);
        expect(view.policyCounts).not.toBe(counts);
        expect(view.policyCounts.auth).toBe(0);
    });

    it('invalidates policy row labels when the locale changes', () => {
        const host = createHost();
        const view = new AdminViewController(host);
        const rows = view.policyRows;
        expect(view.policyRows).toBe(rows);

        host.locale = 'zh-CN';
        expect(view.policyRows).not.toBe(rows);
    });

    it('caches diagnostics and route detail projections by identity', () => {
        const host = createHost({
            diagnostics: {
                circuits: [{ open: true }, { open: false }],
                alerts: [{ key: 'a' }, { key: 'b' }],
                routes: [{ requests: 1 }, { requests: 5 }],
                bulkheads: [{ active: 1, queued: 2, adaptive: true }]
            },
            routeDetail: { path: '/api/users' }
        });
        const view = new AdminViewController(host);

        expect(view.openCircuitCount).toBe(1);
        expect(view.routeSloRows[0]).toEqual({ requests: 5 });
        expect(view.recentSloAlerts.length).toBe(2);
        expect(view.bulkheadActive).toBe(1);
        expect(view.bulkheadQueued).toBe(2);
        expect(view.adaptiveBulkheadCount).toBe(1);

        const json = view.routeDetailJson;
        expect(view.routeDetailJson).toBe(json);

        host.routeDetail = { path: '/api/orders' };
        expect(view.routeDetailJson).not.toBe(json);
        expect(view.routeDetailJson).toContain('/api/orders');
    });
});
