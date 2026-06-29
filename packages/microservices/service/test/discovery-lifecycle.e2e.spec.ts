import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useHealth, useRegistration, useRouter } from '../src';
import { useHttpTransport } from '../../http/src/server';
import { InMemoryServiceDiscovery, ServiceDiscovery } from '../../discovery/src';
import expect = require('expect');

const LIFECYCLE_PORT = 21610;

@Controller('/lifecycle')
class LifecycleController {
    @Get('/ping')
    ping() {
        return { ok: true };
    }
}

describe('service discovery lifecycle e2e', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [LifecycleController],
        providers: [
            InMemoryServiceDiscovery,
            { provide: ServiceDiscovery, useExisting: InMemoryServiceDiscovery },
            provideService(
                useRouter(),
                useRegistration({ serviceName: 'lifecycle-service' }),
                useHealth({ enabled: true, checkInterval: 20 }),
                useHttpTransport({
                    listenOpts: { port: LIFECYCLE_PORT, host: '127.0.0.1' },
                    serviceName: 'lifecycle-service',
                    asDefault: true
                })
            )
        ]
    })
    class LifecycleModule {}

    let ctx: ApplicationContext;
    let discovery: InMemoryServiceDiscovery;

    before(async () => {
        ctx = await Application.run(LifecycleModule);
        discovery = ctx.get(InMemoryServiceDiscovery);
    });

    after(async () => {
        if (ctx) await ctx.close();
    });

    it('registers service on startup', async () => {
        const endpoint = await discovery.discoverOne('lifecycle-service');
        expect(endpoint).not.toBeNull();
        expect(endpoint?.status).toBe('UP');
    });

    it('publishes health details into discovery metadata', async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        const endpoint = await discovery.discoverOne('lifecycle-service');
        expect(endpoint?.metadata?.health).toBeDefined();
    });
});
