import expect = require('expect');
import { formatRoutes, listRoutes, stateUrl } from '../src/routes-cli';

describe('admin routes cli', () => {
    function response(status: number, body?: any) {
        return {
            status,
            ok: status >= 200 && status < 300,
            async json() { return body; }
        } as Response;
    }

    const routes = [
        { path: '/api/users', service: 'users-service', methods: ['GET', 'POST'], auth: {}, rateLimit: { limit: 10 }, enabled: true },
        { path: '/api/internal', targetUrl: 'http://internal', enabled: false }
    ] as any;

    it('builds the state url', () => {
        expect(stateUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000/api/gateway-admin/state');
        expect(stateUrl('http://127.0.0.1:3000/')).toBe('http://127.0.0.1:3000/api/gateway-admin/state');
        expect(stateUrl('http://127.0.0.1:3000/api/gateway-admin/state')).toBe('http://127.0.0.1:3000/api/gateway-admin/state');
    });

    it('loads routes with an optional token', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const result = await listRoutes({
            url: 'http://admin.local',
            token: 'secret',
            fetchImpl: (async (url: any, init: any) => {
                calls.push({ url: String(url), init });
                return response(200, { routes });
            }) as any
        });
        expect(calls[0].url).toBe('http://admin.local/api/gateway-admin/state');
        expect(calls[0].init.headers).toEqual({ authorization: 'Bearer secret' });
        expect(result.length).toBe(2);
    });

    it('returns an empty list when state has no routes', async () => {
        await expect(listRoutes({
            url: 'http://admin.local',
            fetchImpl: (async () => response(200, {})) as any
        })).resolves.toEqual([]);
    });

    it('reports unauthorized and unavailable endpoints', async () => {
        await expect(listRoutes({
            url: 'http://admin.local',
            fetchImpl: (async () => response(401)) as any
        })).rejects.toThrow(/pass --token/);

        await expect(listRoutes({
            url: 'http://admin.local',
            fetchImpl: (async () => response(500)) as any
        })).rejects.toThrow(/check that the admin console is running/);
    });

    it('formats a compact route table with flags', () => {
        const text = formatRoutes(routes);
        expect(text.split('\n')[0]).toBe('routes: 2');
        expect(text).toContain('/api/users');
        expect(text).toContain('users-service');
        expect(text).toContain('[enabled auth rate-limit]');
        expect(text).toContain('/api/internal');
        expect(text).toContain('[disabled]');
    });
});
