import expect = require('expect');
import { resolveMqttMessageId } from '../src/server/mqtt-server';

describe('MQTT message ids', () => {
    it('derives a stable id from QoS packet id and payload', () => {
        const payload = Buffer.from('{"payload":{"ok":1}}');
        const first = resolveMqttMessageId('orders', payload, { messageId: 7 });
        const second = resolveMqttMessageId('orders', Buffer.from('{"payload":{"ok":1}}'), { messageId: 7 });
        expect(first).toBeDefined();
        expect(second).toBe(first);
    });

    it('separates topics, packet ids and payloads', () => {
        const payload = Buffer.from('a');
        const base = resolveMqttMessageId('orders', payload, { messageId: 7 });
        expect(resolveMqttMessageId('events', payload, { messageId: 7 })).not.toBe(base);
        expect(resolveMqttMessageId('orders', payload, { messageId: 8 })).not.toBe(base);
        expect(resolveMqttMessageId('orders', Buffer.from('b'), { messageId: 7 })).not.toBe(base);
    });

    it('has no id for QoS0 deliveries without a packet id', () => {
        expect(resolveMqttMessageId('orders', Buffer.from('a'), {})).toBeUndefined();
        expect(resolveMqttMessageId('orders', Buffer.from('a'), undefined)).toBeUndefined();
    });
});
