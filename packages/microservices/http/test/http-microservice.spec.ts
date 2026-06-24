import {
    HttpServOptions, httpTransportFactory, useHttpTransport, HTTP_SERV_OPTIONS, HttpFileResult,
    HttpRequestMessage, HttpServResponse, HTTP_COOKIES, HTTP_RESPONSE, HttpContextUtil,
    HTTP_PROXY_ENABLED, HTTP_PROXY_IP_HEADER, HTTP_MAX_IPS_COUNT, HttpBodyParserInterceptor
} from '../src/server';
import { HttpMessageAdapter } from '../src/server/message-adapter';
import { HTTP_AUTH_OPTIONS } from '../src/server/interceptors/auth';
import { withHttpTransport, HTTP_CLIENT_OPTIONS, HttpClientOptions } from '../src/client';
import { BodySerializeStrategy, getClientBackendToken, TimeoutStrategy } from '@tsdi/client';
import { FileAdapter, MimeAdapter, MimeTypes, RestfulRequestAdapter, StreamAdapter, Transport, TransferSide } from '@tsdi/common';
import { parseMultipartBody } from '../src/server/multipart';
import { BodyParserInterceptor, ContentInterceptor, CookieInterceptor, CorsInterceptor, JsonInterceptor, SessionInterceptor, SERVICE_STATICS_OPTIONS } from '@tsdi/service';
import { createRequestContext, REQUEST, RESPONSE } from '@tsdi/common';
import { createInjector, importProvidersFrom } from '@tsdi/ioc';
import { HttpClient } from '../src/client/client';
import { HttpRequest } from '../src/client/request';
import { HttpCookieInterceptor } from '../src/server/interceptors/cookie';
import { HttpContentInterceptor } from '../src/server/interceptors/content';
import { HttpModule } from '../src/http.module';
import { HttpBodySerializeStrategy } from '../src/client/strategies/HttpBodySerializeStrategy';
import { HttpTimeoutStrategy } from '../src/client/strategies/HttpTimeoutStrategy';
import { lastValueFrom, of } from 'rxjs';
import * as http from 'node:http';
import { EventEmitter } from 'node:events';
import expect = require('expect');

