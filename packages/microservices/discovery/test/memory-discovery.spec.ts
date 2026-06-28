import expect = require('expect');
import { InMemoryServiceDiscovery } from '../src/memory.discovery';
import { ServiceInfo, ServiceEndpoint, ServiceQuery } from '../src/discovery';

describe('InMemoryServiceDiscovery', () => {
    function createDiscovery() {
        return new InMemoryServiceDiscovery();
    }

    function sampleInfo(overrides: Partial<ServiceInfo> = {}): ServiceInfo {
        return {
            name: 'my-service',
            address: '127.0.0.1:8080',
            protocol: 'http',
            port: 8080,
            tags: ['api', 'production'],
            metadata: { region: 'us-east' },
            version: '1.0.0',
            weight: 2,
            ...overrides
        };
    }

    it('register creates a ServiceEndpoint', async () => {
        const d = createDiscovery();
        const ep = await d.register(sampleInfo());
        expect(ep.id).toBeDefined();
        expect(ep.name).toBe('my-service');
        expect(ep.address).toBe('127.0.0.1:8080');
        expect(ep.status).toBe('UP');
        expect(ep.registeredAt).toBeDefined();
    });

    it('register generates unique IDs', async () => {
        const d = createDiscovery();
        const ep1 = await d.register(sampleInfo());
        const ep2 = await d.register(sampleInfo({ name: 'other' }));
        expect(ep1.id).not.toBe(ep2.id);
    });

    it('register accepts custom id', async () => {
        const d = createDiscovery();
        const ep = await d.register(sampleInfo({ id: 'custom-id' }));
        expect(ep.id).toBe('custom-id');
    });

    it('deregister removes service by id', async () => {
        const d = createDiscovery();
        const ep = await d.register(sampleInfo());
        await d.deregister(ep.id);
        const results = await d.discover('my-service');
        expect(results.length).toBe(0);
    });

    it('discover returns UP endpoints matching name', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo());
        await d.register(sampleInfo({ name: 'other-service' }));
        const results = await d.discover('my-service');
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('my-service');
    });

    it('query filters by protocol', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo({ protocol: 'http' }));
        await d.register(sampleInfo({ name: 'tcp-svc', protocol: 'tcp' }));
        const results = await d.query({ protocol: 'http' });
        expect(results.length).toBe(1);
        expect(results[0].protocol).toBe('http');
    });

    it('query filters by tags', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo({ tags: ['api', 'production'] }));
        await d.register(sampleInfo({ name: 'internal', tags: ['internal'] }));
        const results = await d.query({ tags: ['api'] });
        expect(results.length).toBe(1);
    });

    it('query filters by metadata', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo({ metadata: { region: 'us-east' } }));
        await d.register(sampleInfo({ name: 'eu-svc', metadata: { region: 'eu-west' } }));
        const results = await d.query({ metadata: { region: 'us-east' } });
        expect(results.length).toBe(1);
    });

    it('discoverOne returns first or null', async () => {
        const d = createDiscovery();
        const found = await d.discoverOne('non-existent');
        expect(found).toBeNull();

        await d.register(sampleInfo());
        const ep = await d.discoverOne('my-service');
        expect(ep).not.toBeNull();
        expect(ep!.name).toBe('my-service');
    });

    it('getServices returns all as ServiceInfo[]', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo());
        const services = await d.getServices();
        expect(services.length).toBe(1);
        expect(services[0].name).toBe('my-service');
        expect(services[0].id).toBeDefined();
    });

    it('watch registers callback and fires immediately', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo());
        let called = false;
        await d.watch('my-service', (endpoints) => {
            called = true;
            expect(endpoints.length).toBe(1);
        });
        expect(called).toBe(true);
    });

    it('unwatch removes callback', async () => {
        const d = createDiscovery();
        let calls = 0;
        const cb = () => { calls++; };
        await d.watch('my-service', cb);
        await d.unwatch('my-service', cb);
        await d.register(sampleInfo());
        expect(calls).toBe(1);
    });

    it('update patches endpoint fields', async () => {
        const d = createDiscovery();
        const ep = await d.register(sampleInfo());
        const updated = await d.update(ep.id, { address: '0.0.0.0:9090', weight: 5 });
        expect(updated!.address).toBe('0.0.0.0:9090');
        expect(updated!.weight).toBe(5);
        expect(updated!.name).toBe('my-service');
    });

    it('update returns null for unknown id', async () => {
        const d = createDiscovery();
        const result = await d.update('non-existent', { address: 'x' });
        expect(result).toBeNull();
    });

    it('healthCheck marks endpoint as UP', async () => {
        const d = createDiscovery();
        const ep = await d.register(sampleInfo());
        ep.status = 'DOWN';
        const ok = await d.healthCheck(ep);
        expect(ok).toBe(true);
        const refreshed = await d.discoverOne('my-service');
        expect(refreshed!.status).toBe('UP');
    });

    it('shutdown clears all data', async () => {
        const d = createDiscovery();
        await d.register(sampleInfo());
        await d.shutdown();
        const services = await d.getServices();
        expect(services.length).toBe(0);
    });

    it('shutdown clears watchers', async () => {
        const d = createDiscovery();
        let calls = 0;
        await d.watch('my-service', () => { calls++; });
        await d.shutdown();
        await d.register(sampleInfo());
        expect(calls).toBe(1);
    });
});
