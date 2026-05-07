import { Transport } from '@tsdi/common';
import expect = require('expect');
import { withGrpcTransport, grpcTransportFactory } from '../src/server';
import { withGrpcClientTransport } from '../src/client';

const PORT = 50052;

describe('gRPC Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = grpcTransportFactory({ microservice: true, port: PORT, asDefault: true });
            expect(feature.config.transport).toBe(Transport.gRPC);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('client transport factory works', () => {
            const features = withGrpcClientTransport({ url: `localhost:${PORT}`, microservice: true });
            expect(features[0].config.transport).toBe(Transport.gRPC);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = grpcTransportFactory({ microservice: false as any, port: PORT + 1, asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
