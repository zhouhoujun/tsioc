import expect = require('expect');
import {
    GatewayConfigService,
    GatewayConfigValidationError,
    GatewayConfigVersionError
} from '../src/gateway.config.service';
import { GatewayRuntime } from '../src/gateway.runtime';

describe('GatewayConfigService', () => {
    function create() {
        const runtime = new GatewayRuntime();
        const service = new GatewayConfigService(runtime, { routes: [] });
        return { runtime, service };
    }

    it('applies a valid patch atomically and bumps the version', () => {
        const { runtime, service } = create();
        const routes = [{ path: '/api/users', service: 'users' }];

        const result = service.apply({ routes }, { source: 'test' });

        expect(result.applied).toBe(true);
        expect(result.version).toBe(1);
        expect(result.diff.routes.added).toEqual(['/api/users:users']);
        expect(service.getVersion()).toBe(1);
        expect(runtime.getRoutes([])).toEqual(routes);
        expect(service.getHistory()[0].version).toBe(1);
    });

    it('returns a diff without applying when dryRun is set', () => {
        const { runtime, service } = create();
        const result = service.apply({
            routes: [{ path: '/api/users', service: 'users' }]
        }, { dryRun: true });

        expect(result.applied).toBe(false);
        expect(result.dryRun).toBe(true);
        expect(result.version).toBe(0);
        expect(service.getVersion()).toBe(0);
        expect(runtime.getRoutes([])).toEqual([]);
    });

    it('rejects invalid routes without touching the live runtime', () => {
        const { runtime, service } = create();
        service.apply({ routes: [{ path: '/ok', service: 's' }] });
        const before = runtime.getRoutes([]);

        expect(() => service.apply({
            routes: [
                { path: 'bad', service: 's' },
                { path: '/ok', service: 's' }
            ]
        })).toThrow(GatewayConfigValidationError);
        expect(service.getVersion()).toBe(1);
        expect(runtime.getRoutes([])).toEqual(before);
    });

    it('detects duplicate path and method combinations', () => {
        const { service } = create();
        expect(() => service.apply({
            routes: [
                { path: '/api/users', service: 'a', methods: ['GET'] },
                { path: '/api/users', service: 'b', methods: ['get'] }
            ]
        })).toThrow(/duplicates route/);
    });

    it('rejects invalid rules', () => {
        const { service } = create();
        expect(() => service.apply({
            rules: [{ id: 'r1', when: [], action: { type: 'deny' } } as any]
        })).toThrow(/when must contain/);

        expect(() => service.apply({
            rules: [{ id: 'r1', when: [{ field: 'path', operator: 'prefix', value: '/x' }], action: { type: 'route' } } as any]
        })).toThrow(/action requires/);
    });

    it('enforces optimistic concurrency with expectedVersion', () => {
        const { service } = create();
        service.apply({ routes: [{ path: '/a', service: 's' }] });

        expect(() => service.apply(
            { routes: [{ path: '/b', service: 's' }] },
            { expectedVersion: 0 }
        )).toThrow(GatewayConfigVersionError);
        expect(service.getVersion()).toBe(1);

        const result = service.apply(
            { routes: [{ path: '/b', service: 's' }] },
            { expectedVersion: 1 }
        );
        expect(result.version).toBe(2);
    });

    it('merges routes by path and service when requested', () => {
        const { runtime, service } = create();
        service.apply({ routes: [{ path: '/a', service: 's' }] });
        service.apply({
            routes: [
                { path: '/a', service: 's', enabled: false },
                { path: '/b', service: 's' }
            ]
        }, { mergeRoutes: true });

        const routes = runtime.getRoutes([]);
        expect(routes.length).toBe(2);
        expect(routes.find(route => route.path === '/a')?.enabled).toBe(false);
    });

    it('removes a key when the patch value is null', () => {
        const { runtime, service } = create();
        const staticRoutes = [{ path: '/static', service: 's' }];
        service.apply({ routes: [{ path: '/dynamic', service: 's' }] });
        expect(runtime.getRoutes(staticRoutes).length).toBe(1);

        service.apply({ routes: null } as any);
        expect(runtime.getRoutes(staticRoutes)).toEqual(staticRoutes);
    });

    it('rolls back to a history version as a new version', () => {
        const { runtime, service } = create();
        service.apply({ routes: [{ path: '/v1', service: 's' }] });
        service.apply({ routes: [{ path: '/v2', service: 's' }] });
        expect(runtime.getRoutes([])[0].path).toBe('/v2');

        const result = service.rollback(1);
        expect(result.version).toBe(3);
        expect(runtime.getRoutes([])[0].path).toBe('/v1');
        expect(service.getHistory()[0].source).toBe('rollback:1');
    });

    it('reports changed fields for modified routes', () => {
        const { service } = create();
        service.apply({ routes: [{ path: '/a', service: 's' }] });
        const result = service.apply({
            routes: [{ path: '/a', service: 's', enabled: false, timeout: 100 }]
        }, { mergeRoutes: true });

        expect(result.diff.routes.changed).toContain('/a:s');
        expect(result.diff.routes.changedFields?.['/a:s']).toEqual(['enabled', 'timeout']);
    });

    it('tracks option changes in the diff', () => {
        const { service } = create();
        const result = service.apply({ routeMatching: 'legacy' });
        expect(result.diff.options).toContain('routeMatching');
    });
});
