import expect = require('expect');
import { withAmqpTransport, amqpTransportFactory } from '../src/server';

describe('AMQP Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = amqpTransportFactory({ microservice: true, url: 'amqp://127.0.0.1:25672', asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = amqpTransportFactory({ microservice: false as any, url: 'amqp://127.0.0.1:25673', asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
