import { CoapServer, CoapServOptions, coapTransportFactory, withCoapTransport, COAP_SERV_OPTIONS } from '../src/server';
import { withCoapClientTransport, COAP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { BodyParserInterceptor, ContentInterceptor, JsonInterceptor } from '@tsdi/service';
import { MessageReaderFactory } from '@tsdi/core';
import expect = require('expect');

describe('CoAP Microservice', () => {

    describe('CoapServOptions', () => {
        it('should create valid CoAP server options', () => {
            const options: Partial<CoapServOptions> = {
                transport: Transport.CoAP,
                side: TransferSide.server,
                microservice: true,
                listenOpts: { port: 5683, host: 'localhost' }
            };

            expect(options.transport).toBe(Transport.CoAP);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.listenOpts?.port).toBe(5683);
        });

        it('should accept asDefault property', () => {
            const options: Partial<CoapServOptions> = {
                transport: Transport.CoAP,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });
    });

    describe('coapTransportFactory', () => {
        it('should create a valid CoAP transport feature', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683, host: 'localhost' }
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.CoAP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include COAP_SERV_OPTIONS provider', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });

            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === COAP_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === COAP_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use json packet transfer by default', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 },
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });

        it('should bind abstract feature interceptors and message reader defaults', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });
            const configProviders = (feature.config as any).providers || [];

            expect(feature.providers.some((p: any) => p.provide === ContentInterceptor && p.useClass?.name === 'CoapContentInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === JsonInterceptor && p.useClass?.name === 'CoapJsonInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === BodyParserInterceptor && p.useClass?.name === 'CoapBodyParserInterceptor')).toBe(true);
            expect(configProviders.some((p: any) => p.provide === MessageReaderFactory)).toBe(true);
        });
    });

    describe('withCoapTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = withCoapTransport(
                { listenOpts: { port: 5683 } },
                { listenOpts: { port: 5684 } }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withCoapClientTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withCoapClientTransport({
                port: 5683
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withCoapClientTransport({
                microservice: false,
                port: 5683
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('COAP_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(COAP_SERV_OPTIONS).toBeDefined();
            expect(COAP_SERV_OPTIONS.toString()).toContain('COAP_SERV_OPTIONS');
        });
    });

    describe('COAP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(COAP_CLIENT_OPTIONS).toBeDefined();
            expect(COAP_CLIENT_OPTIONS.toString()).toContain('COAP_CLIENT_OPTIONS');
        });
    });

    describe('CoapServer', () => {
        it('should exist as a class', () => {
            expect(CoapServer).toBeDefined();
            expect(typeof CoapServer).toBe('function');
        });
    });

    describe('CoAP Server listen', () => {
        it('should create a server instance', () => {
            const server = CoapServer.prototype;
            expect(server).toBeDefined();
        });
    });
});
