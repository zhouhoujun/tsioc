import { EMPTY, EMPTY_OBJ, Inject, Injectable, Injector, InvocationContext, isFunction, lang, tokenId } from '@tsdi/ioc';
import { TransportServer, EndpointBackend, TransportContextFactory, CustomEndpoint, MiddlewareSet, BasicMiddlewareSet, MiddlewareType } from '@tsdi/core';
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
import { HttpContext, HttpRequest, HttpResponse, HTTP_MIDDLEWARES } from './context';
import { ev, LOCALHOST } from '../consts';
import { CorsMiddleware, CorsOptions } from '../middlewares/cors';

export interface HttpOptions {
    majorVersion?: number;
    cors?: CorsOptions;
    listenOptions?: ListenOptions;
}

export interface Http1ServerOptions extends HttpOptions {
    majorVersion: 1,
    options?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOptions extends HttpOptions {
    majorVersion: 2,
    options?: http2.ServerOptions | http2.SecureServerOptions;
}

export type HttpServerOptions = Http1ServerOptions | Http2ServerOptions;
/**
 * default options.
 */
const httpOpts = { majorVersion: 2, options: { allowHTTP1: true }, listenOptions: { port: 3000, host: LOCALHOST } as ListenOptions };


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
        @Inject() readonly context: InvocationContext,
        @Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOptions
    ) {
        super();
        this.options = { ...httpOpts, ...options } as HttpServerOptions;
        if (options?.options) {
            this.options.options = { ...httpOpts.options, ...options.options };
        }
        if (options?.listenOptions) {
            this.options.listenOptions = { ...httpOpts.listenOptions, ...options.listenOptions };
        }
        this.context.setValue(HTTP_SERVEROPTIONS, this.options);
    }

    getBackend(): EndpointBackend<HttpRequest, HttpResponse> {
        if (!this._backend) {
            this._backend = new CustomEndpoint<HttpRequest, HttpResponse>((req, ctx) => of((ctx as HttpContext).response));
        }
        return this._backend;
    }

    async startup(): Promise<void> {
        const options = this.options;
        if (this.context.has(CONTENT_DISPOSITION)) {
            const func = await this.context.injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.context.setValue(CONTENT_DISPOSITION, func);
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
        if (options.majorVersion === 2) {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? http2.createSecureServer(option, handler) : http2.createServer(option, handler);
            this._server = server;
            server.on(ev.STREAM, (stream, headers, flags) => {
                //todo stream.

                stream.respond({
                    'content-type': 'application/json; charset=utf-8',
                    ':status': 200
                });
                stream.write(JSON.stringify({ name: 'ss' }));
                stream.end();
            });
            server.on(ev.ERROR, (err) => {
                this.logger.error(err);
            });
        } else {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? https.createServer(option, handler) : http.createServer(option, handler);
            this._server = server;
        }
        const listenOptions = this.options.listenOptions;
        this.context.setValue(HTTP_LISTENOPTIONS, { ...listenOptions, withCredentials: cert!!, majorVersion: options.majorVersion });
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

    protected override createMidderwareSet(): MiddlewareSet<HttpContext> {
        return this.context.resolve(MiddlewareSet)
    }
}


@Injectable()
export class HttpMiddlewareSet extends BasicMiddlewareSet<HttpContext> {
    constructor(
        @Inject(HTTP_MIDDLEWARES, { nullable: true }) middlewares: MiddlewareType<HttpContext>[],
        @Inject(HTTP_SERVEROPTIONS) private options: HttpServerOptions
    ) {
        super(middlewares);
    }

    getAll(): MiddlewareType<HttpContext>[] {
        const cors = this.options.cors;
        if (cors) {
            return this.middlewares;
        }
        return this.middlewares.filter(c => !(c instanceof CorsMiddleware));
    }
}
