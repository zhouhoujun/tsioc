import expect = require('expect');
import * as net from 'node:net';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '../src/provider';

const { WebSocketServer, WebSocket } = require('ws');

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

describe('Gateway WebSocket proxy', () => {
    it('tunnels a WebSocket upgrade to an HTTP route target', async () => {
        const upstreamPort = await freePort();
        const gatewayPort = await freePort();
        const upstream = new WebSocketServer({ host: '127.0.0.1', port: upstreamPort });
        upstream.on('connection', (socket: any) => {
            socket.on('message', (data: any) => socket.send(`echo:${data.toString()}`));
        });
        await new Promise<void>(resolve => upstream.once('listening', () => resolve()));

        @Module({
            imports: [LoggerModule],
            providers: [
                provideService(
                    useRouter(),
                    useGateway({
                        routes: [{
                            path: '/ws',
                            service: 'ws-service',
                            targetUrl: `ws://127.0.0.1:${upstreamPort}/ws`
                        }]
                    }),
                    useHttpTransport({ listenOpts: { port: gatewayPort, host: '127.0.0.1' }, asDefault: true })
                )
            ]
        })
        class WsGatewayModule { }

        let ctx: ApplicationContext | undefined;
        let client: any;
        try {
            ctx = await Application.run(WsGatewayModule);
            client = new WebSocket(`ws://127.0.0.1:${gatewayPort}/ws`);
            await new Promise<void>((resolve, reject) => {
                client.once('open', () => resolve());
                client.once('error', reject);
            });
            const reply = await new Promise<string>((resolve, reject) => {
                client.once('message', (data: any) => resolve(String(data)));
                client.once('error', reject);
                client.send('hello');
            });
            expect(reply).toBe('echo:hello');
        } finally {
            if (client && client.readyState !== 3) {
                const closed = new Promise<void>(resolve => client.once('close', () => resolve()));
                client.close();
                await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 1000))]);
            }
            await ctx?.close();
            await new Promise<void>(resolve => upstream.close(() => resolve()));
        }
    });
});
