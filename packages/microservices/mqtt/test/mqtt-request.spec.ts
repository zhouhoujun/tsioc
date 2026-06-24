import expect = require('expect');
import { MqttRequest } from '../src/client/request';

describe('MQTT request', () => {
    it('serializes topic request with payload and response topic', () => {
        const request = new MqttRequest('sensor/message/start', { cmd: 'sensor.start' }, {
            id: 'req-1',
            payload: { enabled: true },
            headers: { authorization: 'Bearer mqtt' }
        });

        expect(request.toJson()).toEqual({
            topic: 'sensor/message/start',
            responseTopic: 'sensor/message/start/response',
            id: 'req-1',
            pattern: { cmd: 'sensor.start' },
            headers: { authorization: 'Bearer mqtt' },
            payload: { enabled: true }
        });
    });

    it('clones request with updated topic and payload', () => {
        const request = new MqttRequest('sensor/message/start', null, {
            payload: { enabled: true },
            observe: 'response'
        });

        const cloned = request.clone({
            topic: 'sensor/message/stop',
            payload: { enabled: false }
        });

        expect(cloned.topic).toBe('sensor/message/stop');
        expect(cloned.responseTopic).toBe('sensor/message/stop/response');
        expect(cloned.payload).toEqual({ enabled: false });
        expect(cloned.observe).toBe('response');
    });
});
