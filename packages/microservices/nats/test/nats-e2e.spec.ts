import expect = require('expect');
import { withNatsTransport, natsTransportFactory } from '../src/server';

describe('NATS Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = natsTransportFactory({ microservice: true, url: 'nats://127.0.0.1:24222', asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = natsTransportFactory({ microservice: false as any, url: 'nats://127.0.0.1:24223', asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
