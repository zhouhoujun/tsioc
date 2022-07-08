import { Inject, Injectable, InvocationContext, isBoolean, isDefined, isFunction, lang, Providers, EMPTY_OBJ} from '@tsdi/ioc';
import { TransportServer, RunnableFactoryResolver, ModuleRef, Router, ExecptionRespondTypeAdapter } from '@tsdi/core';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { Subscription } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { CONTENT_DISPOSITION } from '../../content';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';
import { ev, LOCALHOST } from '../../consts';
import {
    ContentSendAdapter, CorsMiddleware, EncodeJsonMiddleware, HelmetMiddleware, BodyparserMiddleware,
    ContentMiddleware, ContentOptions, SessionMiddleware, CsrfMiddleware
} from '../../middlewares';
import { MimeAdapter, MimeDb } from '../../mime';
import { Negotiator } from '../../negotiator';
import { CatchInterceptor, LogInterceptor, ResponseStatusFormater, RespondAdapter, RespondInterceptor } from '../../interceptors';
import { HttpStatusFormater } from './formater';
import { db } from '../../impl/mimedb';
import { TrasportMimeAdapter } from '../../impl/mime';
import { TransportSendAdapter } from '../../impl/send';
import { TransportNegotiator } from '../../impl/negotiator';
import { HttpExecptionRespondTypeAdapter, HttpRespondAdapter } from './respond';
import { ArgumentErrorFilter, HttpFinalizeFilter } from './finalize-filter';
import { Http2ServerOptions, HttpServerOptions, HTTP_EXECPTION_FILTERS, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS } from './options';



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
    interceptorsToken: HTTP_SERV_INTERCEPTORS,
    middlewaresToken: HTTP_MIDDLEWARES,
    execptionsToken: HTTP_EXECPTION_FILTERS,
    execptions: [
        HttpFinalizeFilter,
        ArgumentErrorFilter
    ],
    detailError: true,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
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
 * http server.
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: HttpStatusFormater },
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: ExecptionRespondTypeAdapter, useClass: HttpExecptionRespondTypeAdapter },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter },
    { provide: Negotiator, useClass: TransportNegotiator }
])
export class HttpServer extends TransportServer<HttpServRequest, HttpServResponse, HttpContext>  {

    private _server?: http2.Http2Server | http.Server | https.Server;
    private options!: HttpServerOptions;

    constructor(
        @Inject() context: InvocationContext,
        @Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOptions
    ) {
        super(context, options)
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

    protected override initOption(options: HttpServerOptions): HttpServerOptions {
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
        this.context.setValue(HTTP_SERVEROPTIONS, opts);

        if (opts.content && !isBoolean(opts.content)) {
            this.context.setValue(ContentOptions, opts.content)
        }

        if (opts.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(opts.mimeDb)
        }

        return opts;
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

