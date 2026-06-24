import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withCoapTransport } from '../src/client';
import { CoapRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';

class FakeCoapResponse extends EventEmitter {
    constructor(public code: string, public payload: Buffer = Buffer.alloc(0), public options: any[] = []) {
        super();
    }

    close() {
        this.emit('end');
    }
}

class FakeCoapRequest extends EventEmitter {
    public writes: any[] = [];
    public ended = 0;
    public response?: FakeCoapResponse;

    write(value: any) {
        this.writes.push(value);
    }

    end() {
        this.ended += 1;
        if (this.response) {
            this.emit('response', this.response);
        }
    }
}

describe('CoAP client backend', () => {
    const originalRequest = require('coap').request;

    const feature = withCoapTransport({ host: '127.0.0.1', port: 5683, asDefault: true })[0];
    const backendToken = getClientBackendToken(feature.config as any);

    function createBackend() {
        const injector = createInjector(feature.providers as any);
        const [backend] = injector.get(backendToken) as unknown as Array<(input: any, context: any) => any>;
        return backend;
    }

    function createContext(request: CoapRequest<any>) {
        const injector = createInjector();
        return createRequestContext(injector, [[REQUEST, request]]);
    }

    afterEach(() => {
        require('coap').request = originalRequest;
    });

    it('returns ResponseEventPacket for emit', async () => {
        const backend = createBackend();
        const fake = new FakeCoapRequest();
        require('coap').request = () => fake;

        const request = new CoapRequest('/topic.emit', null, { observe: 'events' } as any, 'POST');
        const result: any = await lastValueFrom(backend('payload', createContext(request)));

        expect(result).toEqual({ type: 0 });
        expect(fake.ended).toBe(1);
    });

    it('returns body for body observe', async () => {
        const backend = createBackend();
        const fake = new FakeCoapRequest();
        fake.response = new FakeCoapResponse('2.05', Buffer.from(JSON.stringify({ status: 200, payload: 'done' })));
        require('coap').request = () => fake;

        const request = new CoapRequest('/topic.body', null, { observe: 'body' } as any, 'POST');
        const result = await lastValueFrom(backend({ hello: 'world' }, createContext(request)));

        expect(result).toBe('done');
    });

    it('returns response envelope for response observe', async () => {
        const backend = createBackend();
        const fake = new FakeCoapRequest();
        fake.response = new FakeCoapResponse('2.05', Buffer.from(JSON.stringify({ status: 201, statusMessage: 'Created', payload: { ok: true } })));
        require('coap').request = () => fake;

        const request = new CoapRequest('/topic.response', null, { observe: 'response' } as any, 'POST');
        const result: any = await lastValueFrom(backend({ hello: 'world' }, createContext(request)));

        expect(result.status).toBe(201);
        expect(result.statusText).toBe('Created');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const backend = createBackend();
        const fake = new FakeCoapRequest();
        fake.response = new FakeCoapResponse('4.00', Buffer.from(JSON.stringify({ status: 500, statusMessage: 'Boom', error: { message: 'Boom' } })));
        require('coap').request = () => fake;

        const request = new CoapRequest('/topic.error', null, { observe: 'body' } as any, 'POST');
        await expect(lastValueFrom(backend({ hello: 'world' }, createContext(request)))).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const backend = createBackend();
        const fake = new FakeCoapRequest();
        const response = new FakeCoapResponse('2.05');
        fake.response = response;
        require('coap').request = () => fake;

        const request = new CoapRequest('/topic.observe', null, { observe: 'observe' } as any, 'GET');
        const result$ = backend({ hello: 'world' }, createContext(request));
        const resultPromise = lastValueFrom(result$.pipe(take(2), toArray()));

        setTimeout(() => {
            response.emit('data', Buffer.from(JSON.stringify({ status: 200, payload: 'one' })));
            response.emit('data', Buffer.from(JSON.stringify({ status: 200, payload: 'two' })));
        }, 0);

        const result = await resultPromise;
        expect(result).toEqual(['one', 'two']);
    });
});
