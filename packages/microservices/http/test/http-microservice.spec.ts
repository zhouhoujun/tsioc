import { HttpServer, HttpServOptions, httpTransportFactory, useHttpTransport, HTTP_SERV_OPTIONS, HttpFileResult, HttpRequestMessage, HttpServResponse } from '../src/server';
import { HttpMessageReaderFactory } from '../src/server/message-reader';
import { StaticFileInterceptor } from '../src/server/static-file.interceptor';
import { withHttpTransport, HTTP_CLIENT_OPTIONS, HttpClientOptions } from '../src/client';
import { IncomingMessageReaderFactory, Transport, TransferSide } from '@tsdi/common';
import { parseMultipartBody } from '../src/server/multipart';
import { BodyParserInterceptor, ContentInterceptor, Controller, CookieInterceptor, CorsInterceptor, JsonInterceptor, Post, RequestBody, SessionInterceptor } from '@tsdi/service';
import { createRequestContext, REQUEST, RESPONSE } from '@tsdi/common';
import { createInjector, getClassRef } from '@tsdi/ioc';
import { HttpClient } from '../src/client/client';
import { HttpCookieInterceptor } from '../src/server/interceptors/cookie';
import * as http from 'node:http';
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

        it('should accept http2 options', () => {
            const options: Partial<HttpServOptions> = { transport: Transport.HTTP, majorVersion: 2, timeout: 5000 };
            expect(options.majorVersion).toBe(2);
            expect(options.timeout).toBe(5000);
        });

        it('should accept static and upload options', () => {
            const options: Partial<HttpServOptions> = {
                transport: Transport.HTTP,
                static: { root: 'public', prefix: '/assets' },
                upload: { limit: '5mb' }
            };
            expect((options.static as any).prefix).toBe('/assets');
            expect((options.upload as any).limit).toBe('5mb');
        });
    });

    describe('httpTransportFactory', () => {
        it('should create a valid HTTP transport feature', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.config.transport).toBe(Transport.HTTP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include HTTP_SERV_OPTIONS provider', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.providers.some((p: any) => p.provide === HTTP_SERV_OPTIONS)).toBe(false);
            expect(((feature.config as any).providers || []).some((p: any) => p.provide === HTTP_SERV_OPTIONS)).toBe(true);
        });

        it('should not use message packet transfer by default', () => {
            expect(httpTransportFactory({ listenOpts: { port: 3000 } }).config.features?.defaultTransfer).toBeUndefined();
        });

        it('should enable bodyparser by default', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.config.features?.bodyparser).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === BodyParserInterceptor && p.useFactory)).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === feature.config.features?.interceptorsToken && p.useExisting === BodyParserInterceptor && p.multiOrder === -1000)).toBe(true);
        });

        it('should not register bodyparser interceptor when disabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, features: { bodyparser: false } as any });
            expect(feature.providers.some((p: any) => p.provide === feature.config.features?.interceptorsToken && p.useExisting === BodyParserInterceptor)).toBe(false);
        });

        it('should keep static configuration on transport config', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, static: true });
            expect((feature.config as HttpServOptions).static).toBe(true);
        });

        it('should bind abstract feature interceptors to HTTP defaults', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.providers.some((p: any) => p.provide === ContentInterceptor && p.useClass?.name === 'HttpContentInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === JsonInterceptor && p.useClass?.name === 'HttpJsonInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === BodyParserInterceptor && p.useFactory)).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === SessionInterceptor && p.useClass?.name === 'HttpSessionInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === CookieInterceptor && p.useClass?.name === 'HttpCookieInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === CorsInterceptor && p.useClass?.name === 'Cors')).toBe(true);
        });

        it('should register static file interceptor when static config is enabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, static: true });
            const staticProvider = feature.providers.find((p: any) => p.useFactory && p.multiOrder === -50) as any;
            expect(staticProvider).toBeDefined();
            expect(staticProvider.provide).toBe(feature.config.features?.interceptorsToken);
            expect(staticProvider.useFactory()).toBeInstanceOf(StaticFileInterceptor);
        });

        it('should not register static file interceptor when static config is disabled', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.providers.some((p: any) => p.multiOrder === -50)).toBe(false);
        });

        it('should preserve http2 server configuration', () => {
            const feature = httpTransportFactory({ majorVersion: 2, serverOpts: { allowHTTP1: true } as any });
            const config = feature.config as HttpServOptions;
            expect(config.majorVersion).toBe(2);
            expect((config.serverOpts as any).allowHTTP1).toBe(true);
        });

        it('should use top-level custom message reader factory', () => {
            class CustomHttpReaderFactory extends IncomingMessageReaderFactory { }
            const feature = httpTransportFactory({ listenOpts: { port: 3000 }, messageReaderFactory: CustomHttpReaderFactory });
            expect(feature.config.features?.messageReaderFactory).toBe(CustomHttpReaderFactory);
            expect(feature.config.features?.messagerReaderFactory).toBe(CustomHttpReaderFactory);
        });

        it('should prefer top-level message reader factory over nested legacy feature option', () => {
            class TopLevelReaderFactory extends IncomingMessageReaderFactory { }
            class LegacyReaderFactory extends IncomingMessageReaderFactory { }
            const feature = httpTransportFactory({
                listenOpts: { port: 3000 },
                messageReaderFactory: TopLevelReaderFactory,
                features: { messagerReaderFactory: LegacyReaderFactory } as any,
            });
            expect(feature.config.features?.messageReaderFactory).toBe(TopLevelReaderFactory);
            expect(feature.config.features?.messagerReaderFactory).toBe(TopLevelReaderFactory);
        });

        it('should keep default HTTP message reader factory when no override is provided', () => {
            const feature = httpTransportFactory({ listenOpts: { port: 3000 } });
            expect(feature.config.features?.messageReaderFactory).toBe(HttpMessageReaderFactory);
            expect(feature.config.features?.messagerReaderFactory).toBe(HttpMessageReaderFactory);
        });
    });

    describe('useHttpTransport', () => {
        it('should create multiple transport features', () => {
            expect(useHttpTransport({ listenOpts: { port: 3000 } }, { listenOpts: { port: 3001 } }).length).toBe(2);
        });
    });

    describe('withHttpTransport', () => {
        it('should not use message packet transfer by default', () => {
            expect(withHttpTransport({ url: 'http://localhost:3000' })[0].config.features?.defaultTransfer).toBeUndefined();
        });

        it('should accept http2 client configuration', () => {
            const feature = withHttpTransport({ authority: 'http://localhost:3000', requestOptions: {} as any })[0];
            const config = feature.config as HttpClientOptions;
            expect(config.authority).toBe('http://localhost:3000');
            expect(config.requestOptions).toBeDefined();
        });

        it('should resolve default HttpClient instance from providers', () => {
            const feature = withHttpTransport({ url: 'http://localhost:3000', asDefault: true })[0];
            const injector = createInjector([
                ...(feature.config.providers ?? []),
                ...feature.providers
            ]);
            expect(injector.get(HttpClient)).toBeInstanceOf(HttpClient);
        });

        it('should use top-level custom message reader factory', () => {
            class CustomHttpClientReaderFactory extends IncomingMessageReaderFactory { }
            const feature = withHttpTransport({ url: 'http://localhost:3000', messageReaderFactory: CustomHttpClientReaderFactory })[0];
            expect(feature.config.features?.messageReaderFactory).toBe(CustomHttpClientReaderFactory);
            expect(feature.config.features?.messagerReaderFactory).toBe(CustomHttpClientReaderFactory);
        });

        it('should still support legacy nested message reader factory option', () => {
            class LegacyHttpClientReaderFactory extends IncomingMessageReaderFactory { }
            const feature = withHttpTransport({
                url: 'http://localhost:3000',
                features: { messagerReaderFactory: LegacyHttpClientReaderFactory } as any
            })[0];
            expect(feature.config.features?.messageReaderFactory).toBe(LegacyHttpClientReaderFactory);
            expect(feature.config.features?.messagerReaderFactory).toBe(LegacyHttpClientReaderFactory);
        });
    });

    describe('tokens', () => {
        it('HTTP_SERV_OPTIONS should be defined', () => expect(HTTP_SERV_OPTIONS.toString()).toContain('HTTP_SERV_OPTIONS'));
        it('HTTP_CLIENT_OPTIONS should be defined', () => expect(HTTP_CLIENT_OPTIONS.toString()).toContain('HTTP_CLIENT_OPTIONS'));
    });

    describe('HttpServer', () => {
        it('should exist as a class', () => expect(typeof HttpServer).toBe('function'));
    });

    describe('multipart parser', () => {
        it('should parse multipart fields and files', () => {
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
                    return request.getHeader(name) != null;
                },
                rawRequest: null,
                getHeaderNames() {
                    return Object.keys(requestHeaders);
                }
            } as unknown as HttpRequestMessage;
            const headers: Record<string, string | readonly string[]> = {
                'set-cookie': ['existing=1']
            };
            const response = {
                headersSent: false,
                getHeader(name: string) {
                    return headers[name.toLowerCase()];
                },
                setHeader(name: string, value: string | readonly string[]) {
                    headers[name.toLowerCase()] = Array.isArray(value) ? [...value] : value;
                }
            } as Pick<http.ServerResponse, 'headersSent' | 'getHeader' | 'setHeader'> as HttpServResponse;
            const context = createRequestContext(injector, [
                [REQUEST, request],
                [RESPONSE, response],
                ['request', request],
                ['response', response]
            ]);
            const next: any = {
                handle(value: HttpRequestMessage) {
                    return {
                        subscribe() {
                            return value;
                        }
                    } as any;
                }
            };

            interceptor.intercept(request, next, context);
            const cookies = context.get('cookies') as { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, unknown>): void };
            cookies.set('token', 'a b', { httpOnly: true, sameSite: 'Lax' });

            expect(cookies.get('sid')).toBe('abc');
            expect(Array.isArray(headers['set-cookie'])).toBe(true);
            expect(headers['set-cookie']).toEqual([
                'existing=1',
                'token=a%20b; Path=/; HttpOnly; SameSite=Lax'
            ]);
            expect((request as any).cookies).toBe(cookies);
        });
    });

    describe('RequestBody metadata', () => {
        @Controller('/inspect')
        class InspectController {
            @Post('/upload')
            upload(@RequestBody() body: any) {
                return body;
            }
        }

        it('should attach scope and resolvers for whole-body params', () => {
            const typeRef = getClassRef(InspectController);
            const params = typeRef.getParameters('upload') as any[] | undefined;
            expect(params?.length).toBe(1);
            expect(params?.[0]?.scope).toBe('body');
        });
    });

    describe('HTTP/2', () => {
        it('httpTransportFactory should accept majorVersion: 2', () => {
            const feature = httpTransportFactory({ majorVersion: 2, listenOpts: { port: 3000 } });
            expect((feature.config as HttpServOptions).majorVersion).toBe(2);
        });

        it('httpTransportFactory should create h2 server with secure opts', () => {
            const feature = httpTransportFactory({
                majorVersion: 2,
                serverOpts: { key: 'test-key', cert: 'test-cert' } as any,
                listenOpts: { port: 3000 }
            });
            expect((feature.config as HttpServOptions).majorVersion).toBe(2);
            expect(((feature.config as HttpServOptions).serverOpts as any).key).toBe('test-key');
        });

        it('withHttpTransport should accept http2 authority', () => {
            const features = withHttpTransport({ authority: 'http://localhost:3000', asDefault: true });
            expect((features[0].config as HttpClientOptions).authority).toBe('http://localhost:3000');
        });

        it('withHttpTransport should accept http2 requestOptions', () => {
            const features = withHttpTransport({
                authority: 'http://localhost:3000',
                requestOptions: { endStream: true }
            });
            expect((features[0].config as HttpClientOptions).requestOptions?.endStream).toBe(true);
        });

        it('httpTransportFactory should have bodyparser enabled for h2', () => {
            const feature = httpTransportFactory({ majorVersion: 2, listenOpts: { port: 3000 } });
            expect(feature.config.features?.bodyparser).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === BodyParserInterceptor && p.useFactory)).toBe(true);
        });

        it('withHttpTransport should handle authority without asDefault', () => {
            const features = withHttpTransport({ authority: 'http://localhost:4000' });
            expect(features.length).toBe(1);
            expect((features[0].config as HttpClientOptions).authority).toBe('http://localhost:4000');
        });
    });
});
