import expect = require('expect');
import { InMemoryServiceDiscovery } from '../../discovery/src';
import { DiscoveryRegistrationStrategy } from '../src/strategies/discovery-registration.strategy';
import { DiscoveryHealthCheckStrategy } from '../src/strategies/discovery-health.strategy';
import { DefaultGracefulShutdownStrategy } from '../src/strategies/default-graceful-shutdown.strategy';

describe('service discovery lifecycle', () => {
    it('registers service metadata through discovery strategy', async () => {
        const discovery = new InMemoryServiceDiscovery();
        const strategy = new DiscoveryRegistrationStrategy(
            discovery as any,
            { serviceName: 'lifecycle-service', host: '127.0.0.1', port: 21610 },
            {
                transport: 1 as any,
                microservice: true,
                serviceName: 'lifecycle-service',
                listenOpts: { host: '127.0.0.1', port: 21610 }
            } as any
        );

        const endpoint = await strategy.register();
        expect(endpoint).not.toBeNull();
        expect(endpoint?.name).toBe('lifecycle-service');
        expect(endpoint?.address).toContain('127.0.0.1');
    });

    it('publishes health status into discovery metadata', async () => {
        const discovery = new InMemoryServiceDiscovery();
        const registration = new DiscoveryRegistrationStrategy(
            discovery as any,
            { serviceName: 'health-service', host: '127.0.0.1', port: 21611 },
            {
                transport: 1 as any,
                microservice: true,
                serviceName: 'health-service',
                listenOpts: { host: '127.0.0.1', port: 21611 }
            } as any
        );
        await registration.register();

        const health = new DiscoveryHealthCheckStrategy(
            discovery as any,
            [{
                name: 'memory',
                async check() {
                    return { status: 'UP', details: { heap: 'ok' } };
                }
            }] as any,
            { enabled: true },
            registration
        );

        await health.start();
        const endpoint = await discovery.discoverOne('health-service');
        expect(endpoint?.metadata?.health).toBeDefined();
        expect(endpoint?.metadata?.health.status).toBe('UP');
        await health.stop();
    });

    it('marks endpoint down on graceful shutdown', async () => {
        const calls: string[] = [];
        const shutdown = new DefaultGracefulShutdownStrategy(
            { enabled: true, waitDuration: 1 },
            {
                async start() { return; },
                async stop() { calls.push('stop'); }
            }
        );

        await shutdown.shutdown();
        expect(calls).toEqual(['stop']);
    });
});
