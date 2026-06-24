import expect = require('expect');
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MqttModule } from '../src/mqtt.module';
import { MqttClient } from '../src/client/client';
import { MqttServer } from '../src/server/mqtt-server';

describe('MQTT module', () => {
    it('exports module tokens', () => {
        expect(MQTT_SERV_INTERCEPTORS.toString()).toContain('MQTT_SERV_INTERCEPTORS');
        expect(MQTT_SERV_FILTERS.toString()).toContain('MQTT_SERV_FILTERS');
        expect(MQTT_SERV_GUARDS.toString()).toContain('MQTT_SERV_GUARDS');
    });

    it('declares client and server types', () => {
        expect(MqttModule).toBeDefined();
        expect(MqttClient).toBeDefined();
        expect(MqttServer).toBeDefined();
    });
});
