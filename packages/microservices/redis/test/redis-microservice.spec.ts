import { RedisServer, RedisServOptions, redisTransportFactory, useRedisTransport, REDIS_SERV_OPTIONS } from '../src/server';
import { withRedisTransport, REDIS_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { createInjector } from '@tsdi/ioc';
import { getServiceRouterToken } from '@tsdi/service';
import expect = require('expect');

describe('Redis Microservice', () => {

    describe('RedisServOptions', () => {
        it('should create valid Redis server options', () => {
            const options: Partial<RedisServOptions> = {
                transport: Transport.Redis,
                side: TransferSide.server,
                microservice: true,
                url: 'redis://localhost:6379'
            };

            expect(options.transport).toBe(Transport.Redis);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
        });

        it('should accept asDefault property', () => {
            const options: Partial<RedisServOptions> = {
                transport: Transport.Redis,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });

        it('should accept channels', () => {
            const options: Partial<RedisServOptions> = {
                transport: Transport.Redis,
                channels: ['channel1', 'channel2']
            };

            expect(options.channels).toBeDefined();
            expect(options.channels!.length).toBe(2);
        });
    });

    describe('redisTransportFactory', () => {
        it('should create a valid Redis transport feature', () => {
            const feature = redisTransportFactory({});

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.Redis);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include REDIS_SERV_OPTIONS provider', () => {
            const feature = redisTransportFactory({});

            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === REDIS_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === REDIS_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use json packet transfer by default', () => {
            const feature = redisTransportFactory({});
            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = redisTransportFactory({
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });
    });

    describe('useRedisTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = useRedisTransport(
                {},
                {}
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withRedisTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withRedisTransport({});
            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withRedisTransport({
                microservice: false
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('REDIS_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(REDIS_SERV_OPTIONS).toBeDefined();
            expect(REDIS_SERV_OPTIONS.toString()).toContain('REDIS_SERV_OPTIONS');
        });
    });

    describe('REDIS_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(REDIS_CLIENT_OPTIONS).toBeDefined();
            expect(REDIS_CLIENT_OPTIONS.toString()).toContain('REDIS_CLIENT_OPTIONS');
        });
    });

    describe('RedisServer', () => {
        it('should exist as a class', () => {
            expect(RedisServer).toBeDefined();
            expect(typeof RedisServer).toBe('function');
        });

        it('merges subscribe routes into redis channels', () => {
            const options = redisTransportFactory({}).config as RedisServOptions;
            const injector = createInjector([
                {
                    provide: getServiceRouterToken(options as any),
                    useValue: {
                        formatter: { format: (pattern: any) => String(pattern) },
                        routes: [
                            { pattern: 'device.events', subscribe: true },
                            { pattern: 'device.events', subscribe: true },
                            { pattern: 'device.ignore', subscribe: false }
                        ]
                    }
                } as any
            ]);
            const server = new RedisServer({ injector } as any, options);

            expect((server as any).resolveChannels()).toEqual(['device.events']);
        });
    });
});
