import { EMPTY, EMPTY_OBJ, Inject, Injectable, InvocationContext, isClass, isFunction, lang, tokenId, Type } from '@tsdi/ioc';
import { TransportServer, EndpointBackend, CustomEndpoint, MiddlewareSet, BasicMiddlewareSet, MiddlewareInst, MiddlewareType, Interceptor, ModuleRef, Router } from '@tsdi/core';
import { Logger } from '@tsdi/logs';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { of, EMPTY as RxEMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { CONTENT_DISPOSITION } from './content';
import { HttpContext, HttpRequest, HttpResponse, HTTP_MIDDLEWARES } from './context';
import { ev, LOCALHOST } from '../consts';
import { CorsMiddleware, CorsOptions, EncodeJsonMiddleware, HelmetMiddleware, LogMiddleware } from '../middlewares';
import { HTTP_INTERCEPTORS } from './endpoint';

export interface HttpOptions {
    majorVersion?: number;
    cors?: CorsOptions;
    timeout?: number;
    listenOptions?: ListenOptions;
    interceptors?: Type<Interceptor<HttpRequest, HttpResponse>>[];
    middlewares?: MiddlewareType[];
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
const httpOpts = {
    majorVersion: 2,
    options: { allowHTTP1: true },
    listenOptions: { port: 3000, host: LOCALHOST } as ListenOptions,
    middlewares: [
        LogMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        CorsMiddleware,
        Router
    ]
} as Http2ServerOptions;

/**
 * http server opptions.
 */
export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');

/**
 * http server.
 */
@Injectable()
export class HttpServer extends TransportServer<HttpRequest, HttpResponse, HttpContext> {

    private _backend?: EndpointBackend<HttpRequest, HttpResponse>;
    private _server?: http2.Http2Server | http.Server | https.Server;
    private options!: HttpServerOptions;

    constructor(
        @Inject() readonly context: InvocationContext,
        @Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOptions
    ) {
        super();
        this.initOption(options);
    }

    protected initOption(options: HttpServerOptions) {
        this.options = { ...httpOpts, ...options } as HttpServerOptions;
        if (options?.options) {
            this.options.options = { ...httpOpts.options, ...options.options };
        }
        if (options?.listenOptions) {
            this.options.listenOptions = { ...httpOpts.listenOptions, ...options.listenOptions };
        }
        this.context.setValue(HTTP_SERVEROPTIONS, this.options);
        const middlewares = (this.options.cors === false ? this.options.middlewares?.filter(f => f !== CorsMiddleware) : this.options.middlewares)?.map(m => {
            if (isFunction(m)) {
                return { provide: HTTP_MIDDLEWARES, useClass: m, multi: true };
            } else {
                return { provide: HTTP_MIDDLEWARES, useValue: m, multi: true };
            }
        }) ?? EMPTY;
        this.context.injector.inject(middlewares);

        const interceptors = this.options.interceptors?.map(m => {
            if (isFunction(m)) {
                return { provide: HTTP_INTERCEPTORS, useClass: m, multi: true };
            } else {
                return { provide: HTTP_INTERCEPTORS, useValue: m, multi: true };
            }
        }) ?? EMPTY;
        this.context.injector.inject(interceptors);
    }

    getInterceptors(): Interceptor[] {
        return this.context.get(HTTP_INTERCEPTORS) ?? EMPTY;
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

        let cert: any;
        if (options.majorVersion === 2) {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? http2.createSecureServer(option, (req, res) => this.requestHandler(req, res)) : http2.createServer(option, (req, res) => this.requestHandler(req, res));
            this._server = server;
            server.on(ev.ERROR, (err) => {
                this.logger.error(err);
            });
            // server.on(ev.STREAM, (stream, headers, flags) => {
            //     //todo stream.

            //     stream.respond({
            //         'content-type': 'application/json; charset=utf-8',
            //         ':status': 200
            //     });
            //     stream.write(JSON.stringify({ name: 'ss' }));
            //     stream.end();
            // });
        } else {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? https.createServer(option, (req, res) => this.requestHandler(req, res)) : http.createServer(option, (req, res) => this.requestHandler(req, res));
            this._server = server;
        }
        const listenOptions = this.options.listenOptions;
        this.context.get(ModuleRef).setValue(HTTP_LISTENOPTIONS, { ...listenOptions, withCredentials: cert!!, majorVersion: options.majorVersion });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${cert ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
        this._server.listen(listenOptions);
    }

    protected requestHandler(request: HttpRequest, response: HttpResponse) {
        const ctx = this.contextFactory.create(request, response, this) as HttpContext;
        ctx.setValue(Logger, this.logger);
        ctx.status = 404;
        this.options.timeout && request.setTimeout(this.options.timeout, () => {
            cancel?.unsubscribe();
        });
        request.once(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
        const cancel = this.chain().handle(request, ctx)
            .pipe(
                catchError((err, caught) => {
                    ctx.onError(err);
                    this.logger.error(err);
                    return RxEMPTY;
                }),
                finalize(() => {
                    response.end();
                })
            ).subscribe(resp => { });
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
    constructor(@Inject(HTTP_MIDDLEWARES, { nullable: true }) middlewares: MiddlewareInst<HttpContext>[]) {
        super(middlewares);
    }
}
