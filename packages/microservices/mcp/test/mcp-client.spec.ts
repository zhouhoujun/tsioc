import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import * as http from 'node:http';
import { lastValueFrom } from 'rxjs';
import { McpClient } from '../src/client/client';
import { McpRequest } from '../src/client/request';
import { withMcpTransport } from '../src/client/factory';
import { getClientBackendToken } from '@tsdi/client';

class TestMcpClient extends McpClient {
    public makeRequest(first: any, options: any = {}) {
        return this.buildRequest(first, options);
    }
}

class FakeClientRequest extends EventEmitter {
    public body = '';
    public ended = false;
    public destroyed = false;

    write(chunk: string) {
        this.body += chunk;
        return true;
    }

    end() {
        this.ended = true;
        this.emit('finish');
    }

    destroy() {
        this.destroyed = true;
    }
}

class FakeIncomingMessage extends EventEmitter {
    constructor(private readonly chunks: string[]) {
        super();
    }

    flush() {
        this.chunks.forEach(chunk => this.emit('data', chunk));
        this.emit('end');
    }
}

describe('McpClient', () => {
    const originalRequest = http.request;

    function createClient(options: any = {}) {
        const injector = createInjector();
        const handler = { injector } as any;
        return new TestMcpClient(handler, options);
    }

    function createBackend(options: any = {}) {
        const [feature] = withMcpTransport({ ...options, asDefault: true });
        const injector = createInjector(feature.providers as any);
        const [backend] = injector.get(getClientBackendToken(feature.config as any)) as unknown as Array<(input: any, context: any) => any>;
        return backend;
    }

    function mockHttpRequest(responder: (request: FakeClientRequest, options: http.RequestOptions, callback: (res: any) => void) => void) {
        (http as any).request = (options: http.RequestOptions, callback: (res: any) => void) => {
            const request = new FakeClientRequest();
            responder(request, options, callback);
            return request;
        };
    }

    afterEach(() => {
        (http as any).request = originalRequest;
    });

    it('builds CALL requests by default in host mode', () => {
        const client = createClient({ url: 'http://127.0.0.1:3100', microservice: false });
        const request = client.makeRequest('/tools/list');

        expect(request).toBeInstanceOf(McpRequest);
        expect(request.method).toBe('CALL');
    });

    it('returns response envelopes for observe=response', async () => {
        const backend = createBackend({ url: 'http://127.0.0.1:3100' });
        mockHttpRequest((request, options, callback) => {
            const response = new FakeIncomingMessage([
                JSON.stringify({ jsonrpc: '2.0', result: { ok: true }, id: 1 })
            ]);
            process.nextTick(() => {
                callback(response);
                response.flush();
            });

            request.on('finish', () => {
                expect(options.hostname).toBe('127.0.0.1');
                expect(options.method).toBe('POST');
                const sent = JSON.parse(request.body);
                expect(sent.method).toBe('api.tools.list');
                expect(sent.params.__method).toBe('GET');
            });
        });

        const client = createClient({ url: 'http://127.0.0.1:3100' });
        const result: any = await lastValueFrom(backend(client.makeRequest('/api/tools/list', {
            method: 'GET',
            observe: 'response'
        } as any), {}));

        expect(result.ok).toBe(true);
        expect(result.body).toEqual({ ok: true });
    });

    it('throws rpc errors for body observe requests', async () => {
        const backend = createBackend({ url: 'http://127.0.0.1:3100' });
        mockHttpRequest((request, _options, callback) => {
            const response = new FakeIncomingMessage([
                JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: 401, message: 'Unauthorized', data: { reason: 'token' } },
                    id: 1
                })
            ]);
            process.nextTick(() => {
                callback(response);
                response.flush();
            });
        });

        const client = createClient({ url: 'http://127.0.0.1:3100' });

        await expect(lastValueFrom(backend(client.makeRequest('/secure/ping', {
            method: 'GET'
        } as any), {}))).rejects.toMatchObject({
            status: 401,
            statusMessage: 'Unauthorized',
            body: { reason: 'token' }
        });
    });

    it('returns rpc errors as response objects for observe=response', async () => {
        const backend = createBackend({ url: 'http://127.0.0.1:3100' });
        mockHttpRequest((request, _options, callback) => {
            const response = new FakeIncomingMessage([
                JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: 500, message: 'Boom', data: { traceId: 't1' } },
                    id: 1
                })
            ]);
            process.nextTick(() => {
                callback(response);
                response.flush();
            });
        });

        const client = createClient({ url: 'http://127.0.0.1:3100' });
        const result: any = await lastValueFrom(backend(client.makeRequest('/secure/ping', {
            method: 'GET',
            observe: 'response'
        } as any), {}));

        expect(result.ok).toBe(false);
        expect(result.status).toBe(500);
        expect(result.body).toEqual({ traceId: 't1' });
    });

    it('surfaces invalid json-rpc payloads', async () => {
        const backend = createBackend({ url: 'http://127.0.0.1:3100' });
        mockHttpRequest((_request, _options, callback) => {
            const response = new FakeIncomingMessage(['not-json']);
            process.nextTick(() => {
                callback(response);
                response.flush();
            });
        });

        const client = createClient({ url: 'http://127.0.0.1:3100' });

        await expect(lastValueFrom(backend(client.makeRequest('/broken', {
            method: 'GET'
        } as any), {}))).rejects.toThrow('Invalid JSON-RPC response');
    });

    it('surfaces request transport errors', async () => {
        const backend = createBackend({ url: 'http://127.0.0.1:3100' });
        mockHttpRequest((request, _options, _callback) => {
            process.nextTick(() => request.emit('error', new Error('socket hang up')));
        });

        const client = createClient({ url: 'http://127.0.0.1:3100' });

        await expect(lastValueFrom(backend(client.makeRequest('/broken', {
            method: 'GET'
        } as any), {}))).rejects.toThrow('socket hang up');
    });
});
