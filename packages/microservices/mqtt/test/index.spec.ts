import expect = require('expect');
import * as root from '../src';
import * as client from '../src/client';
import * as server from '../src/server';

describe('MQTT package exports', () => {
    it('re-exports root package symbols', () => {
        expect(root.MqttModule).toBeDefined();
        expect(root.MqttClient).toBeDefined();
        expect(root.MqttServer).toBeDefined();
        expect(root.withMqttTransport).toBeDefined();
        expect(root.useMqttTransport).toBeDefined();
    });

    it('re-exports client package symbols', () => {
        expect(client.MQTT_CLIENT_OPTIONS).toBeDefined();
        expect(client.withMqttTransport).toBeDefined();
    });

    it('re-exports server package symbols', () => {
        expect(server.MQTT_SERV_OPTIONS).toBeDefined();
        expect(server.useMqttTransport).toBeDefined();
        expect(server.MqttMessageAdapterFactory).toBeDefined();
    });
});
