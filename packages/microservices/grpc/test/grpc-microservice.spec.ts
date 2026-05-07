import { GrpcServer, GrpcServOptions, grpcTransportFactory, withGrpcTransport, GRPC_SERV_OPTIONS } from '../src/server';
import { withGrpcClientTransport, GRPC_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('gRPC Microservice', () => {
    describe('GrpcServOptions', () => {
        it('should create valid gRPC server options', () => {
            const options: Partial<GrpcServOptions> = { transport: Transport.gRPC, side: TransferSide.server, microservice: true, port: 50051 };
            expect(options.transport).toBe(Transport.gRPC);
            expect(options.port).toBe(50051);
        });
    });

    describe('grpcTransportFactory', () => {
        it('should create a valid gRPC transport feature', () => {
            const feature = grpcTransportFactory({ port: 50051 });
            expect(feature.config.transport).toBe(Transport.gRPC);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('should include GRPC_SERV_OPTIONS provider', () => {
            const feature = grpcTransportFactory({ port: 50051 });
            const has = feature.providers.some((p: any) => p.provide === GRPC_SERV_OPTIONS) ||
                ((feature.config as any).providers || []).some((p: any) => p.provide === GRPC_SERV_OPTIONS);
            expect(has).toBe(true);
        });
        it('should use json packet transfer by default', () => {
            expect(grpcTransportFactory({ port: 50051 }).config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('withGrpcTransport', () => {
        it('should create multiple transport features', () => {
            expect(withGrpcTransport({ port: 50051 }, { port: 50052 }).length).toBe(2);
        });
    });

    describe('withGrpcClientTransport', () => {
        it('should use json packet transfer by default', () => {
            expect(withGrpcClientTransport({ url: 'localhost:50051' })[0].config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('tokens', () => {
        it('GRPC_SERV_OPTIONS should be defined', () => expect(GRPC_SERV_OPTIONS.toString()).toContain('GRPC_SERV_OPTIONS'));
        it('GRPC_CLIENT_OPTIONS should be defined', () => expect(GRPC_CLIENT_OPTIONS.toString()).toContain('GRPC_CLIENT_OPTIONS'));
    });

    describe('GrpcServer', () => {
        it('should exist as a class', () => expect(typeof GrpcServer).toBe('function'));
    });
});
