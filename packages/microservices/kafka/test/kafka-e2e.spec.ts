import { Transport, TransferSide } from '@tsdi/common';
import { provideService, useRouter } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import expect = require('expect');
import { useKafkaTransport, kafkaTransportFactory, KAFKA_SERV_OPTIONS, KafkaServOptions } from '../src/server';
import { withKafkaTransport, KAFKA_CLIENT_OPTIONS } from '../src/client';

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
            const has = feature.providers.some((p: any) => p.provide === KAFKA_SERV_OPTIONS)
                || ((feature.config as any).providers || []).some((p: any) => p.provide === KAFKA_SERV_OPTIONS);
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
            const feature = kafkaTransportFactory({ microservice: false as any, brokers: ['127.0.0.1:29093'], asDefault: true });
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
            const transportFeatures = useKafkaTransport({ microservice: false as any, brokers: ['127.0.0.1:29093'], asDefault: true });
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
            const topics = [{ topic: 'test-topic' }];
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
