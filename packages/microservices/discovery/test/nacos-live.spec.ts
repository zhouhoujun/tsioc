import expect = require('expect');
import { NacosServiceDiscovery } from '../src/nacos.discovery';

const describeLive = process.env.TSIO_TEST_NACOS === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeLive('NacosServiceDiscovery (live)', () => {
    const service = `tsdi-live-${process.pid}-${Date.now().toString(36)}`;
    const id = `${service}-1`;
    const discovery = new NacosServiceDiscovery({
        serverAddr: process.env.TSIO_TEST_NACOS_URL ?? 'http://127.0.0.1:8848',
        groupName: 'DEFAULT_GROUP'
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
            port: 3998,
            protocol: 'http',
            tags: ['live'],
            metadata: { env: 'test' }
        });

        const endpoints = await discovery.discover(service);
        const endpoint = endpoints.find(item => item.port === 3998);
        expect(endpoint).toBeTruthy();
        expect(endpoint?.address).toContain('127.0.0.1');
        expect(endpoint?.tags).toContain('live');

        const queried = await discovery.query({ name: service, tags: ['live'] });
        expect(queried.some(item => item.port === 3998)).toBe(true);

        await discovery.deregister(id);
        const remaining = await discovery.discover(service);
        expect(remaining.some(item => item.port === 3998)).toBe(false);
    });
});
