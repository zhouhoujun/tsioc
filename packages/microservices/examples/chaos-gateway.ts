/**
 * Chaos fixture: one gateway replica used by scripts/ms-chaos.mjs.
 */
import { Application } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { createRedisGatewayStateStore, useGateway } from '@tsdi/gateway';

const PORT = Number(process.env.CHAOS_GATEWAY_PORT);
const UPSTREAM = process.env.CHAOS_UPSTREAM_URL;
const PREFIX = process.env.CHAOS_REDIS_PREFIX;
const REDIS_URL = process.env.CHAOS_REDIS_URL ?? 'redis://127.0.0.1:6379';

async function main(): Promise<void> {
    const stateStore = await createRedisGatewayStateStore(REDIS_URL, { prefix: PREFIX });

    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(
                useRouter(),
                useGateway({
                    routes: [{
                        path: '/api',
                        service: 'chaos-upstream',
                        targetUrl: UPSTREAM,
                        cache: { enabled: true, ttl: 60_000 }
                    }],
                    stateStore
                }),
                useHttpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class ChaosGatewayModule { }

    const context = await Application.run(ChaosGatewayModule);
    console.log(`CHAOS_GATEWAY_READY:${PORT}`);
    const shutdown = () => void context.close().then(() => process.exit(0));
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}

main().catch(error => {
    console.error('chaos gateway failed:', error);
    process.exit(1);
});
