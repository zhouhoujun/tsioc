import { EMPTY, EMPTY_OBJ, Inject, Injectable, InvocationContext, isFunction, isString, lang, tokenId, Type } from '@tsdi/ioc';
import {
    TransportServer, EndpointBackend, CustomEndpoint, MiddlewareSet, BasicMiddlewareSet,
    MiddlewareType, MiddlewareInst, Interceptor, ModuleRef, Router,
} from '@tsdi/core';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { of, Subscription } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { CONTENT_DISPOSITION } from './content';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';
import { ev, hdr, LOCALHOST } from '../consts';
import { CorsMiddleware, CorsOptions, EncodeJsonMiddleware, HelmetMiddleware, LogMiddleware } from '../middlewares';
import { emptyStatus } from './status';
import { isStream } from '../utils';
import { BodyparserMiddleware } from '../middlewares/bodyparser';
import { MimeDb, MimeSource } from '../mime';
import { db } from './mimedb';


export interface HttpOptions {
    majorVersion?: number;
    cors?: CorsOptions;
    /**
     * request timeout.
     */
    timeout?: number;
    /**
     * delay some time to clean up after request client close.
     */
    closeDelay?: number;
    mimeDb?: Record<string, MimeSource>;
    listenOptions?: ListenOptions;
    interceptors?: Type<Interceptor<HttpServRequest, HttpServResponse>>[];
    execptions?: Type<Interceptor>;
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
    mimeDb: db,
    closeDelay: 500,
    middlewares: [
        LogMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        CorsMiddleware,
        BodyparserMiddleware,
        Router
    ]
} as Http2ServerOptions;

/**
 * http server opptions.
 */
export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');


/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
 export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpServRequest, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');


/**
 * http server.
 */
@Injectable()
export class HttpServer extends TransportServer<HttpServRequest, HttpServResponse, HttpContext>  {

    private _backend?: EndpointBackend<HttpServRequest, HttpServResponse>;
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

        if (this.options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(this.options.mimeDb);
        }
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
                return { provide: HTTP_SERV_INTERCEPTORS, useClass: m, multi: true };
            } else {
                return { provide: HTTP_SERV_INTERCEPTORS, useValue: m, multi: true };
            }
        }) ?? EMPTY;
        this.context.injector.inject(interceptors);
    }

    getInterceptors(): Interceptor[] {
        return this.context.get(HTTP_SERV_INTERCEPTORS) ?? EMPTY;
    }

    getBackend(): EndpointBackend<HttpServRequest, HttpServResponse> {
        if (!this._backend) {
            this._backend = new CustomEndpoint<HttpServRequest, HttpServResponse>((req, ctx) => of((ctx as HttpContext).response));
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

    protected override bindEvent(ctx: HttpContext, cancel: Subscription): void {
        const req = ctx.request;
        this.options.timeout && req.setTimeout(this.options.timeout, () => {
            req.emit(ev.ABOUT);
            cancel?.unsubscribe();
        });
        req.once(ev.CLOSE, async () => {
            await lang.delay(this.options.closeDelay ?? 500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end();
            }
        });
    }

    protected override async respond(res: HttpServResponse, ctx: HttpContext): Promise<any> {
        if (ctx.destroyed) return;

        if (!ctx.writable) return;

        let body = ctx.body;
        const code = ctx.status;

        // ignore body
        if (emptyStatus[code]) {
            // strip headers
            ctx.body = null;
            return res.end();
        }

        if ('HEAD' === ctx.method) {
            if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length;
            }
            return res.end();
        }

        // status body
        if (null == body) {
            if (ctx._explicitNullBody) {
                res.removeHeader(hdr.CONTENT_TYPE);
                res.removeHeader(hdr.TRANSFER_ENCODING);
                return res.end();
            }
            if (ctx.request.httpVersionMajor >= 2) {
                body = String(code);
            } else {
                body = ctx.statusMessage || String(code);
            }
            if (!res.headersSent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body);
            }
            return res.end(body);
        }

        // responses
        if (Buffer.isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(body);
        if (isStream(body)) return body.pipe(res);

        // body: json
        body = JSON.stringify(body);
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body);
        }
        res.end(body);
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


