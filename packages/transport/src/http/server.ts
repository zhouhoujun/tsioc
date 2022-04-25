import { Inject, Injectable, isFunction, lang, tokenId } from '@tsdi/ioc';
import { TransportServer, EndpointBackend, TransportContextFactory, CustomEndpoint, Middleware, MiddlewareFn, TransportContext } from '@tsdi/core';
import { Logger } from '@tsdi/logs';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { fromEvent, of, race } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { CONTENT_DISPOSITION } from './content';
import { HttpContext, HttpMiddleware, HttpRequest, HttpResponse, HTTP_MIDDLEWARES } from './context';


export type HttpVersion = 'http1.1' | 'http2';

export interface Http1ServerOptions {
    version: 'http1.1',
    options?: http.ServerOptions | https.ServerOptions;
    listenOptions?: ListenOptions;
}
export interface Http2ServerOptions {
    version?: 'http2',
    options?: http2.ServerOptions | http2.SecureServerOptions;
    listenOptions?: ListenOptions;
}
const defaultOption = { version: 'http2', listenOptions: { port: 3000, host: 'localhost' } as ListenOptions };
export type HttpServerOptions = Http1ServerOptions | Http2ServerOptions;

export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');

/**
 * http server.
 */
@Injectable()
export class HttpServer extends TransportServer<HttpRequest, HttpResponse, HttpContext> {

    private _backend?: EndpointBackend<HttpRequest, HttpResponse>;
    private _server?: http2.Http2Server | http.Server | https.Server;
    private options: HttpServerOptions;
    constructor(
        @Inject() readonly contextFactory: TransportContextFactory<HttpRequest, HttpResponse>,
        @Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOptions
    ) {
        super();
        this.options = { ...defaultOption, ...options } as HttpServerOptions;
    }

    getBackend(): EndpointBackend<HttpRequest, HttpResponse> {
        if (!this._backend) {
            this._backend = new CustomEndpoint<HttpRequest, HttpResponse>((req, ctx) => of((ctx as HttpContext).response));
        }
        return this._backend;
    }

    protected override getMiddlewares(): HttpMiddleware[] {
        return [...this.injector.get(HTTP_MIDDLEWARES), ...super.getMiddlewares()];
    }

    async startup(): Promise<void> {
        const options = this.options;
        if (!options.version) {
            options.version = 'http2';
        }
        if (this.injector.has(CONTENT_DISPOSITION)) {
            const func = await this.injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.injector.setValue(CONTENT_DISPOSITION, func);
        }

        const handler = (request: HttpRequest, response: HttpResponse) => {
            const ctx = this.contextFactory.create(request, response, this) as HttpContext;
            ctx.setValue(Logger, this.logger);
            ctx.status = 404;
            return this.chain().handle(request, ctx)
                .pipe(
                    catchError((err, caught) => {
                        ctx.onError(err);
                        return caught;
                    })
                );
        }
        let cert: any;
        if (options.version === 'http2') {
            if (options.options) {
                cert = (options.options as http2.SecureServerOptions)?.cert;
                this._server = cert ? http2.createSecureServer(options.options, handler) : http2.createServer(options.options, handler);
            } else {
                this._server = http2.createServer(handler);
            }
        } else {
            if (options.options) {
                cert = (options.options as https.ServerOptions).cert;
                this._server = cert ? https.createServer(options.options as https.ServerOptions, handler) : http.createServer(options.options as http.ServerOptions, handler);
            } else {
                this._server = http.createServer(handler);
            }
        }
        const listenOptions = this.options.listenOptions;
        this.injector.setValue(HTTP_LISTENOPTIONS, { ...listenOptions, withCredentials: cert!! });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${cert ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
        this._server.listen(listenOptions);
    }


    async close(): Promise<void> {
        if (!this._server) return;
        const defer = lang.defer();
        this._server.close((err) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err);
            } else {
                this.logger.info(lang.getClassName(this), this.options.listenOptions, 'closed !');
                defer.resolve();
            }
        });
        await defer.promise;
    }
}
