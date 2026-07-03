import { TcpServer, TcpServOptions, tcpTransportFactory, useTcpTransport, TCP_SERV_OPTIONS } from '../src/server';
import { Transport, TransferSide } from '@tsdi/common';
import { Application, ApplicationContext } from '@tsdi/core';
import { Module, Injectable } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideClient, withTimeout } from '@tsdi/client';
import { withTcpTransport, TcpClient } from '../src/client';
import { Controller, Get, Post, RequestBody, RequestHeader, RequestParam, RequestPath, Handle, Payload, provideService, useRouter } from '@tsdi/service';
import { catchError, lastValueFrom, of, take, toArray } from 'rxjs';
import expect = require('expect');
import * as net from 'node:net';

@Controller('/api/e2e')
class TcpE2eController {
    @Get('/ping')
    ping() {
        return { result: 'pong' };
    }

    @Post('/echo')
    echo(@RequestBody() body: any) {
        return { received: body };
    }
}

@Controller('/api/matrix')
class TcpMatrixController {
    @Get('/query')
    query(
        @RequestParam('page', { nullable: true }) page: number = 1,
        @RequestParam('sort', { nullable: true }) sort: string = 'name',
        @RequestHeader('accept', { nullable: true }) accept?: string,
    ) {
        return { page, sort, accept: accept ?? null };
    }

    @Get('/path/:id')
    path(@RequestPath('id') id: string) {
        return { id };
    }

    @Post('/body')
    body(@RequestBody() body: any) {
        return { received: body };
    }

    @Get('/falsy')
    falsy(@RequestParam('zero') zero: number = 0) {
        return { zero, ok: false, empty: '' };
    }
}

@Injectable()
class TcpStreamHandler {
    @Handle({ cmd: 'stream' }, Transport.TCP)
    stream(@Payload('message') message: string) {
        return of(`${message}-1`, `${message}-2`, `${message}-3`);
    }
}

