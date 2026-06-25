import { NatsServer, NatsServOptions, natsTransportFactory, useNatsTransport, NATS_SERV_OPTIONS } from '../src/server';
import { withNatsTransport, NATS_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { createInjector } from '@tsdi/ioc';
import { getServiceRouterToken, getSubscribePatterns, mergeSubscribePatterns } from '@tsdi/service';
import expect = require('expect');

describe('NATS Microservice', () => {

    describe('NatsServOptions', () => {
        it('should create valid NATS server options', () => {
            const options: Partial<NatsServOptions> = {
                transport: Transport.NATS,
                side: TransferSide.server,
                microservice: true,
                url: 'nats://localhost:4222'
            };

            expect(options.transport).toBe(Transport.NATS);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.url).toBe('nats://localhost:4222');
        });

        it('should accept asDefault property', () => {
            const options: Partial<NatsServOptions> = {
                transport: Transport.NATS,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });

        it('should accept subjects', () => {
            const options: Partial<NatsServOptions> = {
                transport: Transport.NATS,
                subjects: ['test.>']
            };

            expect(options.subjects).toBeDefined();
            expect(options.subjects!.length).toBe(1);
        });
    });

    describe('natsTransportFactory', () => {
        it('should create a valid NATS transport feature', () => {
            const feature = natsTransportFactory({
                url: 'nats://localhost:4222'
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.NATS);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include NATS_SERV_OPTIONS provider', () => {
            const feature = natsTransportFactory({
                url: 'nats://localhost:4222'
            });

            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === NATS_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === NATS_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use json packet transfer by default', () => {
            const feature = natsTransportFactory({
                url: 'nats://localhost:4222'
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = natsTransportFactory({
                url: 'nats://localhost:4222',
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });
    });

    describe('useNatsTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = useNatsTransport(
                { url: 'nats://localhost:4222' },
                { url: 'nats://localhost:4223' }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withNatsTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withNatsTransport({
                url: 'nats://localhost:4222'
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withNatsTransport({
                microservice: false,
                url: 'nats://localhost:4222'
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('NATS_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(NATS_SERV_OPTIONS).toBeDefined();
            expect(NATS_SERV_OPTIONS.toString()).toContain('NATS_SERV_OPTIONS');
        });
    });

    describe('NATS_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(NATS_CLIENT_OPTIONS).toBeDefined();
            expect(NATS_CLIENT_OPTIONS.toString()).toContain('NATS_CLIENT_OPTIONS');
        });
    });

    describe('NatsServer', () => {
        it('should exist as a class', () => {
            expect(NatsServer).toBeDefined();
            expect(typeof NatsServer).toBe('function');
        });

        it('merges subscribe routes into nats subjects', () => {
            const options = natsTransportFactory({ url: 'nats://localhost:4222' }).config as NatsServOptions;
            const injector = createInjector([
                {
                    provide: getServiceRouterToken(options as any),
                    useValue: {
                        formatter: { format: (pattern: any) => String(pattern) },
                        routes: [
                            { pattern: 'sensor.*.start', subscribe: true },
                            { pattern: 'sensor.ignore', subscribe: false }
                        ]
                    }
                } as any
            ]);
            const server = new NatsServer({ injector } as any, options);
            const subjects = mergeSubscribePatterns(options.subjects, getSubscribePatterns(options, server.injector), ['>']);

            expect(subjects).toEqual(['sensor.*.start']);
        });
    });
});
