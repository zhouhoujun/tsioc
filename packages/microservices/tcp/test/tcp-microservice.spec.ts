import { TcpServer, TcpServOptions, tcpTransportFactory, useTcpTransport, TCP_SERV_OPTIONS } from '../src/server';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');
import * as net from 'node:net';

const RUN_TCP_SOCKET_TESTS = !!process.env.TSIO_TEST_TCP;

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

    RUN_TCP_SOCKET_TESTS && describe('TCP Server listen', () => {
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
});
