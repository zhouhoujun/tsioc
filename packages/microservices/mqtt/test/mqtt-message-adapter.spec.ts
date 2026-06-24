import expect = require('expect');
import { MqttMessageAdapter } from '../src/server/message-adapter';

describe('MQTT message adapter auth-facing reads', () => {
    it('reads authorization headers, query token, body payload, and writes status state', () => {
        const request = {
            headers: { authorization: 'Bearer mqtt-token', 'x-test': '1' },
            query: { token: 'query-token' },
            body: { id: 'u1' },
            params: { pid: 'p1' },
            paths: { name: 'alice' },
            topic: 'sensor/message/start'
        };
        const adapter = new MqttMessageAdapter(request, {} as any);
        adapter.setStatus(202, 'Accepted');
        adapter.setHeader('x-auth', 'ok');
        adapter.write({ ok: true });

        expect(adapter.read('headers', 'authorization')).toBe('Bearer mqtt-token');
        expect(adapter.read('query', 'token')).toBe('query-token');
        expect(adapter.read('body', 'id')).toBe('u1');
        expect(adapter.read('params', 'pid')).toBe('p1');
        expect(adapter.read('path', 'name')).toBe('alice');
        expect(adapter.read('topic')).toBe('sensor/message/start');
        expect(adapter.status).toBe(202);
        expect(adapter.getStatusMessage()).toBe('Accepted');
        expect(adapter.getResponseHeader('x-auth')).toBe('ok');
        expect(adapter.payload).toEqual({ ok: true });
    });

    it('publishes response payload to default response topic', () => {
        const published: Array<{ topic: string; payload: string }> = [];
        const client = {
            publish(topic: string, payload: string) {
                published.push({ topic, payload });
                return true;
            }
        };
        const adapter = new MqttMessageAdapter({ topic: 'sensor/message/start' }, client as any);

        adapter.sendResponse({ ok: true });

        expect(published).toEqual([{
            topic: 'sensor/message/start/response',
            payload: JSON.stringify({ payload: { ok: true } })
        }]);
    });

    it('publishes response payload to custom response topic', () => {
        const published: Array<{ topic: string; payload: string }> = [];
        const client = {
            publish(topic: string, payload: string) {
                published.push({ topic, payload });
                return true;
            }
        };
        const adapter = new MqttMessageAdapter({
            topic: 'sensor/message/start',
            responseTopic: 'custom/replies'
        }, client as any);

        adapter.write({ ok: true });
        adapter.sendResponse();

        expect(published).toEqual([{
            topic: 'custom/replies',
            payload: JSON.stringify({ payload: { ok: true } })
        }]);
    });

    it('publishes error payload with statusCode to custom response topic', () => {
        const published: Array<{ topic: string; payload: string }> = [];
        const client = {
            publish(topic: string, payload: string) {
                published.push({ topic, payload });
                return true;
            }
        };
        const adapter = new MqttMessageAdapter({
            topic: 'sensor/message/start',
            responseTopic: 'custom/errors'
        }, client as any);

        adapter.sendError({ message: 'Boom', statusCode: 503, details: { retry: true } });

        expect(adapter.status).toBe(503);
        expect(adapter.payload).toEqual({
            error: 'Boom',
            statusCode: 503,
            details: { retry: true }
        });
        expect(published).toEqual([{
            topic: 'custom/errors',
            payload: JSON.stringify({
                error: 'Boom',
                statusCode: 503,
                details: { retry: true }
            })
        }]);
    });
});