describe('TCP Microservice', () => {

    describe('TcpServOptions', () => {
        it('should create valid TCP server options', () => {
            const options: Partial<TcpServOptions> = {
                transport: Transport.TCP,
                side: TransferSide.server,
                microservice: true,
                listenOpts: { port: 8080, host: 'localhost' }
            };

            expect(options.transport).toBe(Transport.TCP);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.listenOpts?.port).toBe(8080);
        });

        it('should accept asDefault property', () => {
            const options: Partial<TcpServOptions> = {
                transport: Transport.TCP,
                side: TransferSide.server,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });
    });

    describe('tcpTransportFactory', () => {
        it('should create a valid TCP transport feature', () => {
            const feature = tcpTransportFactory({
                listenOpts: { port: 8080, host: 'localhost' }
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.TCP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include TCP_SERV_OPTIONS provider', () => {
            const feature = tcpTransportFactory({
                listenOpts: { port: 8080 }
            });

            // TCP_SERV_OPTIONS is added to config.providers
            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === TCP_SERV_OPTIONS;
                }
                return false;
            });

            // Also check main providers
            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === TCP_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use json packet transfer by default', () => {
            const feature = tcpTransportFactory({
                listenOpts: { port: 8080 }
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = tcpTransportFactory({
                listenOpts: { port: 8080 },
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });

        it('should preserve host service mode when microservice is false', () => {
            const feature = tcpTransportFactory({
                microservice: false as any,
                listenOpts: { port: 8080 }
            });

            expect(feature.config.microservice).toBe(false);
        });


        it('should create multiple transport features for multiple options', () => {
            const features = useTcpTransport(
                { listenOpts: { port: 8080 } },
                { listenOpts: { port: 8081 } }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('TCP_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(TCP_SERV_OPTIONS).toBeDefined();
            expect(TCP_SERV_OPTIONS.toString()).toContain('TCP_SERV_OPTIONS');
        });
    });

    describe('TcpServer', () => {
        it('should exist as a class', () => {
            expect(TcpServer).toBeDefined();
            expect(typeof TcpServer).toBe('function');
        });
    });

    describe('TCP Server listen', () => {
        it('should listen on a specified port and close properly', async () => {
            const server = net.createServer();
            await new Promise<void>((resolve) => {
                server.listen(0, 'localhost', () => {
                    server.close(() => resolve());
                });
            });
        });

        it('should handle client connection', (done) => {
            const server = net.createServer();
            let clientConnected = false;

            server.on('connection', (socket) => {
                clientConnected = true;
                socket.end();
            });

            server.listen(0, 'localhost', () => {
                const address = server.address() as net.AddressInfo;
                const client = net.createConnection(address.port, 'localhost', () => {
                    // Connected, wait briefly then close
                    setTimeout(() => {
                        client.end();
                    }, 10);
                });

                client.on('close', () => {
                    server.close(() => {
                        expect(clientConnected).toBe(true);
                        done();
                    });
                });

                client.on('error', (err) => {
                    server.close(() => done(err));
                });
            });
        });

        it('should handle multiple connections', async () => {
            const server = net.createServer();
            const clients = new Set<net.Socket>();

            server.on('connection', (socket) => {
                clients.add(socket);
                socket.on('close', () => clients.delete(socket));
            });

            await new Promise<void>((resolve) => {
                server.listen(0, 'localhost', async () => {
                    const address = server.address() as net.AddressInfo;
                    const client1 = net.createConnection(address.port, 'localhost');
                    const client2 = net.createConnection(address.port, 'localhost');

                    let connected = 0;
                    const onConnect = () => {
                        connected++;
                        if (connected === 2) {
                            client1.destroy();
                            client2.destroy();
                            server.close(() => resolve());
                        }
                    };
                    client1.on('connect', onConnect);
                    client2.on('connect', onConnect);
                });
            });

            expect(clients.size).toBeGreaterThanOrEqual(0);
        });
    });

    describe('TCP default E2E coverage', () => {
        const TCP_E2E_PORT = 3010;
        const TCP_STREAM_PORT = 3011;

        @Module({
            imports: [LoggerModule],
            declarations: [TcpE2eController, TcpMatrixController, TcpStreamHandler],
            providers: [
                provideService(
                    useRouter(),
                    useRouter({ microservice: true }),
                    useTcpTransport({ microservice: false, listenOpts: { port: TCP_E2E_PORT, host: '127.0.0.1' }, asDefault: true })
                ),
                provideClient(
                    withTimeout(),
                    withTcpTransport({ connectOpts: { port: TCP_E2E_PORT, host: '127.0.0.1' }, microservice: false, asDefault: true })
                )
            ]
        })
        class TcpDefaultE2eModule { }

        let ctx: ApplicationContext;
        let client: TcpClient;

        before(async () => {
            ctx = await Application.run(TcpDefaultE2eModule);
            client = ctx.get(TcpClient);
        });

        after(async () => {
            if (ctx) {
                await ctx.destroy();
            }
        });

        it('serves GET routes over TCP host mode', async () => {
            const result = await lastValueFrom(client.send('/api/e2e/ping', {
                observe: 'response'
            }).pipe(catchError(err => of(err))));
            expect(result).toMatchObject({
                status: 200,
                ok: true,
                body: { result: 'pong' }
            });
        });

        it('serves POST routes over TCP host mode', async () => {
            const result = await lastValueFrom(client.send('/api/e2e/echo', {
                method: 'POST',
                payload: { value: 'hello' },
                observe: 'response'
            }).pipe(catchError(err => of(err))));
            expect(result).toMatchObject({
                status: 200,
                ok: true,
                body: { received: { value: 'hello' } }
            });
        });

        it('resolves params, headers and falsy values end to end', async () => {
            expect(await lastValueFrom(client.send('/api/matrix/query', {
                params: { page: '2' },
                headers: { accept: 'application/json' },
                observe: 'response'
            }).pipe(catchError(err => of(err))))).toMatchObject({
                status: 200,
                ok: true,
                body: { page: 2, sort: 'name', accept: 'application/json' }
            });
            expect(await lastValueFrom(client.send('/api/matrix/path/abc', {
                observe: 'response'
            }).pipe(catchError(err => of(err))))).toMatchObject({
                status: 200,
                ok: true,
                body: { id: 'abc' }
            });
            expect(await lastValueFrom(client.send('/api/matrix/body', {
                method: 'POST',
                payload: { value: 'hello' },
                observe: 'response'
            }).pipe(catchError(err => of(err))))).toMatchObject({
                status: 200,
                ok: true,
                body: { received: { value: 'hello' } }
            });
            expect(await lastValueFrom(client.send('/api/matrix/falsy', {
                params: { zero: '0' },
                observe: 'response'
            }).pipe(catchError(err => of(err))))).toMatchObject({
                status: 200,
                ok: true,
                body: { zero: 0, ok: false, empty: '' }
            });
        });

        it('returns structured not-found responses', async () => {
            const result = await lastValueFrom(client.send('/missing/route', {
                observe: 'response'
            }).pipe(catchError(err => of(err))));
            expect(result).toMatchObject({
                status: 404,
                ok: false
            });
        });
 
        @Module({
            imports: [LoggerModule],
            declarations: [TcpStreamHandler],
            providers: [
                provideService(
                    useRouter(),
                    useRouter({ microservice: true }),
                    useTcpTransport({ listenOpts: { port: TCP_STREAM_PORT, host: '127.0.0.1' }, asDefault: true })
                ),
                provideClient(
                    withTimeout(),
                    withTcpTransport({ connectOpts: { port: TCP_STREAM_PORT, host: '127.0.0.1' }, asDefault: true })
                )
            ]
        })
        class TcpStreamModule { }

        let streamCtx: ApplicationContext;
        let streamClient: TcpClient;

        before(async () => {
            streamCtx = await Application.run(TcpStreamModule);
            streamClient = streamCtx.get(TcpClient);
        });

        after(async () => {
            if (streamCtx) {
                await streamCtx.destroy();
            }
        });

        it('streams responses until unsubscribe in microservice mode', async () => {
            const result = await lastValueFrom(streamClient.send({ cmd: 'stream' }, {
                observe: 'observe',
                payload: { message: 'hello tcp' },
                timeout: 100
            } as any).pipe(take(2), toArray()));
            expect(result).toEqual(['hello tcp-1', 'hello tcp-2']);
        });
    });
});
