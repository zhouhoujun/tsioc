import {
    EMPTY_OBJ, Inject, Injectable, InvocationContext, isBoolean, isDefined,
    isFunction, lang, Providers, Token, tokenId, Type
} from '@tsdi/ioc';
import {
    TransportServer, EndpointBackend, CustomEndpoint, RunnableFactoryResolver,
    MiddlewareType, Interceptor, ModuleRef, Router, InterceptorType, ExecptionFilter,
    MiddlewareInst, InterceptorInst, ServerOptions,
} from '@tsdi/core';
import { of, Subscription } from 'rxjs';
import { ListenOptions } from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as assert from 'node:assert';
import { CONTENT_DISPOSITION } from './content';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';
import { ev, LOCALHOST } from '../consts';
import { CorsMiddleware, CorsOptions, EncodeJsonMiddleware, HelmetMiddleware } from '../middlewares';
import { BodyparserMiddleware } from '../middlewares/bodyparser';
import { MimeAdapter, MimeDb, MimeSource } from '../mime';
import { db } from './mimedb';
import { HttpSendAdapter } from './send';
import { SendAdapter } from '../middlewares/send';
import { HttpNegotiator } from './negotiator';
import { Negotiator } from '../negotiator';
import { HttpMimeAdapter } from './mime';
import { ContentMiddleware, ContentOptions } from '../middlewares/content';
import { SessionMiddleware, SessionOptions } from '../middlewares/session';
import { CsrfMiddleware, CsrfOptions } from '../middlewares/csrf';
import { CatchInterceptor, LogInterceptor, ResponseStatusFormater } from '../interceptors';
import { HttpStatusFormater } from './formater';
import { ResponsedInterceptor } from './interceptors/respond';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';

/**
 * http options.
 */
export interface HttpOptions extends ServerOptions<HttpServRequest, HttpServResponse> {
    majorVersion?: number;
    cors?: boolean | CorsOptions;
    proxy?: boolean;
    proxyIpHeader?: string;
    maxIpsCount?: number;
    /**
     * request timeout.
     */
    timeout?: number;
    /**
     * delay some time to clean up after request client close.
     */
    closeDelay?: number;
    detailError?: boolean;
    mimeDb?: Record<string, MimeSource>;
    listenOptions?: ListenOptions;
    interceptors?: InterceptorType<HttpServRequest, HttpServResponse>[];
    execptions?: Type<ExecptionFilter>[];
    middlewares?: MiddlewareType[];
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    csrf?: boolean | CsrfOptions;
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
    detailError: true,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        ResponsedInterceptor
    ],
    middlewares: [
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


export const HTTP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpServRequest, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');


/**
 * http server.
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: HttpStatusFormater },
    { provide: SendAdapter, useClass: HttpSendAdapter },
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
        super()
        this.initOption(options);
        this.initialize(this.options);
    }

    get server() {
        return this._server
    }

    get proxy() {
        return this.options.proxy
    }

    get proxyIpHeader() {
        return this.options.proxyIpHeader
    }

    get maxIpsCount() {
        return this.options.maxIpsCount ?? 0
    }

    override getExecptionsToken(): Token<ExecptionFilter[]> {
        return HTTP_EXECPTION_FILTERS;
    }

    protected initOption(options: HttpServerOptions) {
        if (options?.options) {
            options.options = { ...httpOpts.options, ...options.options }
        }
        if (options?.listenOptions) {
            options.listenOptions = { ...httpOpts.listenOptions, ...options.listenOptions }
        }
        const opts = this.options = { ...httpOpts, ...options } as HttpServerOptions;

        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.cors && m === CorsMiddleware) return false;
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.csrf && m === CsrfMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }
        this.context.injector.setValue(HTTP_SERVEROPTIONS, opts);

        if (opts.content && !isBoolean(opts.content)) {
            this.context.injector.setValue(ContentOptions, opts.content)
        }

        if (opts.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(opts.mimeDb)
        }
    }

    protected override getInterceptorsToken(): Token<InterceptorInst<HttpServRequest, HttpServResponse>[]> {
        return HTTP_SERV_INTERCEPTORS;
    }

    protected override getMiddlewaresToken(): Token<MiddlewareInst<HttpContext>[]> {
        return HTTP_MIDDLEWARES;
    }


    async start(): Promise<void> {
        const options = this.options;
        const injector = this.context.injector;
        if (this.context.has(CONTENT_DISPOSITION)) {
            const func = await injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.context.setValue(CONTENT_DISPOSITION, func)
        }

        let cert: any;
        if (options.majorVersion === 2) {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? http2.createSecureServer(option, (req, res) => this.requestHandler(req, res)) : http2.createServer(option, (req, res) => this.requestHandler(req, res));
            this._server = server;
            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        } else {
            const option = options.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? https.createServer(option, (req, res) => this.requestHandler(req, res)) : http.createServer(option, (req, res) => this.requestHandler(req, res));
            this._server = server;
            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        }

        //sharing servers
        if (this.options.sharing) {
            const resolver = injector.get(RunnableFactoryResolver);
            const providers = [
                { provide: HttpServer, useValue: this },
                { provide: HTTP_SERVEROPTIONS, useValue: this.options }
            ];
            await Promise.all(this.options.sharing.map(sr => {
                const runnable = resolver.resolve(sr);
                return runnable.create(injector, { providers }).run()
            }))
        }

        const listenOptions = this.options.listenOptions;
        injector.get(ModuleRef).setValue(HTTP_LISTENOPTIONS, { ...listenOptions, withCredentials: isDefined(cert), majorVersion: options.majorVersion });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${cert ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
        this._server.listen(listenOptions)
    }


    protected override getBackend(): EndpointBackend<HttpServRequest, HttpServResponse> {
        if (!this._backend) {
            this._backend = new CustomEndpoint<HttpServRequest, HttpServResponse>((req, ctx) => of((ctx as HttpContext).response))
        }
        return this._backend
    }

    protected override bindEvent(ctx: HttpContext, cancel: Subscription): void {
        const req = ctx.request;
        this.options.timeout && req.setTimeout(this.options.timeout, () => {
            req.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.CLOSE, async () => {
            await lang.delay(this.options.closeDelay ?? 500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end()
            }
        })
    }

    async close(): Promise<void> {
        if (!this._server) return;
        const defer = lang.defer();
        this._server.close((err) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err)
            } else {
                this.logger.info(lang.getClassName(this), this.options.listenOptions, 'closed !');
                defer.resolve()
            }
        });
        await defer.promise;
        this._server = null!
    }

    protected override createContext(request: HttpServRequest, response: HttpServResponse): HttpContext {
        return new HttpContext(this.context.injector, request, response, this as TransportServer)
    }

}

