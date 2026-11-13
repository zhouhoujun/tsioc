import expect = require('expect');
import { InMemoryServiceDiscovery } from '../src/memory.discovery';
import { DefaultEndpointResolver } from '../src/endpoint-resolver';

describe('DefaultEndpointResolver', () => {
    let discovery: InMemoryServiceDiscovery;
    let resolver: DefaultEndpointResolver;

    beforeEach(() => {
        discovery = new InMemoryServiceDiscovery();
        resolver = new DefaultEndpointResolver(discovery, { cacheExpiration: 60 });
    });

    afterEach(async () => {
        resolver.onDestroy();
        await discovery.shutdown();
    });

    it('filters endpoints by protocol, version and tags', async () => {
        await discovery.register({ name: 'svc', id: 'http-v1', address: 'http://a', protocol: 'http', version: 'v1', tags: ['blue'] });
        await discovery.register({ name: 'svc', id: 'grpc-v1', address: 'grpc://b', protocol: 'grpc', version: 'v1', tags: ['blue'] });
        await discovery.register({ name: 'svc', id: 'http-v2', address: 'http://c', protocol: 'http', version: 'v2', tags: ['green'] });

        const http = await resolver.resolve('svc', { protocol: 'http', version: 'v1', tags: ['blue'] });
        expect(http.map(endpoint => endpoint.id)).toEqual(['http-v1']);

        const grpc = await resolver.resolve('svc', { protocol: 'grpc' });
        expect(grpc.map(endpoint => endpoint.id)).toEqual(['grpc-v1']);
    });

    it('invalidates cached endpoints when the registry changes', async () => {
        await discovery.register({ name: 'svc', id: 'a', address: 'http://a', protocol: 'http' });
        expect((await resolver.resolve('svc')).length).toBe(1);

        await discovery.register({ name: 'svc', id: 'b', address: 'http://b', protocol: 'http' });
        expect((await resolver.resolve('svc')).length).toBe(2);
    });

    it('serves cached endpoints when the registry fails', async () => {
        const calls = { discover: 0 };
        let fail = false;
        const fake = {
            discover: async () => {
                calls.discover += 1;
                if (fail) throw new Error('registry down');
                return [{ id: 'a', name: 'svc', address: 'http://a', status: 'UP' }];
            },
            watch: async () => undefined,
            unwatch: async () => undefined
        } as any;
        const fallbackResolver = new DefaultEndpointResolver(fake, { cacheExpiration: 60, retryInterval: 1 });

        expect((await fallbackResolver.resolve('svc')).length).toBe(1);
        fail = true;
        const stale = await fallbackResolver.resolve('svc', { force: true });
        expect(stale.map(endpoint => endpoint.id)).toEqual(['a']);
        expect(fallbackResolver.getLastError('svc')?.message).toBe('registry down');

        fallbackResolver.onDestroy();
    });

    it('backs off repeated registry failures without cached endpoints', async () => {
        const calls = { discover: 0 };
        const fake = {
            discover: async () => {
                calls.discover += 1;
                throw new Error('registry down');
            },
            watch: async () => undefined,
            unwatch: async () => undefined
        } as any;
        const fallbackResolver = new DefaultEndpointResolver(fake, { retryInterval: 10 });

        expect(await fallbackResolver.resolve('svc')).toEqual([]);
        expect(await fallbackResolver.resolve('svc')).toEqual([]);
        expect(calls.discover).toBe(1);
        expect(fallbackResolver.getLastError('svc')).toBeInstanceOf(Error);

        fallbackResolver.onDestroy();
    });

    it('returns no endpoints without a discovery provider', async () => {
        const empty = new DefaultEndpointResolver(null);
        expect(await empty.resolve('svc')).toEqual([]);
        empty.onDestroy();
    });
});
