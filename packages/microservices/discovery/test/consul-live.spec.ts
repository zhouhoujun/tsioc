import expect = require('expect');
import { ConsulServiceDiscovery } from '../src/consul.discovery';

const describeLive = process.env.TSIO_TEST_CONSUL === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeLive('ConsulServiceDiscovery (live)', () => {
    const service = `tsdi-live-${process.pid}-${Date.now().toString(36)}`;
    const id = `${service}-1`;
    const discovery = new ConsulServiceDiscovery({
        url: process.env.TSIO_TEST_CONSUL_URL ?? 'http://127.0.0.1:8500'
    });

    after(async () => {
        await discovery.deregister(id).catch(() => undefined);
        discovery.onDestroy?.();
    });

    it('registers, discovers and deregisters a service', async () => {
        await discovery.register({
            id,
            name: service,
            address: '127.0.0.1',
            port: 3999,
            protocol: 'http',
            tags: ['live'],
            metadata: { env: 'test' }
        });

        const endpoints = await discovery.discover(service);
        const endpoint = endpoints.find(item => item.id === id);
        expect(endpoint).toBeTruthy();
        expect(endpoint?.address).toContain('127.0.0.1');
        expect(endpoint?.port).toBe(3999);
        expect(endpoint?.metadata?.env).toBe('test');

        const queried = await discovery.query({ name: service, tags: ['live'], metadata: { env: 'test' } });
        expect(queried.some(item => item.id === id)).toBe(true);

        await discovery.deregister(id);
        const remaining = await discovery.discover(service);
        expect(remaining.some(item => item.id === id)).toBe(false);
    });
});
