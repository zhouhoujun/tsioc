import expect = require('expect');
import { TransferSide, TransferConfig, AbstractRequest, StatusMessageAdapter } from '@tsdi/common';
import { useJsonPacket, requestMapping, outgoingMapping } from '../src/providers';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';

describe('useJsonPacket', () => {
    it('returns a function (TransferFilterFactory)', () => {
        const factory = useJsonPacket();
        expect(typeof factory).toBe('function');
    });

    it('client side creates filter interceptors', () => {
        const factory = useJsonPacket();
        const config: TransferConfig = { side: TransferSide.client, features: {} } as any;
        const filters = factory(config);
        expect(Array.isArray(filters)).toBe(true);
        expect(filters.length).toBeGreaterThan(0);
    });

    it('server side creates filter interceptors', () => {
        const factory = useJsonPacket();
        const config: TransferConfig = { side: TransferSide.server, features: {} } as any;
        const filters = factory(config);
        expect(Array.isArray(filters)).toBe(true);
        expect(filters.length).toBeGreaterThan(0);
    });
});

describe('requestMapping', () => {
    it('maps AbstractRequest url fields', () => {
        const req = Object.assign(Object.create(AbstractRequest.prototype), {
            url: '/api/test?foo=1',
            method: 'GET',
            body: { data: true }
        });
        const ctx = createRequestContext(createInjector([]));
        const result = requestMapping(req, ctx);
        expect(result.url).toBe('/api/test');
        expect(result.query).toBeDefined();
        expect(result.query.foo).toBe('1');
        expect(result.method).toBe('GET');
        expect(result.body).toEqual({ data: true });
    });

    it('maps topic and pattern fields', () => {
        const req: any = { topic: 'sensor.temp', pattern: { cmd: 'read' }, body: 'test' };
        const ctx = createRequestContext(createInjector([]));
        const result = requestMapping(req, ctx);
        expect(result.topic).toBe('sensor.temp');
    });

    it('maps params and headers', () => {
        const req: any = {
            url: '/test',
            method: 'POST',
            params: { id: '42' },
            headers: { size: 1, getHeaders: () => ({ 'x-auth': 'token' }) }
        };
        const ctx = createRequestContext(createInjector([]));
        const result = requestMapping(req, ctx);
        expect(result.params).toEqual({ id: '42' });
        expect(result.headers).toEqual({ 'x-auth': 'token' });
    });

    it('returns non-AbstractRequest as-is', () => {
        const ctx = createRequestContext(createInjector([]));
        const result = requestMapping({ raw: true }, ctx);
        expect(result.raw).toBe(true);
    });
});

describe('outgoingMapping', () => {
    it('maps StatusMessageAdapter fields', () => {
        const ctx = createRequestContext(createInjector([]));
        const adapter = {
            status: 200,
            getStatusMessage: () => 'OK',
            error: null,
            payload: { result: 'done' },
            getResponseHeaderNames: () => ['x-custom'],
            getResponseHeader: (name: string) => name === 'x-custom' ? 'val' : undefined
        };
        ctx.set(StatusMessageAdapter, adapter as any);
        const result = outgoingMapping({ id: 1 }, ctx);
        expect(result.status).toBe(200);
        expect(result.statusMessage).toBe('OK');
        expect(result.body).toEqual({ result: 'done' });
        expect(result.headers['x-custom']).toBe('val');
    });

    it('returns response as-is when no adapter', () => {
        const ctx = createRequestContext(createInjector([]));
        const result = outgoingMapping('plain', ctx);
        expect(result).toBe('plain');
    });
});
