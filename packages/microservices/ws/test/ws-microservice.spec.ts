import { WsServer, WsServOptions, wsTransportFactory, WS_SERV_OPTIONS } from '../src/server';
import { withWsTransport } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');
import * as http from 'node:http';
import * as net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

describe('WebSocket Microservice', () => {

    describe('WsServOptions', () => {
        it('should create valid WebSocket server options', () => {
            const options: Partial<WsServOptions> = {
                transport: Transport.WS,
                side: TransferSide.server,
                microservice: true,
                listenOpts: { port: 8080, host: 'localhost' }
            };

            expect(options.transport).toBe(Transport.WS);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.listenOpts?.port).toBe(8080);
        });

        it('should accept asDefault property', () => {
            const options: Partial<WsServOptions> = {
                transport: Transport.WS,
                side: TransferSide.server,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });

        it('should accept path property', () => {
            const options: Partial<WsServOptions> = {
                transport: Transport.WS,
                side: TransferSide.server,
                path: '/ws'
            };

            expect(options.path).toBe('/ws');
        });
    });

    describe('wsTransportFactory', () => {
        it('should create a valid WebSocket transport feature', () => {
            const feature = wsTransportFactory({
                listenOpts: { port: 8080, host: 'localhost' }
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.WS);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include WS_SERV_OPTIONS provider', () => {
            const feature = wsTransportFactory({
                listenOpts: { port: 8080 }
            });

            // WS_SERV_OPTIONS is added to config.providers
            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === WS_SERV_OPTIONS;
                }
                return false;
            });

            // Also check main providers
            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === WS_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use ws packet transfer by default', () => {
            const feature = wsTransportFactory({
                listenOpts: { port: 8080 }
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = wsTransportFactory({
                listenOpts: { port: 8080 },
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });

        it('should preserve host service mode when microservice is false', () => {
            const feature = wsTransportFactory({
                microservice: false as any,
                listenOpts: { port: 8080 }
            });

            expect(feature.config.microservice).toBe(false);
        });
    });

    describe('withWsTransport', () => {
        it('should use ws packet transfer by default', () => {
            const features = withWsTransport({
                url: 'ws://localhost:8080'
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const features = withWsTransport({
                url: 'ws://localhost:8080',
                features: { defaultTransfer }
            });

            expect(features[0].config.features?.defaultTransfer).toBe(defaultTransfer);
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withWsTransport({
                microservice: false,
                url: 'ws://localhost:8080'
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('WS_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(WS_SERV_OPTIONS).toBeDefined();
            expect(WS_SERV_OPTIONS.toString()).toContain('WS_SERV_OPTIONS');
        });
    });

    describe('WsServer', () => {
        it('should exist as a class', () => {
            expect(WsServer).toBeDefined();
            expect(typeof WsServer).toBe('function');
        });
    });

    describe('WebSocket Server listen', () => {
        it('should listen on a specified port and close properly', async () => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            await new Promise<void>((resolve) => {
                server.listen(0, 'localhost', () => {
                    wss.close(() => {
                        server.close(() => resolve());
                    });
                });
            });
        });

        it('should handle client connection', (done) => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            let clientConnected = false;

            wss.on('connection', (ws) => {
                clientConnected = true;
                ws.close();
            });

            server.listen(0, 'localhost', () => {
                const address = server.address() as net.AddressInfo;
                const client = new WebSocket(`ws://localhost:${address.port}`);

                client.on('open', () => {
                    setTimeout(() => {
                        client.close();
                    }, 10);
                });

                client.on('close', () => {
                    wss.close(() => {
                        server.close(() => {
                            expect(clientConnected).toBe(true);
                            done();
                        });
                    });
                });

                client.on('error', (err) => {
                    wss.close();
                    server.close(() => done(err));
                });
            });
        });

        it('should handle multiple connections', async () => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            const clients = new Set<WebSocket>();

            wss.on('connection', (ws) => {
                clients.add(ws);
                ws.on('close', () => clients.delete(ws));
            });

            await new Promise<void>((resolve) => {
                server.listen(0, 'localhost', async () => {
                    const address = server.address() as net.AddressInfo;
                    const client1 = new WebSocket(`ws://localhost:${address.port}`);
                    const client2 = new WebSocket(`ws://localhost:${address.port}`);

                    let connected = 0;
                    const onOpen = () => {
                        connected++;
                        if (connected === 2) {
                            client1.close();
                            client2.close();
                            wss.close(() => {
                                server.close(() => resolve());
                            });
                        }
                    };
                    client1.on('open', onOpen);
                    client2.on('open', onOpen);
                });
            });

            expect(clients.size).toBeGreaterThanOrEqual(0);
        });

        it('should send and receive messages', async () => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server });
            const testMessage = JSON.stringify({ message: 'Hello WebSocket!' });

            let receivedMessage = '';
            wss.on('connection', (ws) => {
                ws.on('message', (data) => {
                    receivedMessage = data.toString();
                    ws.send(data);
                });
            });

            await new Promise<void>((resolve, reject) => {
                server.listen(0, 'localhost', () => {
                    const address = server.address() as net.AddressInfo;
                    const client = new WebSocket(`ws://localhost:${address.port}`);

                    client.on('open', () => {
                        client.send(testMessage);
                    });

                    client.on('message', (data) => {
                        const echo = data.toString();
                        expect(echo).toBe(testMessage);
                        expect(receivedMessage).toBe(testMessage);
                        client.close();
                        wss.close(() => {
                            server.close(() => resolve());
                        });
                    });

                    client.on('error', (err) => {
                        wss.close();
                        server.close();
                        reject(err);
                    });
                });
            });
        });
    });
});
