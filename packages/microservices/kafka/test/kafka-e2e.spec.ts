import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, Transport, TransferSide } from '@tsdi/common';
import { AuthOptions, provideService, useAuth, useRouter, Controller, Get } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import expect = require('expect');
import { Kafka, Consumer } from 'kafkajs';
import { useKafkaTransport, kafkaTransportFactory, KAFKA_SERV_OPTIONS, KafkaServOptions } from '../src/server';
import { withKafkaTransport, KAFKA_CLIENT_OPTIONS } from '../src/client';
import { MessageAuthInterceptor } from '@tsdi/service';

interface ProviderWithToken {
    provide?: unknown;
    useExisting?: unknown;
}

interface KafkaTopicConfig {
    topic: string;
    fromBeginning?: boolean;
}

describe('Kafka Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = kafkaTransportFactory({ microservice: true, brokers: ['127.0.0.1:29092'], asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.config.transport).toBe(Transport.Kafka);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.kind).toBeDefined();
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('includes KAFKA_SERV_OPTIONS provider', () => {
            const feature = kafkaTransportFactory({ brokers: ['127.0.0.1:29092'] });
            const configProviders = ((feature.config as KafkaServOptions).providers ?? []) as ProviderWithToken[];
            const has = feature.providers.some((provider) => {
                const typed = provider as ProviderWithToken;
                return typed.provide === KAFKA_SERV_OPTIONS;
            }) || configProviders.some((provider) => provider.provide === KAFKA_SERV_OPTIONS);
            expect(has).toBe(true);
        });

        it('client transport factory produces microservice client config', () => {
            const features = withKafkaTransport({ brokers: ['127.0.0.1:29092'], microservice: true });
            expect(features.length).toBe(1);
            expect(features[0].config.microservice).toBe(true);
            expect(features[0].config.transport).toBe(Transport.Kafka);
        });
    });

    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = kafkaTransportFactory({ microservice: false, brokers: ['127.0.0.1:29093'], asDefault: true });
            expect(feature.config.microservice).toBe(false);
            expect(feature.config.transport).toBe(Transport.Kafka);
        });

        it('client transport factory produces host client config', () => {
            const features = withKafkaTransport({ brokers: ['127.0.0.1:29093'], microservice: false });
            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('Module Registration', () => {
        it('provideService with useKafkaTransport creates providers for microservice:true', () => {
            const transportFeatures = useKafkaTransport({ brokers: ['127.0.0.1:29092'], asDefault: true });
            const providers = provideService(useRouter(), ...transportFeatures);
            expect(providers.length).toBeGreaterThan(0);
            expect(transportFeatures[0].config.microservice).toBe(true);
        });

        it('provideService with useKafkaTransport creates providers for microservice:false', () => {
            const transportFeatures = useKafkaTransport({ microservice: false, brokers: ['127.0.0.1:29093'], asDefault: true });
            const providers = provideService(useRouter(), ...transportFeatures);
            expect(providers.length).toBeGreaterThan(0);
            expect(transportFeatures[0].config.microservice).toBe(false);
        });

        it('provideClient with withKafkaTransport creates client providers for microservice:true', () => {
            const clientFeatures = withKafkaTransport({ brokers: ['127.0.0.1:29092'], microservice: true, asDefault: true });
            const providers = provideClient(...clientFeatures);
            expect(providers.length).toBeGreaterThan(0);
        });

        it('provideClient with withKafkaTransport creates client providers for microservice:false', () => {
            const clientFeatures = withKafkaTransport({ brokers: ['127.0.0.1:29093'], microservice: false, asDefault: true });
            const providers = provideClient(...clientFeatures);
            expect(providers.length).toBeGreaterThan(0);
        });
    });

    describe('useKafkaTransport', () => {
        it('creates multiple features for multiple options', () => {
            const features = useKafkaTransport(
                { brokers: ['127.0.0.1:29092'], asDefault: true },
                { brokers: ['127.0.0.1:29093'] }
            );
            expect(features.length).toBe(2);
            expect(features[0].config.microservice).toBe(true);
        });
    });

    describe('Kafka options', () => {
        it('accepts topics configuration', () => {
            const topics: KafkaTopicConfig[] = [{ topic: 'test-topic' }];
            const feature = kafkaTransportFactory({ topics });
            expect((feature.config as KafkaServOptions).topics).toEqual(topics);
        });

        it('accepts clientId and groupId', () => {
            const feature = kafkaTransportFactory({
                clientId: 'test-client',
                groupId: 'test-group'
            });
            expect((feature.config as KafkaServOptions).clientId).toBe('test-client');
            expect((feature.config as KafkaServOptions).groupId).toBe('test-group');
        });

        it('registers message auth interceptor when auth is enabled', () => {
            const feature = kafkaTransportFactory({
                brokers: ['127.0.0.1:29092'],
                features: { auth: { bearerToken: 'secret-token' } }
            });
            const hasAuthProvider = feature.providers.some((provider) => {
                const typed = provider as ProviderWithToken;
                return typed.useExisting === MessageAuthInterceptor;
            });
            expect(hasAuthProvider).toBe(true);
        });
    });

    describe('tokens', () => {
        it('KAFKA_SERV_OPTIONS should be defined', () => {
            expect(KAFKA_SERV_OPTIONS).toBeDefined();
            expect(KAFKA_SERV_OPTIONS.toString()).toContain('KAFKA_SERV_OPTIONS');
        });
        it('KAFKA_CLIENT_OPTIONS should be defined', () => {
            expect(KAFKA_CLIENT_OPTIONS).toBeDefined();
        });
    });
});

