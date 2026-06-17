import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useWsTransport } from '../src/server';
import { WebSocket } from 'ws';

const PORT = 3015;

function createModule() {
    @Module({
        imports: [LoggerModule],
        providers: [provideService(useRouter(),
            useWsTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true }))]
    })
    class WsShutdownModule { }

    return WsShutdownModule;
}

async function waitForOpen(client: WebSocket): Promise<void> {
    if (client.readyState === WebSocket.OPEN) {
        return;
    }
    await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
            cleanup();
            resolve();
        };
        const onError = (err: Error) => {
            cleanup();
            reject(err);
        };
        const cleanup = () => {
            client.off('open', onOpen);
            client.off('error', onError);
        };
        client.once('open', onOpen);
        client.once('error', onError);
    });
}

describe('WebSocket shutdown port release', () => {
    it('should release the port and close active connections on shutdown', async () => {
        const ctx: ApplicationContext = await Application.run(createModule());
        const client = new WebSocket(`ws://127.0.0.1:${PORT}`);

        try {
            await waitForOpen(client);
            await ctx.close();
        } finally {
            if (client.readyState !== WebSocket.CLOSED) {
                client.terminate();
            }
        }

        const next = await Application.run(createModule());
        await next.close();
    });
});
