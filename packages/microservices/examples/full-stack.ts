/**
 * Full-stack example: HTTP backend + in-memory discovery + gateway.
 *
 *   npx ts-node -r tsconfig-paths/register packages/microservices/examples/full-stack.ts
 *   curl http://127.0.0.1:3220/api/users
 *
 * The gateway resolves `users-service` through discovery instead of a static
 * targetUrl. A broker can be added by replacing the backend transport; the
 * gateway route stays the same.
 */
import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, defineService, provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '@tsdi/gateway';
import { InMemoryServiceDiscovery, ServiceDiscovery } from '@tsdi/discovery';

export const DEFAULT_BACKEND_PORT = Number(process.env.FULLSTACK_BACKEND_PORT ?? 3221);
export const DEFAULT_GATEWAY_PORT = Number(process.env.FULLSTACK_GATEWAY_PORT ?? 3220);

@Controller('/users')
class UsersController {
    @Get('/')
    users() {
        return [{ id: 1, name: 'ada' }, { id: 2, name: 'linus' }];
    }
}

export function createBackendModule(port = DEFAULT_BACKEND_PORT) {
    return defineService({
        imports: [LoggerModule],
        transport: useHttpTransport({
            listenOpts: { port, host: '127.0.0.1' },
            asDefault: true
        }),
        controllers: [UsersController],
        router: true,
        registration: false,
        health: false,
        gracefulShutdown: true
    });
}

export function createGatewayModule(
    discovery: ServiceDiscovery,
    port = DEFAULT_GATEWAY_PORT
) {
    @Module({
        imports: [LoggerModule],
        providers: [
            provideService(
                useRouter(),
                useJson(),
                useGateway({
                    discovery: { provide: ServiceDiscovery, useValue: discovery },
                    routes: [{
                        path: '/api',
                        service: 'users-service',
                        stripPrefix: true,
                        loadBalance: { retries: 1 }
                    }]
                }),
                useHttpTransport({
                    listenOpts: { port, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class FullStackGatewayModule { }
    return FullStackGatewayModule;
}

export async function startFullStack(
    backendPort = DEFAULT_BACKEND_PORT,
    gatewayPort = DEFAULT_GATEWAY_PORT
): Promise<{ backend: ApplicationContext; gateway: ApplicationContext; discovery: InMemoryServiceDiscovery }> {
    const backend = await Application.run(createBackendModule(backendPort));
    const discovery = new InMemoryServiceDiscovery();
    await discovery.register({
        id: 'users-1',
        name: 'users-service',
        address: `127.0.0.1:${backendPort}`,
        protocol: 'http'
    });
    const gateway = await Application.run(createGatewayModule(discovery, gatewayPort));
    return { backend, gateway, discovery };
}

if (require.main === module) {
    startFullStack()
        .then(({ gateway, discovery }) => {
            console.log(`gateway listening on http://127.0.0.1:${DEFAULT_GATEWAY_PORT}`);
            console.log(`try: curl http://127.0.0.1:${DEFAULT_GATEWAY_PORT}/api/users`);
            const shutdown = () => {
                void gateway.close().then(() => discovery.onDestroy?.()).then(() => process.exit(0));
            };
            process.once('SIGINT', shutdown);
            process.once('SIGTERM', shutdown);
        })
        .catch(error => {
            console.error('full-stack failed:', error);
            process.exit(1);
        });
}
