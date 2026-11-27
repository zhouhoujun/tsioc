import expect = require('expect');
import { EurekaServiceDiscovery } from '../src/eureka.discovery';

const describeLive = process.env.TSIO_TEST_EUREKA === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeLive('EurekaServiceDiscovery (live)', () => {
    const service = `tsdi-live-${process.pid}-${Date.now().toString(36)}`;
    const id = `${service}-1`;
    const discovery = new EurekaServiceDiscovery({
        eurekaUrl: process.env.TSIO_TEST_EUREKA_URL ?? 'http://127.0.0.1:8761/eureka',
        heartbeatInterval: 10_000
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
            port: 3996,
            protocol: 'http',
            tags: ['live'],
            metadata: { env: 'test' }
        });

        const endpoints = await discovery.discover(service);
        expect(endpoints.some(item => item.port === 3996)).toBe(true);

        await discovery.deregister(id);
        const remaining = await discovery.discover(service);
        expect(remaining.some(item => item.port === 3996)).toBe(false);
    });
});
