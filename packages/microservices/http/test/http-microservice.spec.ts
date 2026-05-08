import { HttpServer, HttpServOptions, httpTransportFactory, withHttpTransport, HTTP_SERV_OPTIONS } from '../src/server';
import { withHttpClientTransport, HTTP_CLIENT_OPTIONS, HttpClientOptions } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { BodyparserInterceptor } from '@tsdi/endpoints';
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

        it('should accept http2 options', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, majorVersion: 2, timeout: 5000 };
            expect(options.majorVersion).toBe(2);
            expect(options.timeout).toBe(5000);
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

        it('should not use message packet transfer by default', () => {
            expect(httpTransportFactory({ listenOpts: { port: 3000 } }).config.features?.defaultTransfer).toBeUndefined();
        });

        it('should enable bodyparser by default', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.config.features?.bodyparser).toBe(true);
            expect(feature.providers.some((p: any) => p.useClass === BodyparserInterceptor)).toBe(true);
        });

        it('should preserve http2 server configuration', () => {
            const feature = httpTransportFactory({ majorVersion: 2, serverOpts: { allowHTTP1: true } as any });
            const config = feature.config as HttpServOptions;
            expect(config.majorVersion).toBe(2);
            expect((config.serverOpts as any).allowHTTP1).toBe(true);
        });
    });

    describe('withHttpTransport', () => {
        it('should create multiple transport features', () => {
            expect(withHttpTransport({ listenOpts: { port: 3000 } }, { listenOpts: { port: 3001 } }).length).toBe(2);
        });
    });

    describe('withHttpClientTransport', () => {
        it('should not use message packet transfer by default', () => {
            expect(withHttpClientTransport({ url: 'http://localhost:3000' })[0].config.features?.defaultTransfer).toBeUndefined();
        });

        it('should accept http2 client configuration', () => {
            const feature = withHttpClientTransport({ authority: 'http://localhost:3000', requestOptions: {} as any })[0];
            const config = feature.config as HttpClientOptions;
            expect(config.authority).toBe('http://localhost:3000');
            expect(config.requestOptions).toBeDefined();
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
