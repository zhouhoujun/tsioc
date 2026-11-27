/**
 * Gateway → Redis broker example.
 *
 * HTTP clients call the gateway; the gateway forwards the request over Redis
 * to an orders service (no HTTP backend hop).
 */
import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Handle, provideService, useRouter } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { Transport } from '@tsdi/common';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '@tsdi/gateway';
import { useRedisTransport, withRedisTransport } from '@tsdi/redis';

export const BROKER_GATEWAY_PORT = Number(process.env.BROKER_GATEWAY_PORT ?? 3224);
export const BROKER_REDIS_URL = process.env.BROKER_REDIS_URL ?? 'redis://127.0.0.1:6379';

@Injectable()
class OrdersService {
    @Handle('orders.get', Transport.Redis)
    async get() {
        return { id: 7, status: 'paid' };
    }
}

export function createBrokerGatewayModule(port = BROKER_GATEWAY_PORT) {
    @Module({
        imports: [LoggerModule],
        declarations: [OrdersService],
        providers: [
            provideService(
                useRouter(),
                useRedisTransport({
                    url: BROKER_REDIS_URL,
                    microservice: true,
                    asDefault: true
                })
            )
        ]
    })
    class OrdersBackendModule { }

    @Module({
        imports: [LoggerModule],
        providers: [
            provideClient(withRedisTransport({
                url: BROKER_REDIS_URL,
                microservice: true,
                asDefault: true
            })),
            provideService(
                useRouter(),
                useGateway({
                    routes: [{
                        path: '/api/orders',
                        service: 'orders-service',
                        transport: Transport.Redis,
                        pattern: 'orders.get'
                    }]
                }),
                useHttpTransport({
                    listenOpts: { port, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class BrokerGatewayModule { }

    return { OrdersBackendModule, BrokerGatewayModule };
}

export async function startBrokerStack(port = BROKER_GATEWAY_PORT): Promise<{
    backend: ApplicationContext;
    gateway: ApplicationContext;
}> {
    const { OrdersBackendModule, BrokerGatewayModule } = createBrokerGatewayModule(port);
    const backend = await Application.run(OrdersBackendModule);
    const gateway = await Application.run(BrokerGatewayModule);
    return { backend, gateway };
}

if (require.main === module) {
    startBrokerStack()
        .then(({ gateway }) => {
            console.log(`broker gateway listening on http://127.0.0.1:${BROKER_GATEWAY_PORT}`);
            console.log(`try: curl http://127.0.0.1:${BROKER_GATEWAY_PORT}/api/orders`);
            const shutdown = () => {
                void gateway.close().then(() => process.exit(0));
            };
            process.once('SIGINT', shutdown);
            process.once('SIGTERM', shutdown);
        })
        .catch(error => {
            console.error('broker stack failed:', error);
            process.exit(1);
        });
}