if (process.env.TSIO_TEST_KAFKA) describe('Kafka auth E2E', () => {
    const BROKERS = ['127.0.0.1:29092'];
    const TOPIC = 'e2e.auth.ping';
    const authOptions: AuthOptions = { bearerToken: 'secret-token' };

    interface KafkaAuthEnvelope {
        url: string;
        method: string;
        headers?: Record<string, string>;
    }

    interface KafkaAuthResponse {
        ok?: boolean;
        statusCode?: number;
        error?: string;
        payload?: { ok?: boolean; statusCode?: number; error?: string };
    }

    @Controller('/secure')
    class KafkaSecureController {
        @Get('/ping')
        ping() { return { ok: true }; }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [KafkaSecureController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useKafkaTransport({
                    brokers: BROKERS,
                    topics: [{ topic: TOPIC }],
                    clientId: 'auth-server',
                    groupId: 'auth-group',
                    asDefault: true
                })
            )
        ]
    })
    class KafkaAuthModule { }

    let ctx: ApplicationContext;
    let kafka: Kafka;
    let producer: ReturnType<Kafka['producer']>;
    let consumer: Consumer;
    const pending = [] as Array<(value: KafkaAuthResponse) => void>;

    before(async () => {
        ctx = await Application.run(KafkaAuthModule);
        kafka = new Kafka({ clientId: 'auth-test', brokers: BROKERS });
        producer = kafka.producer();
        consumer = kafka.consumer({ groupId: `auth-test-${Date.now()}` });
        await producer.connect();
        await consumer.connect();
        await consumer.subscribe({ topic: `${TOPIC}.response`, fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message: response }) => {
                const resolve = pending.shift();
                if (!resolve) {
                    return;
                }
                const text = response.value?.toString() ?? '{}';
                resolve(JSON.parse(text) as KafkaAuthResponse);
            }
        });
    });

    after(async () => {
        if (consumer) {
            await consumer.disconnect();
        }
        if (producer) {
            await producer.disconnect();
        }
        if (ctx) await ctx.destroy();
    });

    function requestKafka(message: KafkaAuthEnvelope): Promise<KafkaAuthResponse> {
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout')), 4000);
            pending.push((value) => {
                clearTimeout(timer);
                resolve(value);
            });

            await producer.send({
                topic: TOPIC,
                messages: [{ value: JSON.stringify(message) }]
            });
        });
    }

    it('accepts requests with bearer token', async () => {
        const result = await requestKafka({
            url: '/secure/ping',
            method: 'GET',
            headers: { authorization: 'Bearer secret-token' }
        });
        expect(result.ok ?? result.payload?.ok).toBe(true);
    });

    it('rejects requests without bearer token', async () => {
        const result = await requestKafka({
            url: '/secure/ping',
            method: 'GET'
        });
        expect(result.statusCode ?? result.payload?.statusCode).toBe(401);
        expect(result.error ?? result.payload?.error).toContain('Unauthorized');
    });
});
