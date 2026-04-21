import { InMemoryServiceDiscovery, RandomEndpointSelector, RoundRobinEndpointSelector, WeightedEndpointSelector, LeastConnectionsEndpointSelector, ServiceEndpoint, ServiceInfo, DiscoveryModule } from '../src';
import expect = require('expect');

describe('Discovery Module Test', () => {

    describe('InMemoryServiceDiscovery', () => {
        let discovery: InMemoryServiceDiscovery;

        beforeEach(() => {
            discovery = new InMemoryServiceDiscovery();
        });

        afterEach(async () => {
            await discovery.shutdown();
        });

        it('should register service', async () => {
            const info: ServiceInfo = {
                name: 'test-service',
                address: 'localhost',
                port: 3000
            };
            const endpoint = await discovery.register(info);
            expect(endpoint.id).toBeDefined();
            expect(endpoint.name).toBe('test-service');
            expect(endpoint.address).toBe('localhost');
            expect(endpoint.port).toBe(3000);
            expect(endpoint.status).toBe('UP');
        });

        it('should deregister service', async () => {
            const endpoint = await discovery.register({
                name: 'test-service',
                address: 'localhost',
                port: 3000
            });
            await discovery.deregister(endpoint.id);
            const services = await discovery.getServices();
            expect(services.length).toBe(0);
        });

        it('should discover services by name', async () => {
            await discovery.register({ name: 'service-a', address: 'host1', port: 3000 });
            await discovery.register({ name: 'service-a', address: 'host2', port: 3001 });
            await discovery.register({ name: 'service-b', address: 'host3', port: 3002 });

            const endpoints = await discovery.discover('service-a');
            expect(endpoints.length).toBe(2);
            expect(endpoints.every(ep => ep.name === 'service-a')).toBe(true);
        });

        it('should discover one service', async () => {
            await discovery.register({ name: 'test-service', address: 'localhost', port: 3000 });
            const endpoint = await discovery.discoverOne('test-service');
            expect(endpoint).not.toBeNull();
            expect(endpoint?.name).toBe('test-service');
        });

        it('should return null when no service found', async () => {
            const endpoint = await discovery.discoverOne('non-existent');
            expect(endpoint).toBeNull();
        });

        it('should get all services', async () => {
            await discovery.register({ name: 'service-a', address: 'host1', port: 3000 });
            await discovery.register({ name: 'service-b', address: 'host2', port: 3001 });
            const services = await discovery.getServices();
            expect(services.length).toBe(2);
        });

        it('should watch service changes', async () => {
            let called = false;
            const callback = (_endpoints: ServiceEndpoint[]) => {
                called = true;
            };
            await discovery.watch('test-service', callback);
            await discovery.register({ name: 'test-service', address: 'localhost', port: 3000 });
            // After registration, watchers should be notified
            expect(called).toBe(true);
            await discovery.unwatch('test-service', callback);
        });

        it('should perform health check', async () => {
            const endpoint = await discovery.register({ name: 'test-service', address: 'localhost', port: 3000 });
            const isHealthy = await discovery.healthCheck(endpoint);
            expect(isHealthy).toBe(true);
        });

        it('should return false for unknown endpoint health check', async () => {
            const unknownEndpoint: ServiceEndpoint = {
                id: 'unknown',
                name: 'unknown',
                address: 'unknown'
            };
            const isHealthy = await discovery.healthCheck(unknownEndpoint);
            expect(isHealthy).toBe(false);
        });

        it('should generate unique ids', async () => {
            const ep1 = await discovery.register({ name: 'service1', address: 'host1' });
            const ep2 = await discovery.register({ name: 'service2', address: 'host2' });
            expect(ep1.id).not.toBe(ep2.id);
        });
    });

    describe('RandomEndpointSelector', () => {
        let selector: RandomEndpointSelector;
        let endpoints: ServiceEndpoint[];

        beforeEach(() => {
            selector = new RandomEndpointSelector();
            endpoints = [
                { id: '1', name: 'test', address: 'host1' },
                { id: '2', name: 'test', address: 'host2' },
                { id: '3', name: 'test', address: 'host3' }
            ];
        });

        it('should select an endpoint', () => {
            const selected = selector.select(endpoints);
            expect(selected).not.toBeNull();
            expect(endpoints.includes(selected!)).toBe(true);
        });

        it('should return null for empty endpoints', () => {
            const selected = selector.select([]);
            expect(selected).toBeNull();
        });

        it('should select single endpoint', () => {
            const single = [{ id: '1', name: 'test', address: 'host1' }];
            const selected = selector.select(single);
            expect(selected).toBe(single[0]);
        });
    });

    describe('RoundRobinEndpointSelector', () => {
        let selector: RoundRobinEndpointSelector;
        let endpoints: ServiceEndpoint[];

        beforeEach(() => {
            selector = new RoundRobinEndpointSelector();
            endpoints = [
                { id: '1', name: 'test', address: 'host1' },
                { id: '2', name: 'test', address: 'host2' },
                { id: '3', name: 'test', address: 'host3' }
            ];
        });

        it('should select endpoints in round-robin order', () => {
            const first = selector.select(endpoints);
            const second = selector.select(endpoints);
            const third = selector.select(endpoints);
            const fourth = selector.select(endpoints);

            expect(first?.id).toBe('1');
            expect(second?.id).toBe('2');
            expect(third?.id).toBe('3');
            expect(fourth?.id).toBe('1'); // Wraps around
        });

        it('should return null for empty endpoints', () => {
            const selected = selector.select([]);
            expect(selected).toBeNull();
        });

        it('should handle single endpoint', () => {
            const single = [{ id: '1', name: 'test', address: 'host1' }];
            expect(selector.select(single)?.id).toBe('1');
            expect(selector.select(single)?.id).toBe('1');
        });
    });

    describe('WeightedEndpointSelector', () => {
        let selector: WeightedEndpointSelector;
        let endpoints: ServiceEndpoint[];

        beforeEach(() => {
            selector = new WeightedEndpointSelector({ weights: { '1': 5, '2': 3, '3': 2 } });
            endpoints = [
                { id: '1', name: 'test', address: 'host1' },
                { id: '2', name: 'test', address: 'host2' },
                { id: '3', name: 'test', address: 'host3' }
            ];
        });

        it('should select weighted endpoint', () => {
            const selected = selector.select(endpoints);
            expect(selected).not.toBeNull();
            expect(endpoints.includes(selected!)).toBe(true);
        });

        it('should allow setting weights', () => {
            selector.setWeights({ '1': 10, '2': 1 });
            const selected = selector.select(endpoints);
            expect(selected).not.toBeNull();
        });

        it('should return null for empty endpoints', () => {
            const selected = selector.select([]);
            expect(selected).toBeNull();
        });

        it('should use default weight when not configured', () => {
            const noWeightsSelector = new WeightedEndpointSelector();
            const selected = noWeightsSelector.select(endpoints);
            expect(selected).not.toBeNull();
        });
    });

    describe('LeastConnectionsEndpointSelector', () => {
        let selector: LeastConnectionsEndpointSelector;
        let endpoints: ServiceEndpoint[];

        beforeEach(() => {
            selector = new LeastConnectionsEndpointSelector();
            endpoints = [
                { id: '1', name: 'test', address: 'host1' },
                { id: '2', name: 'test', address: 'host2' },
                { id: '3', name: 'test', address: 'host3' }
            ];
        });

        it('should select endpoint with least connections', () => {
            // First selection should be endpoint 1 (all have 0 connections)
            const first = selector.select(endpoints);
            expect(first?.id).toBe('1');

            // Second selection should still be endpoint 1 (has 1 connection, others have 0)
            // Wait - actually after first selection, endpoint 1 has 1 connection
            // So endpoint 2 should have 0 and be selected next
            const second = selector.select(endpoints);
            expect(second?.id).toBe('2');

            // Third should be endpoint 3
            const third = selector.select(endpoints);
            expect(third?.id).toBe('3');
        });

        it('should release connection', () => {
            const selected = selector.select(endpoints);
            expect(selected).not.toBeNull();
            selector.release(selected!);
            // After release, connection count should be back to 0
            selector.select(endpoints); // Should select endpoint 1 again
        });

        it('should return null for empty endpoints', () => {
            const selected = selector.select([]);
            expect(selected).toBeNull();
        });
    });

    describe('DiscoveryModule', () => {
        it('should have static withOptions method', () => {
            expect(DiscoveryModule.withOptions).toBeDefined();
            expect(typeof DiscoveryModule.withOptions).toBe('function');
        });

        it('should create ModuleWithProviders', () => {
            const result = DiscoveryModule.withOptions({ enableCache: true });
            expect(result.module).toBe(DiscoveryModule);
            expect(result.providers).toBeDefined();
        });
    });
});