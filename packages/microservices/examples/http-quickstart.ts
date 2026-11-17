/**
 * Minimal runnable microservice: one HTTP controller, health probe and
 * graceful shutdown, wired through `defineService`.
 *
 *   npx ts-node -r tsconfig-paths/register packages/microservices/examples/http-quickstart.ts
 *   curl http://127.0.0.1:3210/hello
 *   curl http://127.0.0.1:3210/health/readiness
 */
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { HealthController, HealthModule } from '@tsdi/health';
import { Controller, Get, defineService } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';

@Controller('/hello')
class HelloController {
    @Get('/')
    hello() {
        return { ok: true, service: 'quickstart' };
    }
}

/**
 * Build the quickstart module for a port. Exporting the factory keeps the
 * same wiring usable from smoke tests.
 */
export function createQuickstartModule(port = Number(process.env.PORT ?? 3210)) {
    return defineService({
        imports: [LoggerModule, HealthModule],
        controllers: [HelloController, HealthController],
        transport: useHttpTransport({
            listenOpts: { port, host: '127.0.0.1' },
            asDefault: true
        }),
        health: true,
        gracefulShutdown: true,
        registration: false
    });
}

export async function startQuickstart(port?: number): Promise<ApplicationContext> {
    return Application.run(createQuickstartModule(port));
}

if (require.main === module) {
    const port = Number(process.env.PORT ?? 3210);
    startQuickstart(port)
        .then(context => {
            console.log(`quickstart listening on http://127.0.0.1:${port}`);
            const shutdown = () => {
                void context.close().then(() => process.exit(0));
            };
            process.once('SIGINT', shutdown);
            process.once('SIGTERM', shutdown);
        })
        .catch(error => {
            console.error('quickstart failed:', error);
            process.exit(1);
        });
}
