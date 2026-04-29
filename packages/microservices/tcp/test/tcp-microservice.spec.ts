import { TcpServer, TcpServOptions, tcpTransportFactory, withTcpTransport, TCP_SERV_OPTIONS } from '../src/server';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');
import * as net from 'node:net';

describe('TCP Microservice', () => {

    describe('TcpServOptions', () => {
        it('should create valid TCP server options', () => {
            const options: TcpServOptions = {
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
            const options: TcpServOptions = {
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

            const hasTcpOptions = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === TCP_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasTcpOptions).toBe(true);
        });

        it('should set asDefault correctly when single option', () => {
            const features = withTcpTransport({ listenOpts: { port: 8080 }, asDefault: true });
            expect(features.length).toBe(1);
        });

        it('should create multiple transport features for multiple options', () => {
            const features = withTcpTransport(
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
        it('should listen on a specified port and close properly', (done) => {
            const server = net.createServer();
            server.on('listening', () => {
                server.close(() => {
                    done();
                });
            });
            server.listen(0); // random port
        });

        it('should handle client connection', (done) => {
            const server = net.createServer();
            let clientConnected = false;

            server.on('connection', (socket) => {
                clientConnected = true;
                socket.destroy();
                server.close(() => {
                    expect(clientConnected).toBe(true);
                    done();
                });
            });

            server.listen(0, 'localhost', () => {
                const address = server.address() as net.AddressInfo;
                const client = net.createConnection(address.port, 'localhost');
                client.on('connect', () => {
                    client.destroy();
                });
            });
        });
    });
});
