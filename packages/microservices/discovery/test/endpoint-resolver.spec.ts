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

    it('returns no endpoints without a discovery provider', async () => {
        const empty = new DefaultEndpointResolver(null);
        expect(await empty.resolve('svc')).toEqual([]);
        empty.onDestroy();
    });
});
