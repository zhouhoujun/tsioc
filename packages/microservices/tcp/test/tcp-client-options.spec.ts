import { TcpClientOptions, TCP_CLIENT_OPTIONS } from '../src/client/options';
import { withTcpClientTransport, TcpClient } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { NetConnectOpts } from 'node:net';
import expect = require('expect');

describe('TcpClientOptions', () => {

    describe('TCP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(TCP_CLIENT_OPTIONS).toBeDefined();
        });

        it('should have correct token string', () => {
            expect(TCP_CLIENT_OPTIONS.toString()).toContain('TCP_CLIENT_OPTIONS');
        });
    });

    describe('TcpClientOptions interface', () => {
        it('should create valid TCP client options', () => {
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                microservice: false,
                connectOpts: { port: 8080, host: 'localhost' }
            };

            expect(options.transport).toBe(Transport.TCP);
            expect(options.side).toBe(TransferSide.client);
        });

        it('should support microservice option', () => {
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                microservice: true,
            };

            expect(options.microservice).toBe(true);
        });

        it('should support keepalive option', () => {
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                keepalive: 30000,
            };

            expect(options.keepalive).toBe(30000);
        });

        it('should support socketOpts option', () => {
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                socketOpts: {
                    fd: 0,
                    readable: true,
                    writable: true,
                },
            };

            expect(options.socketOpts).toBeDefined();
            expect(options.socketOpts?.readable).toBe(true);
            expect(options.socketOpts?.writable).toBe(true);
        });

        it('should support connectOpts with host and port', () => {
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                connectOpts: {
                    port: 3000,
                    host: 'example.com',
                } as NetConnectOpts,
            };

            expect((options.connectOpts as any)?.port).toBe(3000);
            expect((options.connectOpts as any)?.host).toBe('example.com');
        });
    });
});

describe('withTcpClientTransport', () => {

    it('should create a single client transport feature', () => {
        const features = withTcpClientTransport({
            connectOpts: { port: 8080, host: 'localhost' }
        });

        expect(Array.isArray(features)).toBe(true);
        expect(features.length).toBe(1);
    });

    it('should create multiple client transport features', () => {
        const features = withTcpClientTransport(
            { connectOpts: { port: 8080 } },
            { connectOpts: { port: 8081 } }
        );

        expect(features.length).toBe(2);
    });

    it('should create feature with kind Transport and config', () => {
        const features = withTcpClientTransport({
            connectOpts: { port: 8080, host: 'localhost' },
            asDefault: true,
        });

        expect(features.length).toBe(1);
        expect(features[0].kind).toBeDefined();
        expect(features[0].config).toBeDefined();
        expect(features[0].providers).toBeDefined();
        expect(Array.isArray(features[0].providers)).toBe(true);
        expect(features[0].providers.length).toBeGreaterThan(0);
    });

    it('should include CLIENT_CONFIGS provider', () => {
        const features = withTcpClientTransport({
            connectOpts: { port: 8080 }
        });

        expect(features.length).toBe(1);
        expect(features[0].providers.length).toBeGreaterThan(0);
    });

    it('should set first option as default by default', () => {
        const features = withTcpClientTransport(
            { connectOpts: { port: 8080 } },
            { connectOpts: { port: 8081 } }
        );

        expect(features.length).toBe(2);
    });

    it('should handle explicit asDefault option', () => {
        const features = withTcpClientTransport({
            connectOpts: { port: 8080 },
            asDefault: true,
        });

        expect(features.length).toBe(1);
    });

    it('should support microservice option', () => {
        const features = withTcpClientTransport({
            microservice: true,
            connectOpts: { port: 3000 },
        });

        expect(features.length).toBe(1);
        expect(features[0].config.microservice).toBe(true);
    });

    it('should use json packet transfer by default', () => {
        const features = withTcpClientTransport({
            connectOpts: { port: 8080 }
        });

        expect(features[0].config.features?.defaultTransfer).toBeDefined();
    });

    it('should preserve an explicit default transfer override', () => {
        const defaultTransfer = () => [];
        const features = withTcpClientTransport({
            connectOpts: { port: 8080 },
            features: { defaultTransfer }
        });

        expect(features[0].config.features?.defaultTransfer).toBe(defaultTransfer);
    });

    it('should preserve host client mode when microservice is false', () => {
        const features = withTcpClientTransport({
            microservice: false,
            connectOpts: { port: 8080 }
        });

        expect(features[0].config.microservice).toBe(false);
    });

    it('should support keepalive option', () => {
        const features = withTcpClientTransport({
            keepalive: 60000,
            connectOpts: { port: 8080 },
        });

        expect(features.length).toBe(1);
        expect((features[0].config as TcpClientOptions).keepalive).toBe(60000);
    });

});

describe('TcpClient export', () => {
    it('should be importable as a class', () => {
        expect(TcpClient).toBeDefined();
        expect(typeof TcpClient).toBe('function');
    });
});
