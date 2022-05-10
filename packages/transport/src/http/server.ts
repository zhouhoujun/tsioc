import { EMPTY, EMPTY_OBJ, Inject, Injectable, InvocationContext, isBoolean, isFunction, isString, lang, Providers, tokenId, Type } from '@tsdi/ioc';
import {
    TransportServer, EndpointBackend, CustomEndpoint, MiddlewareSet, BasicMiddlewareSet,
    MiddlewareType, Interceptor, ModuleRef, Router, InterceptorType, ExecptionFilter, RunnableFactoryResolver,
} from '@tsdi/core';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { of, Subscription } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { Readable } from 'stream';
import { CONTENT_DISPOSITION } from './content';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';
import { ev, hdr, LOCALHOST } from '../consts';
import { CorsMiddleware, CorsOptions, EncodeJsonMiddleware, HelmetMiddleware, LogMiddleware } from '../middlewares';
import { emptyStatus } from './status';
import { isBuffer, isStream } from '../utils';
import { BodyparserMiddleware } from '../middlewares/bodyparser';
import { MimeAdapter, MimeDb, MimeSource } from '../mime';
import { db } from './mimedb';
import { HttpSendAdapter } from './send';
import { SendAdapter } from '../middlewares/send';
import { HttpNegotiator } from './negotiator';
import { Negotiator } from '../negotiator';
import { HttpExecptionFilter } from './filter';
import { HttpMimeAdapter } from './mime';
import { ContentMiddleware, ContentOptions } from '../middlewares/content';
import { SessionMiddleware, SessionOptions } from '../middlewares/session';
import { CsrfMiddleware, CsrfOptions } from '../middlewares/csrf';

/**
 * http options.
 */
export interface HttpOptions {
    majorVersion?: number;
    cors?: CorsOptions;
    proxy?: boolean;
    proxyIpHeader?: string;
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
    interceptors?: InterceptorType<HttpServRequest, HttpServResponse>[];
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    csrf?: boolean | CsrfOptions;
    execptions?: Type<Interceptor>;
    middlewares?: MiddlewareType[];
    /**
     * share with thie http server.
     * eg. ws, socket.io server.
     */
    sharing?: Type<TransportServer<any, any>>[];
}

export interface Http1ServerOptions extends HttpOptions {
    majorVersion: 1,
    options?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOptions extends HttpOptions {
    majorVersion: 2,
    options?: http2.ServerOptions | http2.SecureServerOptions;
}

/**
 * http server options.
 */
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
    content: {
        root: 'public'
    },
    middlewares: [
        LogMiddleware,
        HelmetMiddleware,
        CorsMiddleware,
        ContentMiddleware,
        SessionMiddleware,
        CsrfMiddleware,
        EncodeJsonMiddleware,
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
@Providers([
    { provide: SendAdapter, useClass: HttpSendAdapter },
    { provide: ExecptionFilter, useClass: HttpExecptionFilter },
    { provide: MimeAdapter, useClass: HttpMimeAdapter },
    { provide: Negotiator, useClass: HttpNegotiator }
])
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

    get server() {
        return this._server;
    }

    get proxy() {
        return this.options.proxy;
    }

    get proxyIpHeader() {
        return this.options.proxyIpHeader;
    }

    protected initOption(options: HttpServerOptions) {
        this.options = { ...httpOpts, ...options } as HttpServerOptions;
        if (options?.options) {
            this.options.options = { ...httpOpts.options, ...options.options };
        }
        if (options?.listenOptions) {
            this.options.listenOptions = { ...httpOpts.listenOptions, ...options.listenOptions };
        }
        this.context.injector.setValue(HTTP_SERVEROPTIONS, this.options);

        if (this.options.content && !isBoolean(this.options.content)) {
            this.context.injector.setValue(ContentOptions, this.options.content);
        }

        if (this.options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(this.options.mimeDb);
        }

        const middlewares = this.options.middlewares?.filter(m => {
            if (!this.options.cors && m === CorsMiddleware) return false;
            if (!this.options.session && m === SessionMiddleware) return false;
            if (!this.options.csrf && m === CsrfMiddleware) return false;
            if (!this.options.content && m === ContentMiddleware) return false;
            return true;
        }).map(m => {
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

    getInterceptors(): Interceptor<HttpServRequest, HttpServResponse>[] {
        return this.context.injector.get(HTTP_SERV_INTERCEPTORS, EMPTY);
    }

    async start(): Promise<void> {
        const options = this.options;
        const injector = this.context.injector;
        if (this.context.has(CONTENT_DISPOSITION)) {
            const func = await injector.getLoader().require('content-disposition');
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
            server.on(ev.ERROR, (err) => {
                this.logger.error(err);
            });
        }

        //sharing servers
        if (this.options.sharing) {
            const resolver = injector.get(RunnableFactoryResolver);
            const providers = [
                { provide: HttpServer, useValue: this },
                { provide: HTTP_SERVEROPTIONS, useValue: this.options }
            ];
            await Promise.all(this.options.sharing.map(sr => {
                let runnable = resolver.resolve(sr);
                return runnable.create(injector, { providers }).run();
            }));
        }

        const listenOptions = this.options.listenOptions;
        injector.get(ModuleRef).setValue(HTTP_LISTENOPTIONS, { ...listenOptions, withCredentials: cert!!, majorVersion: options.majorVersion });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${cert ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
        this._server.listen(listenOptions);
    }


    protected override getBackend(): EndpointBackend<HttpServRequest, HttpServResponse> {
        if (!this._backend) {
            this._backend = new CustomEndpoint<HttpServRequest, HttpServResponse>((req, ctx) => of((ctx as HttpContext).response));
        }
        return this._backend;
    }

    protected override bindEvent(ctx: HttpContext, cancel: Subscription): void {
        const req = ctx.request;
        this.options.timeout && req.setTimeout(this.options.timeout, () => {
            req.emit(ev.TIMEOUT);
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
        if (isBuffer(body)) return res.end(body);
        if (isString(body)) return res.end(body);
        if (isStream(body)) {
            let defer = lang.defer();
            body.once(ev.ERROR, (err) => {
                defer.reject(err);
            });
            body.once(ev.END, () => {
                defer.resolve();
            });
            body.pipe(res as any);
            return await defer.promise
                .then(() => {
                    res.end();
                    if (body instanceof Readable) body.destroy();
                });
        }

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

    protected override createContext(request: HttpServRequest, response: HttpServResponse): HttpContext {
        return new HttpContext(this.context.injector, request, response, this);
    }

    protected override createMidderwareSet(): MiddlewareSet<HttpContext> {
        return new BasicMiddlewareSet(this.context.get(HTTP_MIDDLEWARES));
    }
}




