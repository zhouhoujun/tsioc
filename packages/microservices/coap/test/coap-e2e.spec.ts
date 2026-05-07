import { Transport } from '@tsdi/common';
import expect = require('expect');
import { withCoapTransport, coapTransportFactory } from '../src/server';
import { withCoapClientTransport } from '../src/client';

const PORT = 21300;

describe('CoAP Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = coapTransportFactory({ microservice: true, listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true });
            expect((feature.config as any).transport).toBe(Transport.CoAP);
            expect((feature.config as any).microservice).toBe(true);
            expect((feature.config as any).listenOpts?.port).toBe(PORT);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('client transport factory works', () => {
            const features = withCoapClientTransport({ port: PORT, microservice: true });
            expect(features[0].config.transport).toBe(Transport.CoAP);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = coapTransportFactory({ microservice: false as any, listenOpts: { port: PORT + 1 }, asDefault: true });
            expect((feature.config as any).microservice).toBe(false);
        });
    });
});
