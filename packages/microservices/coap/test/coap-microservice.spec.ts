import { CoapServer, CoapServOptions, coapTransportFactory, useCoapTransport, COAP_SERV_OPTIONS } from '../src/server';
import { withCoapTransport, COAP_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { BodyParserInterceptor, ContentInterceptor, JsonInterceptor, Controller, Get, Post, RequestBody, RequestHeader, RequestParam, RequestPath, provideService, useBodyParser, useRouter } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { CoapClient } from '../src/client/client';
import { catchError, lastValueFrom, of } from 'rxjs';
import * as coap from 'coap';
import expect = require('expect');

interface CoapJsonResponse<T> {
    body?: T;
    payload?: T;
    ok?: boolean;
    status?: string | number;
    statusCode?: string | number;
}

type CoapMethod = 'GET' | 'POST';

@Controller('/api/e2e')
class CoapE2eController {
    @Get('/ping')
    ping() {
        return { result: 'pong' };
    }

    @Post('/echo')
    echo(@RequestBody() body: any) {
        return { received: body };
    }
}

@Controller('/api/matrix')
class CoapMatrixController {
    @Get('/query')
    query(
        @RequestParam('page', { nullable: true }) page: number = 1,
        @RequestParam('sort', { nullable: true }) sort: string = 'name',
        @RequestHeader('accept', { nullable: true }) accept?: string,
    ) {
        return { page, sort, accept: accept ?? null };
    }

    @Get('/path/:id')
    path(@RequestPath('id') id: string) {
        return { id };
    }

    @Post('/body')
    body(@RequestBody() body: any) {
        return { received: body };
    }

    @Get('/falsy')
    falsy(@RequestParam('zero') zero: number = 0) {
        return { zero, ok: false, empty: '' };
    }
}

describe('CoAP Microservice', () => {

    describe('CoapServOptions', () => {
        it('should create valid CoAP server options', () => {
            const options: Partial<CoapServOptions> = {
                transport: Transport.CoAP,
                side: TransferSide.server,
                microservice: true,
                listenOpts: { port: 5683, host: 'localhost' }
            };

            expect(options.transport).toBe(Transport.CoAP);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.listenOpts?.port).toBe(5683);
        });

        it('should accept asDefault property', () => {
            const options: Partial<CoapServOptions> = {
                transport: Transport.CoAP,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });
    });

    describe('coapTransportFactory', () => {
        it('should create a valid CoAP transport feature', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683, host: 'localhost' }
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.CoAP);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include COAP_SERV_OPTIONS provider', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });
            const configProviders = (feature.config as any).providers || [];

            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === COAP_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === COAP_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use coap message transfer by default on server transport', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 },
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });

        it('should bind abstract feature interceptors and message reader defaults', () => {
            const feature = coapTransportFactory({
                listenOpts: { port: 5683 }
            });

            expect(feature.providers.some((p: any) => p.provide === ContentInterceptor && p.useClass?.name === 'CoapContentInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === JsonInterceptor && p.useClass?.name === 'CoapJsonInterceptor')).toBe(true);
            expect(feature.providers.some((p: any) => p.provide === BodyParserInterceptor && p.useClass?.name === 'CoapBodyParserInterceptor')).toBe(true);
        });
    });

    describe('useCoapTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = useCoapTransport(
                { listenOpts: { port: 5683 } },
                { listenOpts: { port: 5684 } }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withCoapTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withCoapTransport({
                port: 5683
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withCoapTransport({
                microservice: false,
                port: 5683
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('COAP_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(COAP_SERV_OPTIONS).toBeDefined();
            expect(COAP_SERV_OPTIONS.toString()).toContain('COAP_SERV_OPTIONS');
        });
    });

    describe('COAP_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(COAP_CLIENT_OPTIONS).toBeDefined();
            expect(COAP_CLIENT_OPTIONS.toString()).toContain('COAP_CLIENT_OPTIONS');
        });
    });

    describe('CoapServer', () => {
        it('should exist as a class', () => {
            expect(CoapServer).toBeDefined();
            expect(typeof CoapServer).toBe('function');
        });
    });

    describe('CoAP Server listen', () => {
        it('should create a server instance', () => {
            const server = CoapServer.prototype;
            expect(server).toBeDefined();
        });
    });

    describe('CoAP default E2E coverage', () => {
        const E2E_PORT = 21310;

        @Module({
            imports: [LoggerModule],
            declarations: [CoapE2eController, CoapMatrixController],
            providers: [
                provideService(
                    useRouter(),
                    useBodyParser(),
                    useCoapTransport({ microservice: false, listenOpts: { port: E2E_PORT, host: '127.0.0.1' }, asDefault: true })
                ),
                provideClient(
                    withCoapTransport({ port: E2E_PORT, host: '127.0.0.1', microservice: false, asDefault: true })
                )
            ]
        })
        class CoapDefaultE2eModule { }

        let ctx: ApplicationContext;
        let client: CoapClient;

        before(async () => {
            ctx = await Application.run(CoapDefaultE2eModule);
            client = ctx.get(CoapClient);
        });

        after(async () => {
            if (ctx) {
                await ctx.destroy();
            }
        });

        function sendCoapRequest(method: CoapMethod, pathname: string, payload?: any): Promise<any> {
            return new Promise((resolve, reject) => {
                const req = coap.request({
                    host: '127.0.0.1',
                    port: E2E_PORT,
                    pathname,
                    method,
                    options: { Accept: 'application/json' }
                });
                if (payload != null) {
                    req.write(JSON.stringify(payload));
                }
                req.on('response', (res: coap.IncomingMessage) => {
                    const body = res.payload?.toString() || '';
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        resolve(body);
                    }
                });
                req.on('error', (err: Error) => reject(err));
                req.end();
            });
        }

        it('serves GET requests over CoAP', async () => {
            const res = await sendCoapRequest('GET', '/api/e2e/ping');
            expect(res).toEqual({ result: 'pong' });
        });

        it('serves POST requests over CoAP', async () => {
            const res = await sendCoapRequest('POST', '/api/e2e/echo', { value: 'hello' });
            expect(res).toEqual({ received: { value: 'hello' } });
        });

        it('preserves request method when using CoapClient.send', async () => {
            const result = await lastValueFrom(client.send('/api/e2e/echo', {
                method: 'POST',
                payload: { value: 'hello' }
            }));
            expect(result).toEqual({ received: { value: 'hello' } });
        });

        it('resolves query, path, body and falsy values end to end', async () => {
            expect(await sendCoapRequest('GET', '/api/matrix/query?page=2')).toEqual({
                page: 2,
                sort: 'name',
                accept: 'application/json'
            });
            expect(await sendCoapRequest('GET', '/api/matrix/path/abc')).toEqual({ id: 'abc' });
            expect(await sendCoapRequest('POST', '/api/matrix/body', { value: 'hello' })).toEqual({
                received: { value: 'hello' }
            });
            expect(await sendCoapRequest('GET', '/api/matrix/falsy?zero=0')).toEqual({
                zero: 0,
                ok: false,
                empty: ''
            });
        });

        it('returns response envelope metadata when observing response', async () => {
            const result = await lastValueFrom<CoapJsonResponse<{ result: string }>>(client.send('/api/e2e/ping', {
                observe: 'response'
            }));
            expect(result.status).toEqual('2.05');
            expect(result.ok).toBe(true);
            expect(result.statusCode).toEqual('2.05');
            expect(result.body).toEqual({ result: 'pong' });
        });

        it('keeps client errors observable as structured responses', async () => {
            const result = await lastValueFrom<CoapJsonResponse<any>>(
                client.send('/missing/route', { observe: 'response' }).pipe(catchError(err => of(err)))
            );
            expect(result.ok).toBe(false);
            expect(result.statusCode ?? result.status).toBe('4.04');
        });
    });
});
