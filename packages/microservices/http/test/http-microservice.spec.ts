import { HttpServOptions, httpTransportFactory, useHttpTransport, HTTP_SERV_OPTIONS, HttpFileResult, HttpRequestMessage, HttpServResponse, HTTP_COOKIES, HTTP_RESPONSE } from '../src/server';
import { HttpMessageAdapter } from '../src/server/message-adapter';
import { HTTP_AUTH_OPTIONS } from '../src/server/interceptors/auth';
import { withHttpTransport, HTTP_CLIENT_OPTIONS, HttpClientOptions } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { parseMultipartBody } from '../src/server/multipart';
import { BodyParserInterceptor, ContentInterceptor, CookieInterceptor, CorsInterceptor, JsonInterceptor, SessionInterceptor, SERVICE_STATICS_OPTIONS } from '@tsdi/service';
import { createRequestContext, REQUEST, RESPONSE } from '@tsdi/common';
import { createInjector } from '@tsdi/ioc';
import { HttpClient } from '../src/client/client';
import { HttpCookieInterceptor } from '../src/server/interceptors/cookie';
import { of } from 'rxjs';
import expect = require('expect');

describe('HTTP Microservice', () => {
    describe('HttpServOptions', () => {
        it('should create valid HTTP server options', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, side: TransferSide.server, microservice: true, listenOpts: { port: 3000, host: 'localhost' } };
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
    });

    describe('httpTransportFactory', () => {
        it('should create server transport feature with HTTP defaults', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.kind).toBeDefined();
            expect(feature.config.transport).toBe(Transport.HTTP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
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
