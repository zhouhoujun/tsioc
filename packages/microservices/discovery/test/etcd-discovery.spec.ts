import expect = require('expect');
import { EtcdServiceDiscovery } from '../src/etcd.discovery';

describe('EtcdServiceDiscovery', () => {
    function createApi() {
        const store = new Map<string, string>();
        const calls: Array<{ path: string; body: any }> = [];
        let leases = 0;
        const fetchImpl = (async (url: any, init: any) => {
            const path = new URL(String(url)).pathname;
            const body = JSON.parse(init.body);
            calls.push({ path, body });
            const decode = (value: string) => Buffer.from(value, 'base64').toString('utf-8');
            if (path === '/v3/lease/grant') {
                leases += 1;
                return { ok: true, status: 200, async json() { return { ID: String(leases), TTL: String(body.TTL) }; } } as any;
            }
            if (path === '/v3/lease/revoke') {
                return { ok: true, status: 200, async json() { return {}; } } as any;
            }
            if (path === '/v3/kv/put') {
                store.set(decode(body.key), decode(body.value));
                return { ok: true, status: 200, async json() { return {}; } } as any;
            }
            if (path === '/v3/kv/deleterange') {
                store.delete(decode(body.key));
                return { ok: true, status: 200, async json() { return {}; } } as any;
            }
            if (path === '/v3/kv/range') {
                const prefix = decode(body.key);
                const kvs = Array.from(store.entries())
                    .filter(([key]) => key.startsWith(prefix))
                    .map(([key, value]) => ({
                        key: Buffer.from(key).toString('base64'),
                        value: Buffer.from(value).toString('base64')
                    }));
                return { ok: true, status: 200, async json() { return { kvs }; } } as any;
            }
            return { ok: false, status: 404, async json() { return {}; } } as any;
        }) as any;
        return { store, calls, fetchImpl };
    }

    it('registers with a lease, discovers, updates and deregisters', async () => {
        const api = createApi();
        const discovery = new EtcdServiceDiscovery({
            url: 'http://etcd.local:2379',
            prefix: '/tsdi/test',
            ttlSeconds: 30,
            fetchImpl: api.fetchImpl
        });

        const endpoint = await discovery.register({
            id: 'users-1',
            name: 'users',
            address: '127.0.0.1',
            port: 4001,
            protocol: 'http',
            tags: ['blue'],
            metadata: { env: 'test' }
        });
        expect(endpoint.id).toBe('users-1');
        expect(api.calls.some(call => call.path === '/v3/lease/grant')).toBe(true);
        const put = api.calls.find(call => call.path === '/v3/kv/put');
        expect(put?.body.lease).toBe('1');

        const discovered = await discovery.discover('users');
        expect(discovered).toHaveLength(1);
        expect(discovered[0]).toMatchObject({ id: 'users-1', name: 'users', port: 4001, tags: ['blue'] });
        expect((await discovery.query({ name: 'users', tags: ['blue'], metadata: { env: 'test' } }))).toHaveLength(1);
        expect((await discovery.query({ name: 'users', tags: ['green'] }))).toHaveLength(0);

        await discovery.update('users-1', { weight: 5 });
        const updated = await discovery.discover('users');
        expect(updated[0].weight).toBe(5);

        await discovery.deregister('users-1');
        expect(await discovery.discover('users')).toEqual([]);
        expect(api.calls.some(call => call.path === '/v3/lease/revoke')).toBe(true);
        await discovery.shutdown();
    });

    it('lists services and reports health from the registry', async () => {
        const api = createApi();
        const discovery = new EtcdServiceDiscovery({ prefix: '/tsdi/test', ttlSeconds: 0, fetchImpl: api.fetchImpl });
        await discovery.register({ id: 'a1', name: 'alpha', address: '10.0.0.1', port: 1, protocol: 'http' });
        await discovery.register({ id: 'b1', name: 'beta', address: '10.0.0.2', port: 2, protocol: 'http' });
        expect((await discovery.getServices()).map(service => service.name).sort()).toEqual(['alpha', 'beta']);
        const [alpha] = await discovery.discover('alpha');
        expect(await discovery.healthCheck(alpha)).toBe(true);
        await discovery.shutdown();
    });
});
