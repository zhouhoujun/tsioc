import { KafkaServer, KafkaServOptions, kafkaTransportFactory, withKafkaTransport, KAFKA_SERV_OPTIONS } from '../src/server';
import { withKafkaClientTransport, KAFKA_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import expect = require('expect');

describe('Kafka Microservice', () => {
    describe('KafkaServOptions', () => {
        it('should create valid Kafka server options', () => {
            const options: Partial<KafkaServOptions> = { transport: Transport.Kafka, side: TransferSide.server, microservice: true, brokers: ['localhost:9092'] };
            expect(options.transport).toBe(Transport.Kafka);
            expect(options.brokers).toBeDefined();
        });
        it('should accept topics', () => {
            const options: Partial<KafkaServOptions> = { transport: Transport.Kafka, topics: [{ topic: 'test' }] };
            expect(options.topics).toBeDefined();
            expect(options.topics!.length).toBe(1);
        });
    });

    describe('kafkaTransportFactory', () => {
        it('should create a valid Kafka transport feature', () => {
            const feature = kafkaTransportFactory({ brokers: ['localhost:9092'] });
            expect(feature.kind).toBeDefined();
            expect(feature.config.transport).toBe(Transport.Kafka);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('should include KAFKA_SERV_OPTIONS provider', () => {
            const feature = kafkaTransportFactory({ brokers: ['localhost:9092'] });
            const has = feature.providers.some((p: any) => p.provide === KAFKA_SERV_OPTIONS) ||
                ((feature.config as any).providers || []).some((p: any) => p.provide === KAFKA_SERV_OPTIONS);
            expect(has).toBe(true);
        });
        it('should use json packet transfer by default', () => {
            const feature = kafkaTransportFactory({ brokers: ['localhost:9092'] });
            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('withKafkaTransport', () => {
        it('should create multiple transport features', () => {
            expect(withKafkaTransport({ brokers: ['localhost:9092'] }, { brokers: ['localhost:9093'] }).length).toBe(2);
        });
    });

    describe('withKafkaClientTransport', () => {
        it('should use json packet transfer by default', () => {
            expect(withKafkaClientTransport({ brokers: ['localhost:9092'] })[0].config.features?.defaultTransfer).toBeDefined();
        });
    });

    describe('tokens', () => {
        it('KAFKA_SERV_OPTIONS should be defined', () => {
            expect(KAFKA_SERV_OPTIONS.toString()).toContain('KAFKA_SERV_OPTIONS');
        });
        it('KAFKA_CLIENT_OPTIONS should be defined', () => {
            expect(KAFKA_CLIENT_OPTIONS.toString()).toContain('KAFKA_CLIENT_OPTIONS');
        });
    });

    describe('KafkaServer', () => {
        it('should exist as a class', () => {
            expect(typeof KafkaServer).toBe('function');
        });
    });
});