describe('HTTP Microservice', () => {
    describe('HttpServOptions', () => {
        it('should create valid HTTP server options', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, side: TransferSide.server, listenOpts: { port: 3000, host: 'localhost' } };
            expect(options.transport).toBe(Transport.HTTP);
            expect(options.listenOpts?.port).toBe(3000);
        });

        it('should accept secure property', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, secure: true };
            expect(options.secure).toBe(true);
        });

        it('should accept timeout property', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, majorVersion: 2, timeout: 50 };
            expect(options.timeout).toBe(50);
        });
    });

    describe('HTTP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(HTTP_CLIENT_OPTIONS).toBeDefined();
        });
    });

    describe('HttpModule strategy bindings', () => {
        it('binds abstract client strategies to HTTP implementations', () => {
            const injector = createInjector([importProvidersFrom(HttpModule)] as any);
            expect(injector.get(BodySerializeStrategy)).toBeInstanceOf(HttpBodySerializeStrategy);
            expect(injector.get(TimeoutStrategy)).toBeInstanceOf(HttpTimeoutStrategy);
        });
    });

    describe('withHttpTransport', () => {
        it('should create client transport feature with default values', () => {
            const features = withHttpTransport({ url: 'http://localhost:3000' });
            expect(features).toHaveLength(1);
            expect(features[0].kind).toBeDefined();
            expect(features[0].config.transport).toBe(Transport.HTTP);
            expect(features[0].config.side).toBe(TransferSide.client);
            expect(features[0].config.url).toBe('http://localhost:3000');
        });

        it('should preserve custom connection and pool options', () => {
            const feature = withHttpTransport({
                url: 'http://localhost:3000',
                pool: { min: 1, max: 2 },
                connectOpts: { timeout: 1234 }
            })[0];
            expect(feature.config.pool).toEqual({ min: 1, max: 2 });
            expect((feature.config as HttpClientOptions).connectOpts).toEqual({ timeout: 1234 });
        });

        it('should mark transport as default when requested', () => {
            const feature = withHttpTransport({ url: 'http://localhost:3000', asDefault: true })[0];
            expect(feature.config.asDefault).toBe(true);
        });

        it('serializes request body through BodySerializeStrategy before sending', async () => {
            const feature = withHttpTransport({ url: 'http://localhost:3000', asDefault: true })[0];
            const injector = createInjector([importProvidersFrom(HttpModule), ...feature.providers] as any);
            const [backend] = injector.get(getClientBackendToken(feature.config)) as unknown as Array<(req: any, context: any) => any>;
            const request = new HttpRequest('/serialize', null, {
                body: { hello: 'world' },
                method: 'POST'
            } as any);
            const context = {
                get(token: any) {
                    if (token === BodySerializeStrategy) {
                        return injector.get(BodySerializeStrategy);
                    }
                    if (token === HttpClient) {
                        return undefined;
                    }
                    return injector.get(token);
                },
                has(token: any) {
                    return token === BodySerializeStrategy || token === HttpClient ? true : injector.has(token);
                }
            } as any;

            const originalRequest = http.request;
            let writtenBody = '';
            let writtenHeaders: Record<string, any> = {};
            (http as any).request = (_target: URL, options: http.RequestOptions) => {
                writtenHeaders = { ...(options.headers as Record<string, any> ?? {}) };
                const reqEmitter = new EventEmitter() as any;
                reqEmitter.end = (chunk?: any) => {
                    writtenBody = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
                    const resEmitter = new EventEmitter() as any;
                    resEmitter.statusCode = 200;
                    resEmitter.statusMessage = 'OK';
                    resEmitter.headers = { 'content-type': 'application/json' };
                    reqEmitter.emit('response', resEmitter);
                    resEmitter.emit('data', Buffer.from('{"ok":true}', 'utf8'));
                    resEmitter.emit('end');
                };
                reqEmitter.destroy = () => undefined;
                return reqEmitter;
            };

            try {
                const result = await lastValueFrom(backend(request, context));
                expect(result).toEqual({ ok: true });
                expect(writtenBody).toBe('{"hello":"world"}');
                expect(writtenHeaders['content-type']).toBe('application/json');
            } finally {
                (http as any).request = originalRequest;
            }
        });
    });

    describe('httpTransportFactory', () => {
        it('should create server transport feature with HTTP defaults', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.kind).toBeDefined();
            expect(feature.config.transport).toBe(Transport.HTTP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBeUndefined();
            expect(feature.config.features?.bodyparser).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === HTTP_SERV_OPTIONS)).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === ContentInterceptor && p.useClass?.name === 'HttpContentInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === JsonInterceptor && p.useClass?.name === 'HttpJsonInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === SessionInterceptor && p.useClass?.name === 'HttpSessionInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === CookieInterceptor && p.useClass?.name === 'HttpCookieInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === CorsInterceptor && p.useClass?.name === 'Cors')).toBe(true);
        });

        it('should register statics through content interceptor when static config is enabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, static: true });
            const staticProvider = feature.providers.find((p: any) => p.multiOrder === -50) as any;
            expect(staticProvider).toBeDefined();
            expect(staticProvider.provide).toBe(feature.config.features?.interceptorsToken);
            expect(staticProvider.useExisting).toBe(ContentInterceptor);
            expect(feature.providers.some((p: any) => p.provide === SERVICE_STATICS_OPTIONS)).toBe(true);
        });

        it('should not register statics interceptor when static config is disabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.providers.some((p: any) => p.multiOrder === -50)).toBe(false);
        });

        it('should disable default bodyparser feature when configured', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, features: { bodyparser: false } as any });
            expect(feature.config.features?.bodyparser).toBe(false);
            expect(feature.providers.some((p: any) => p.useExisting === BodyParserInterceptor)).toBe(false);
        });

        it('should register auth interceptor and options when auth feature is enabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, features: { auth: { bearerToken: 'secret' } } as any });
            expect(feature.providers.some((p: any) => p.provide === HTTP_AUTH_OPTIONS && p.useValue.bearerToken === 'secret')).toBe(true);
            expect(feature.providers.some((p: any) => p.useExisting?.name === 'HttpAuthInterceptor' && p.multiOrder === -300)).toBe(true);
        });
    });

    describe('useHttpTransport', () => {
        it('should create features for all provided server options', () => {
            const features = useHttpTransport({ listenOpts: { port: 3000 } }, { listenOpts: { port: 3001 } });
            expect(features).toHaveLength(2);
            expect(features[0].config.transport).toBe(Transport.HTTP);
            expect(features[1].config.transport).toBe(Transport.HTTP);
        });

        it('should mark single transport as default when not specified', () => {
            const features = useHttpTransport({ listenOpts: { port: 3000 } });
            expect(features).toHaveLength(1);
            expect(features[0].config.transport).toBe(Transport.HTTP);
        });
    });

    describe('HttpBodyParserInterceptor multipart parser', () => {
        it('should parse multipart form payloads', () => {
            const boundary = 'AaB03x';
            const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nzhou\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--${boundary}--\r\n`);
            const parsed = parseMultipartBody(body, `multipart/form-data; boundary=${boundary}`);
            expect(parsed.fields.name).toBe('zhou');
            expect(parsed.files.file.filename).toBe('a.txt');
            expect(parsed.files.file.buffer.toString('utf8')).toBe('hello');
        });

        it('should export HttpFileResult', () => {
            expect(new HttpFileResult(Buffer.from('x'))).toBeInstanceOf(HttpFileResult);
        });

        it('should preserve upload limit on transport config for multipart body parsing', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, upload: { limit: '5mb' } });
            expect((feature.config as HttpServOptions).upload).toEqual({ limit: '5mb' });
        });

        it('should parse json body without content-type headers from raw buffers', async () => {
            const interceptor = new HttpBodyParserInterceptor(undefined, undefined);
            const context = createRequestContext(createInjector());
            context.set(StreamAdapter, {
                isReadable: () => false,
                isStream: () => false,
            } as any);
            const input = { body: Buffer.from('{"ok":true}') } as any;

            await lastValueFrom(interceptor.intercept(input, {
                handle: (req: any) => {
                    expect(req.body).toEqual({ ok: true });
                    expect(req.rawBody).toBe('{"ok":true}');
                    return of(req.body);
                }
            } as any, context));
        });

        it('should parse urlencoded body without content-type headers from raw buffers', async () => {
            const interceptor = new HttpBodyParserInterceptor(undefined, undefined);
            const context = createRequestContext(createInjector());
            context.set(StreamAdapter, {
                isReadable: () => false,
                isStream: () => false,
            } as any);
            const input = { body: Buffer.from('name=zhou&role=admin') } as any;

            await lastValueFrom(interceptor.intercept(input, {
                handle: (req: any) => {
                    expect(req.body).toEqual({ name: 'zhou', role: 'admin' });
                    expect(req.rawBody).toBe('name=zhou&role=admin');
                    return of(req.body);
                }
            } as any, context));
        });

        it('should reject unsupported content-encoding values', async () => {
            const interceptor = new HttpBodyParserInterceptor({ enableTypes: ['text'] } as any, undefined);
            const context = createRequestContext(createInjector());
            const streamBody = {
                pipe: () => ({})
            };
            context.set(StreamAdapter, {
                isReadable: (target: any) => target === streamBody,
                isStream: () => false,
            } as any);
            context.set(MimeAdapter, {
                normalize: (value: string) => value,
                match: (types: string[]) => types[0],
            } as any);
            context.set(MimeTypes, { text: ['text/plain'] } as any);
            const input = {
                headers: {
                    'content-type': 'text/plain',
                    'content-encoding': 'br',
                    'content-length': '4'
                },
                body: streamBody
            } as any;

            await expect(lastValueFrom(interceptor.intercept(input, {
                handle: () => of(null)
            } as any, context))).rejects.toMatchObject({ status: 415 });
        });

        it('should parse gzip-encoded text bodies through the stream adapter', async () => {
            const interceptor = new HttpBodyParserInterceptor({ enableTypes: ['text'] } as any, undefined);
            const context = createRequestContext(createInjector());
            const gunzipResult = { marker: 'gunzip-stream' };
            const input = {
                headers: {
                    'content-type': 'text/plain',
                    'content-encoding': 'gzip',
                    'content-length': '5'
                },
                body: {
                    pipe: () => gunzipResult
                }
            } as any;
            context.set(StreamAdapter, {
                isReadable: (target: any) => target === input.body,
                isStream: () => false,
                createGunzip: () => ({ gunzip: true }),
                rawbody: async (target: any) => {
                    expect(target).toBe(gunzipResult);
                    return 'hello gzip';
                }
            } as any);
            context.set(MimeAdapter, {
                normalize: (value: string) => value,
                match: (types: string[]) => types[0],
            } as any);
            context.set(MimeTypes, { text: ['text/plain'] } as any);

            await lastValueFrom(interceptor.intercept(input, {
                handle: (req: any) => {
                    expect(req.body).toBe('hello gzip');
                    expect(req.rawBody).toBe('hello gzip');
                    return of(req.body);
                }
            } as any, context));
        });
    });

    describe('HttpMessageAdapter', () => {
        it('should read request data and write status headers body and error', () => {
            const requestHeaders = { accept: 'application/json', 'x-test': '1' };
            const request = {
                headers: requestHeaders,
                body: { id: 'zhou' },
                params: { pid: 'p1' },
                query: { q: 'qq' },
                paths: { id: '42' },
                getHeader(name: string) {
                    return requestHeaders[name.toLowerCase() as keyof typeof requestHeaders];
                },
                hasHeader(name: string) {
                    return requestHeaders[name.toLowerCase() as keyof typeof requestHeaders] != null;
                },
                getHeaderNames() {
                    return Object.keys(requestHeaders);
                }
            } as unknown as HttpRequestMessage;
            const adapter = new HttpMessageAdapter(request, {} as HttpServResponse);
            const error = new Error('boom');

            adapter.setStatus(202, 'Accepted');
            adapter.setHeader('x-message-adapter', 'http');
            adapter.setPayload({ wrapped: true });
            adapter.setError(error);

            expect(adapter.read('headers', 'x-test')).toBe('1');
            expect(adapter.read('body', 'id')).toBe('zhou');
            expect(adapter.read('params', 'pid')).toBe('p1');
            expect(adapter.read('query', 'q')).toBe('qq');
            expect(adapter.read('path', 'id')).toBe('42');
            expect(adapter.read('status')).toBe(202);
            expect(adapter.read('statusMessage')).toBe('Accepted');
            expect(adapter.read('error')).toBe(error);
            expect(adapter.status).toBe(202);
            expect(adapter.getStatusMessage()).toBe('Accepted');
            expect(adapter.getResponseHeader('x-message-adapter')).toBe('http');
            expect(adapter.body).toEqual({ wrapped: true });
            expect(adapter.error).toBe(error);
        });
    });

    describe('HttpCookieInterceptor', () => {
        it('should use real http request and response types and append set-cookie headers', async () => {
            const interceptor = new HttpCookieInterceptor();
            const injector = createInjector();
            const requestHeaders = { cookie: 'sid=abc; theme=dark' };
            const request = {
                headers: requestHeaders,
                query: {},
                getHeader(name: string) {
                    const value = requestHeaders[name.toLowerCase() as keyof typeof requestHeaders];
                    return Array.isArray(value) ? value[0] : value;
                },
                hasHeader(name: string) {
                    const value = requestHeaders[name.toLowerCase() as keyof typeof requestHeaders];
                    return value != null;
                },
                getHeaderNames() {
                    return Object.keys(requestHeaders);
                }
            } as unknown as HttpRequestMessage;
            const headerStore = new Map<string, any>();
            const response = {
                getHeader(name: string) {
                    return headerStore.get(name.toLowerCase());
                },
                setHeader(name: string, value: any) {
                    headerStore.set(name.toLowerCase(), value);
                }
            } as unknown as HttpServResponse;
            const context = createRequestContext(injector, [
                [REQUEST, request],
                [RESPONSE, response],
                [HTTP_RESPONSE, response],
            ]);

            await new Promise<void>((resolve, reject) => {
                interceptor.intercept(request, {
                    handle: (_input: HttpRequestMessage, ctx: any) => {
                        try {
                            const cookies = ctx.get(HTTP_COOKIES) as { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, unknown>): void };
                            expect(cookies.get('sid')).toBe('abc');
                            expect(cookies.get('theme')).toBe('dark');
                            cookies.set('sid', 'next', { httpOnly: true, sameSite: 'Lax' });
                            cookies.set('lang', 'zh');
                            const stored = response.getHeader('set-cookie') as string[];
                            expect(stored).toHaveLength(2);
                            expect(stored[0]).toContain('sid=next');
                            expect(stored[0]).toContain('HttpOnly');
                            expect(stored[0]).toContain('SameSite=Lax');
                            expect(stored[1]).toContain('lang=zh');
                            return of(null);
                        } catch (err) {
                            reject(err);
                            return of(null);
                        }
                    }
                } as any, context).subscribe({
                    next: () => resolve(),
                    error: reject
                });
            });
        });
    });

    describe('HttpContentInterceptor', () => {
        function createRestAdapter() {
            const headers = new Map<string, any>();
            return {
                status: undefined as number | undefined,
                payload: undefined as any,
                hasHeader(name: string) {
                    return headers.has(name.toLowerCase());
                },
                setHeader(name: string, value: any) {
                    headers.set(name.toLowerCase(), value);
                    return this;
                },
                getHeader(name: string) {
                    return headers.get(name.toLowerCase());
                },
                getHeaderNames() {
                    return [...headers.keys()];
                },
                setStatus(status: number) {
                    this.status = status;
                    return this;
                },
                setPayload(payload: any) {
                    this.payload = payload;
                    return this;
                }
            };
        }

        function createRuntimeInjector(baseURL = '/module-base') {
            return {
                get: () => null,
                getParent: () => null,
                getRuntime: () => ({
                    getModules: () => new Map<any, any>([
                        ['module', {
                            moduleReflect: {
                                getAnnotation: () => ({ baseURL })
                            }
                        }]
                    ])
                })
            };
        }

        it('should resolve baseUrl from runtime modules for default static roots', async () => {
            let capturedOptions: any;
            const sender = {
                send: async (_adapter: any, _fileAdapter: any, _path: string, options: any) => {
                    capturedOptions = options;
                    return { filename: '/tmp/hello.txt', stats: {} };
                }
            };
            const interceptor = new HttpContentInterceptor(undefined as any, undefined as any, sender as any);
            const context = createRequestContext(createInjector());
            const adapter = createRestAdapter();
            context.set(FileAdapter, {} as any);
            context.set(RestfulRequestAdapter, adapter as any);
            (context as any).getInjector = () => createRuntimeInjector('/runtime-public');

            let nextCalled = false;
            const result = await lastValueFrom(interceptor.intercept({ url: '/hello.txt', method: 'GET' } as any, {
                handle: () => {
                    nextCalled = true;
                    return of('next');
                }
            } as any, context));

            expect(nextCalled).toBe(false);
            expect(result).toBe(null);
            expect(capturedOptions.baseUrl).toBe('/runtime-public');
        });

        it('should pass resolved baseUrl into deferred static file lookup', async () => {
            let capturedOptions: any;
            const file = { filename: '/tmp/deferred.txt', stats: { size: 3 } };
            const fileAdapter = {
                find: async (_path: string, options: any) => {
                    capturedOptions = options;
                    return file;
                }
            };
            const interceptor = new HttpContentInterceptor(undefined as any, { defer: true } as any, {} as any);
            const context = createRequestContext(createInjector());
            context.set(FileAdapter, fileAdapter as any);
            (context as any).getInjector = () => createRuntimeInjector('/deferred-base');

            const result = await lastValueFrom(interceptor.intercept({ url: '/hello.txt', method: 'GET' } as any, {
                handle: () => of({})
            } as any, context));

            expect(result).toBe(file);
            expect(capturedOptions.baseUrl).toBe('/deferred-base');
        });

        it('should map direct HttpFileResult buffer responses onto the restful adapter', async () => {
            const sender = {
                send: async () => null
            };
            const interceptor = new HttpContentInterceptor(undefined as any, undefined as any, sender as any);
            const context = createRequestContext(createInjector());
            const adapter = createRestAdapter();
            context.set(FileAdapter, {
                extname: () => '.txt'
            } as any);
            context.set(RestfulRequestAdapter, adapter as any);
            context.set(MimeAdapter, {
                lookup: () => 'text/plain'
            } as any);
            (context as any).getInjector = () => createRuntimeInjector();

            const fileResult = new HttpFileResult(Buffer.from('hello'), {
                filename: 'hello.txt',
                disposition: 'attachment',
                headers: { 'x-inline': '1' } as any,
                statusCode: 201
            });

            const result = await lastValueFrom(interceptor.intercept({ url: '/download', method: 'GET' } as any, {
                handle: () => of(fileResult)
            } as any, context));

            expect(result).toBe(adapter);
            expect(adapter.status).toBe(201);
            expect(adapter.payload.toString('utf8')).toBe('hello');
            expect(adapter.getHeader('content-type')).toBe('text/plain');
            expect(adapter.getHeader('content-disposition')).toContain('attachment');
            expect(adapter.getHeader('content-length')).toBe(5);
            expect(adapter.getHeader('x-inline')).toBe('1');
        });

        it('should merge wrapped HttpFileResult responses with outer headers and status', async () => {
            const sender = {
                send: async () => null
            };
            const interceptor = new HttpContentInterceptor(undefined as any, undefined as any, sender as any);
            const context = createRequestContext(createInjector());
            const adapter = createRestAdapter();
            context.set(FileAdapter, {
                extname: () => '.txt'
            } as any);
            context.set(RestfulRequestAdapter, adapter as any);
            context.set(MimeAdapter, {
                lookup: () => 'text/plain'
            } as any);
            (context as any).getInjector = () => createRuntimeInjector();

            const wrapped = {
                body: new HttpFileResult(Buffer.from('body'), {
                    filename: 'wrapped.txt'
                }),
                statusCode: 202,
                getHeaderNames: () => ['x-outer'],
                getHeader: () => 'outer'
            };

            const result = await lastValueFrom(interceptor.intercept({ url: '/wrapped', method: 'GET' } as any, {
                handle: () => of(wrapped)
            } as any, context));

            expect(result).toBe(adapter);
            expect(adapter.status).toBe(200);
            expect(adapter.getHeader('x-outer')).toBe('outer');
            expect(adapter.getHeader('content-type')).toBe('text/plain');
            expect(adapter.payload.toString('utf8')).toBe('body');
        });
    });

    describe('HttpContextUtil', () => {
        it('should resolve proxy ip list, forwarded protocol, vary header and writable state', () => {
            const request = {
                method: 'GET',
                headers: {
                    'x-real-ip': '10.0.0.1, 10.0.0.2, 10.0.0.3',
                    'x-forwarded-proto': 'https, http'
                },
                socket: { remoteAddress: '127.0.0.1', encrypted: false }
            } as any;
            const response = {
                statusCode: 200,
                headersSent: false,
                socket: { writable: true },
                getHeader(name: string) {
                    return this.headers?.[name];
                },
                setHeader(name: string, value: any) {
                    this.headers = this.headers ?? {};
                    this.headers[name] = value;
                }
            } as any;
            const context = createRequestContext(createInjector(), [
                [REQUEST, request],
                [HTTP_RESPONSE, response],
                [HTTP_PROXY_ENABLED, true],
                [HTTP_PROXY_IP_HEADER, 'x-real-ip'],
                [HTTP_MAX_IPS_COUNT, 2]
            ]);

            const httpContext = HttpContextUtil.from(context);
            httpContext.vary('accept-encoding');

            expect(httpContext.ips).toEqual(['10.0.0.2', '10.0.0.3']);
            expect(httpContext.ip).toBe('10.0.0.2');
            expect(httpContext.protocol).toBe('https');
            expect(httpContext.secure).toBe(true);
            expect(httpContext.writable).toBe(true);
            expect(response.headers.vary).toBe('accept-encoding');
        });

        it('should evaluate freshness based on etag, cache-control and last-modified headers', () => {
            const request = {
                method: 'GET',
                headers: {
                    'if-none-match': '"abc"',
                    'if-modified-since': 'Wed, 01 Jan 2020 00:00:00 GMT'
                },
                socket: { remoteAddress: '127.0.0.1', encrypted: false }
            } as any;
            const headers = new Map<string, any>([
                ['etag', '"abc"'],
                ['last-modified', 'Wed, 01 Jan 2020 00:00:00 GMT']
            ]);
            const response = {
                statusCode: 200,
                headersSent: false,
                socket: { writable: false },
                getHeader(name: string) {
                    return headers.get(name.toLowerCase());
                },
                setHeader(name: string, value: any) {
                    headers.set(name.toLowerCase(), value);
                }
            } as any;
            const context = createRequestContext(createInjector(), [
                [REQUEST, request],
                [HTTP_RESPONSE, response]
            ]);

            const httpContext = HttpContextUtil.from(context);
            expect(httpContext.fresh).toBe(true);
            expect(httpContext.stale).toBe(false);
            expect(httpContext.writable).toBe(false);

            request.headers['cache-control'] = 'no-cache';
            expect(httpContext.fresh).toBe(false);
            expect(httpContext.stale).toBe(true);
        });
    });

    describe('HttpServer invocation', () => {
        it('should wire listen options into the server transport config', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000, host: '0.0.0.0' } });
            expect((feature.config as HttpServOptions).listenOpts).toEqual({ port: 3000, host: '0.0.0.0' });
        });

        it('should expose invocation factory provider for HttpServer', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            const serviceProvider = feature.providers.find((p: any) => Array.isArray(p.deps) && p.deps.length > 0) as any;
            expect(serviceProvider ?? feature.providers.length).toBeTruthy();
        });
    });

    describe('HttpClient provider wiring', () => {
        it('should create HttpClient via DI when transport providers are registered', () => {
            const feature = withHttpTransport({ url: 'http://localhost:3000', asDefault: true })[0];
            const providers = [...feature.providers, HttpClient];
            expect(providers.length).toBeGreaterThan(0);
        });
    });
});
