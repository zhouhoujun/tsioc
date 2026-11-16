import expect = require('expect');
import { GatewayRouteOptions, ResolvedGatewayRoute } from '../src/gateway.options';
import { GatewayRouteTable } from '../src/gateway.route-table';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';

function compile(routes: GatewayRouteOptions[], normalize = (path: string) => path.split('?')[0] || '/') {
    const resolved = new Map<GatewayRouteOptions, number>();
    const table = GatewayRouteTable.compile(routes, {
        normalizePath: normalize,
        resolve: route => {
            resolved.set(route, (resolved.get(route) ?? 0) + 1);
            return route as ResolvedGatewayRoute;
        }
    });
    return { table, resolved };
}

function paths(...items: string[]): GatewayRouteOptions[] {
    return items.map(path => ({ path, service: path.split('/').filter(Boolean)[1] ?? 'svc' }));
}

describe('GatewayRouteTable', () => {
    it('matches on segment boundaries and prefixes', () => {
        const { table } = compile(paths('/api/users'));

        expect(table.match({ url: '/api/users', method: 'GET' })?.path).toBe('/api/users');
        expect(table.match({ url: '/api/users/42/profile', method: 'GET' })?.path).toBe('/api/users');
        expect(table.match({ url: '/api/users2', method: 'GET' })).toBeNull();
        expect(table.match({ url: '/api', method: 'GET' })).toBeNull();
    });

    it('prefers static over param over wildcard and longer paths', () => {
        const { table } = compile(paths(
            '/api/*',
            '/api/users',
            '/api/users/:id',
            '/api/users/special'
        ));

        expect(table.match({ url: '/api/users/special', method: 'GET' })?.path).toBe('/api/users/special');
        expect(table.match({ url: '/api/users/42', method: 'GET' })?.path).toBe('/api/users/:id');
        expect(table.match({ url: '/api/users/42/profile', method: 'GET' })?.path).toBe('/api/users/:id');
        expect(table.match({ url: '/api/orders', method: 'GET' })?.path).toBe('/api/*');
    });

    it('matches the root and root wildcard routes for any path', () => {
        expect(compile(paths('/')).table.match({ url: '/anything/deep', method: 'GET' })?.path).toBe('/');
        expect(compile(paths('/*')).table.match({ url: '/anything/deep', method: 'GET' })?.path).toBe('/*');
    });

    it('filters by method and host', () => {
        const routes: GatewayRouteOptions[] = [
            { path: '/api', service: 'svc', methods: ['POST'], hosts: ['api.example.com'] },
            { path: '/api', service: 'svc-get', methods: ['get'] }
        ];
        const { table } = compile(routes);

        expect(table.match({ url: '/api/x', method: 'GET', host: 'api.example.com' })?.service).toBe('svc-get');
        expect(table.match({ url: '/api/x', method: 'POST', host: 'api.example.com' })?.service).toBe('svc');
        expect(table.match({ url: '/api/x', method: 'POST', host: 'other.example.com' })).toBeNull();
        expect(table.match({ url: '/api/x', method: 'DELETE', host: 'api.example.com' })).toBeNull();
    });

    it('falls back to the next candidate when request checks reject a route', () => {
        const routes = paths('/api/users/special', '/api/users/:id');
        const { table } = compile(routes);

        const matched = table.match({
            url: '/api/users/special',
            method: 'GET',
            accepts: route => route.path !== '/api/users/special'
        });

        expect(matched?.path).toBe('/api/users/:id');
    });

    it('keeps declaration order for equal specificity', () => {
        const first: GatewayRouteOptions = { path: '/api/:id', service: 'first' };
        const second: GatewayRouteOptions = { path: '/api/:name', service: 'second' };
        const { table } = compile([first, second]);

        expect(table.match({ url: '/api/42', method: 'GET' })?.service).toBe('first');
    });

    it('skips disabled routes', () => {
        const { table } = compile([
            { path: '/api', service: 'off', enabled: false }
        ]);

        expect(table.size).toBe(0);
        expect(table.match({ url: '/api', method: 'GET' })).toBeNull();
    });

    it('preserves legacy prefix matching semantics', () => {
        const { table } = compile(paths('/api/users', '/api/users/special'));

        expect(table.match({ url: '/api/users/1', method: 'GET', legacy: true })?.path).toBe('/api/users');
        expect(table.match({ url: '/api/users2', method: 'GET', legacy: true })?.path).toBe('/api/users');
    });

    it('compiles defaults and specificity once, not per match', () => {
        const routes = paths('/api/users', '/api/users/:id');
        const { table, resolved } = compile(routes);

        for (let i = 0; i < 50; i++) {
            table.match({ url: '/api/users/42', method: 'GET' });
        }

        expect(resolved.get(routes[0])).toBe(1);
        expect(resolved.get(routes[1])).toBe(1);
    });

    it('matches one route out of a large table without scanning every route', () => {
        const routes: GatewayRouteOptions[] = [];
        for (let i = 0; i < 20000; i++) {
            routes.push({ path: `/api/service-${i}/items/:id`, service: `service-${i}` });
        }
        const { table } = compile(routes);

        expect(table.match({ url: '/api/service-19999/items/7', method: 'GET' })?.service).toBe('service-19999');
        expect(table.match({ url: '/api/service-0/items/7/more', method: 'GET' })?.service).toBe('service-0');
        expect(table.match({ url: '/api/unknown/items/7', method: 'GET' })).toBeNull();
    });
});

describe('GatewayInterceptor route table caching', () => {
    it('rebuilds the compiled table when the config revision changes', () => {
        const runtime = new GatewayRuntime();
        const interceptor = new GatewayInterceptor(
            { routes: [{ path: '/api', service: 'a' }] } as any,
            null,
            null,
            runtime
        );

        expect(interceptor.previewMatch({ path: '/api/x' }).route?.service).toBe('a');

        runtime.setDynamicOptions({ routes: [{ path: '/api', service: 'b' }] });

        expect(interceptor.previewMatch({ path: '/api/x' }).route?.service).toBe('b');
    });
});
