import { AmqpServer, AmqpServOptions, amqpTransportFactory, withAmqpTransport, AMQP_SERV_OPTIONS } from '../src/server';
import { withAmqpClientTransport, AMQP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('AMQP Microservice', () => {

    describe('AmqpServOptions', () => {
        it('should create valid AMQP server options', () => {
            const options: Partial<AmqpServOptions> = {
                transport: Transport.AMQP,
                side: TransferSide.server,
                microservice: true,
                url: 'amqp://localhost:5672'
            };

            expect(options.transport).toBe(Transport.AMQP);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.url).toBe('amqp://localhost:5672');
        });

        it('should accept asDefault property', () => {
            const options: Partial<AmqpServOptions> = {
                transport: Transport.AMQP,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });

        it('should accept exchange and routingKey', () => {
            const options: Partial<AmqpServOptions> = {
                transport: Transport.AMQP,
                exchange: 'test-exchange',
                exchangeType: 'topic',
                routingKey: 'test.#'
            };

            expect(options.exchange).toBe('test-exchange');
            expect(options.exchangeType).toBe('topic');
            expect(options.routingKey).toBe('test.#');
        });
    });

    describe('amqpTransportFactory', () => {
        it('should create a valid AMQP transport feature', () => {
            const feature = amqpTransportFactory({
                url: 'amqp://localhost:5672'
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.AMQP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include AMQP_SERV_OPTIONS provider', () => {
            const feature = amqpTransportFactory({
                url: 'amqp://localhost:5672'
            });

            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === AMQP_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === AMQP_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use json packet transfer by default', () => {
            const feature = amqpTransportFactory({
                url: 'amqp://localhost:5672'
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = amqpTransportFactory({
                url: 'amqp://localhost:5672',
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });
    });

    describe('withAmqpTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = withAmqpTransport(
                { url: 'amqp://localhost:5672' },
                { url: 'amqp://localhost:5673' }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withAmqpClientTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withAmqpClientTransport({
                url: 'amqp://localhost:5672'
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withAmqpClientTransport({
                microservice: false,
                url: 'amqp://localhost:5672'
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('AMQP_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(AMQP_SERV_OPTIONS).toBeDefined();
            expect(AMQP_SERV_OPTIONS.toString()).toContain('AMQP_SERV_OPTIONS');
        });
    });

    describe('AMQP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(AMQP_CLIENT_OPTIONS).toBeDefined();
            expect(AMQP_CLIENT_OPTIONS.toString()).toContain('AMQP_CLIENT_OPTIONS');
        });
    });

    describe('AmqpServer', () => {
        it('should exist as a class', () => {
            expect(AmqpServer).toBeDefined();
            expect(typeof AmqpServer).toBe('function');
        });
    });
});
