import { UdpServer, UdpServOptions, udpTransportFactory, useUdpTransport, UDP_SERV_OPTIONS } from '../src/server';
import { withUdpTransport, UDP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('UDP Microservice', () => {

    describe('UdpServOptions', () => {
        it('should create valid UDP server options', () => {
            const options: Partial<UdpServOptions> = {
                transport: Transport.UDP,
                side: TransferSide.server,
                microservice: true,
                listenOpts: { port: 41234, host: 'localhost' }
            };
            expect(options.transport).toBe(Transport.UDP);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.listenOpts?.port).toBe(41234);
        });

        it('should accept asDefault property', () => {
            const options: Partial<UdpServOptions> = { transport: Transport.UDP, microservice: true, asDefault: true };
            expect(options.asDefault).toBe(true);
        });
    });

    describe('udpTransportFactory', () => {
        it('should create a valid UDP transport feature', () => {
            const feature = udpTransportFactory({ listenOpts: { port: 41234 } });
            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.UDP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include UDP_SERV_OPTIONS provider', () => {
            const feature = udpTransportFactory({ listenOpts: { port: 41234 } });
            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => p.provide === UDP_SERV_OPTIONS);
            const hasInMain = feature.providers.some((p: any) => p.provide === UDP_SERV_OPTIONS);
            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should not force a default transfer on server side', () => {
            const feature = udpTransportFactory({ listenOpts: { port: 41234 } });
            expect(feature.config.features?.defaultTransfer).toBeUndefined();
        });
    });

    describe('useUdpTransport', () => {
        it('should create multiple transport features', () => {
            const features = useUdpTransport({ listenOpts: { port: 41234 } }, { listenOpts: { port: 41235 } });
            expect(features.length).toBe(2);
        });
    });

    describe('withUdpTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withUdpTransport({ port: 41234 });
            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('UDP_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(UDP_SERV_OPTIONS).toBeDefined();
            expect(UDP_SERV_OPTIONS.toString()).toContain('UDP_SERV_OPTIONS');
        });
    });

    describe('UDP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(UDP_CLIENT_OPTIONS).toBeDefined();
            expect(UDP_CLIENT_OPTIONS.toString()).toContain('UDP_CLIENT_OPTIONS');
        });
    });

    describe('UdpServer', () => {
        it('should exist as a class', () => {
            expect(UdpServer).toBeDefined();
            expect(typeof UdpServer).toBe('function');
        });
    });
});
