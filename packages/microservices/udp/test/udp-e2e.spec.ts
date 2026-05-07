import { Transport } from '@tsdi/common';
import expect = require('expect');
import { withUdpTransport, udpTransportFactory } from '../src/server';
import { withUdpClientTransport } from '../src/client';

const PORT = 21100;

describe('UDP Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = udpTransportFactory({ microservice: true, listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true });
            expect((feature.config as any).transport).toBe(Transport.UDP);
            expect((feature.config as any).microservice).toBe(true);
            expect((feature.config as any).listenOpts?.port).toBe(PORT);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('client transport factory works', () => {
            const features = withUdpClientTransport({ port: PORT, microservice: true });
            expect(features[0].config.transport).toBe(Transport.UDP);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = udpTransportFactory({ microservice: false as any, listenOpts: { port: PORT + 1 }, asDefault: true });
            expect((feature.config as any).microservice).toBe(false);
        });
    });
});
