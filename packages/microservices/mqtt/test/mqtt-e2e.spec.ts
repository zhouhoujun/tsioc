import expect = require('expect');
import { withMqttTransport, mqttTransportFactory } from '../src/server';
import { withMqttClientTransport } from '../src/client';

describe('MQTT Transport E2E', () => {
    describe('Microservice Mode (microservice: true)', () => {
        it('factory creates feature with microservice config', () => {
            const feature = mqttTransportFactory({ microservice: true, url: 'mqtt://127.0.0.1:21883', asDefault: true });
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });
        it('client transport factory works', () => {
            const features = withMqttClientTransport({ url: 'mqtt://127.0.0.1:21883', microservice: true });
            expect(features[0].config.transport).toBeDefined();
        });
    });
    describe('Host Service Mode (microservice: false)', () => {
        it('factory creates feature with host config', () => {
            const feature = mqttTransportFactory({ microservice: false as any, url: 'mqtt://127.0.0.1:21884', asDefault: true });
            expect(feature.config.microservice).toBe(false);
        });
    });
});
