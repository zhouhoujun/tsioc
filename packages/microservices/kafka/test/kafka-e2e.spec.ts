import expect = require('expect');
import { withKafkaTransport, kafkaTransportFactory } from '../src/server';

describe('Kafka Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = kafkaTransportFactory({ microservice: true, brokers: ['127.0.0.1:29092'], asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = kafkaTransportFactory({ microservice: false as any, brokers: ['127.0.0.1:29093'], asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
