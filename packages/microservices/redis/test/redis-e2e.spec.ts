import expect = require('expect');
import { withRedisTransport, redisTransportFactory } from '../src/server';

describe('Redis Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = redisTransportFactory({ microservice: true, url: 'redis://127.0.0.1:26379', asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = redisTransportFactory({ microservice: false as any, url: 'redis://127.0.0.1:26380', asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
