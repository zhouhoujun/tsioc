import { HttpServer, HttpServOptions, httpTransportFactory, withHttpTransport, HTTP_SERV_OPTIONS } from '../src/server';
import { withHttpClientTransport, HTTP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('HTTP Microservice', () => {
    describe('HttpServOptions', () => {
        it('should create valid HTTP server options', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, side: TransferSide.server, microservice: true, listenOpts: { port: 3000, host: 'localhost' } };
            expect(options.transport).toBe(Transport.HTTP);
            expect(options.listenOpts?.port).toBe(3000);
        });
        it('should accept secure property', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, secure: true };
            expect(options.secure).toBe(true);
        });
    });

    describe('httpTransportFactory', () => {
        it('should create a valid HTTP transport feature', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.config.transport).toBe(Transport.HTTP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('should include HTTP_SERV_OPTIONS provider', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            const has = feature.providers.some((p: any) => p.provide === HTTP_SERV_OPTIONS) ||
                ((feature.config as any).providers || []).some((p: any) => p.provide === HTTP_SERV_OPTIONS);
            expect(has).toBe(true);
        });
        it('should use json packet transfer by default', () => {
            expect(httpTransportFactory({ listenOpts: { port: 3000 } }).config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('withHttpTransport', () => {
        it('should create multiple transport features', () => {
            expect(withHttpTransport({ listenOpts: { port: 3000 } }, { listenOpts: { port: 3001 } }).length).toBe(2);
        });
    });

    describe('withHttpClientTransport', () => {
        it('should use json packet transfer by default', () => {
            expect(withHttpClientTransport({ url: 'http://localhost:3000' })[0].config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('tokens', () => {
        it('HTTP_SERV_OPTIONS should be defined', () => expect(HTTP_SERV_OPTIONS.toString()).toContain('HTTP_SERV_OPTIONS'));
        it('HTTP_CLIENT_OPTIONS should be defined', () => expect(HTTP_CLIENT_OPTIONS.toString()).toContain('HTTP_CLIENT_OPTIONS'));
    });

    describe('HttpServer', () => {
        it('should exist as a class', () => expect(typeof HttpServer).toBe('function'));
    });
});
