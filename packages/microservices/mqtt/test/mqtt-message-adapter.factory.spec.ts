import expect = require('expect');
import { MqttMessageAdapterFactory } from '../src/server/message-adapter.factory';
import { MqttMessageAdapter } from '../src/server/message-adapter';

describe('MQTT message adapter factory', () => {
    it('creates a message adapter with request and response', () => {
        const factory = new MqttMessageAdapterFactory();
        const request = { topic: 'sensor/message/start', payload: { id: 'u1' } };
        const response = { publish() { return true; } } as any;

        const adapter = factory.create({ request, response, context: {} as any });

        expect(adapter).toBeInstanceOf(MqttMessageAdapter);
        expect(adapter.request).toBe(request);
        expect(adapter.response).toBe(response);
    });
});
