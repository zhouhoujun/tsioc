import expect = require('expect');
import { httpSpanAttributes, messagingSpanAttributes } from '../src/semconv';

describe('OpenTelemetry semantic conventions', () => {
    it('emits legacy and current HTTP attributes together', () => {
        const attributes = httpSpanAttributes('GET', '/api/users?active=1', {
            scheme: 'https',
            status: 502,
            serviceName: 'gateway'
        });
        expect(attributes).toMatchObject({
            'http.method': 'GET',
            'http.request.method': 'GET',
            'http.url': '/api/users?active=1',
            'url.full': '/api/users?active=1',
            'url.path': '/api/users',
            'url.scheme': 'https',
            'http.status_code': 502,
            'http.response.status_code': 502,
            'service.name': 'gateway'
        });
        expect(attributes['http.route']).toBeUndefined();
    });

    it('supports route and status overrides', () => {
        const attributes = httpSpanAttributes('POST', '/api/users/1', {
            route: '/api/users/:id',
            status: 201
        });
        expect(attributes['http.route']).toBe('/api/users/:id');
        expect(attributes['http.response.status_code']).toBe(201);
    });

    it('emits legacy and current messaging attributes', () => {
        expect(messagingSpanAttributes('orders.created', 'kafka')).toEqual({
            'messaging.destination': 'orders.created',
            'messaging.destination.name': 'orders.created',
            'messaging.system': 'kafka'
        });
        expect(messagingSpanAttributes('orders.created')).toEqual({
            'messaging.destination': 'orders.created',
            'messaging.destination.name': 'orders.created'
        });
    });
});
