import expect = require('expect');
import { EtcdServiceDiscovery } from '../src/etcd.discovery';

const describeLive = process.env.TSIO_TEST_ETCD === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeLive('EtcdServiceDiscovery (live)', () => {
    const service = `tsdi-live-${process.pid}-${Date.now().toString(36)}`;
    const id = `${service}-1`;
    const discovery = new EtcdServiceDiscovery({
        url: process.env.TSIO_TEST_ETCD_URL ?? 'http://127.0.0.1:2379',
        prefix: `/tsdi/test/${process.pid}`,
        ttlSeconds: 30
    });

    after(async () => {
        await discovery.deregister(id).catch(() => undefined);
        discovery.onDestroy?.();
    });

    it('registers, discovers and deregisters with a lease', async () => {
        await discovery.register({
            id,
            name: service,
            address: '127.0.0.1',
            port: 3997,
            protocol: 'http',
            tags: ['live'],
            metadata: { env: 'test' }
        });
        const endpoints = await discovery.discover(service);
        expect(endpoints.some(item => item.id === id && item.port === 3997)).toBe(true);

        await discovery.deregister(id);
        expect((await discovery.discover(service)).some(item => item.id === id)).toBe(false);
    });
});
