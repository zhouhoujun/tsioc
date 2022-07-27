import { Inject, Injectable, isBoolean, isDefined, isFunction, lang, Providers, EMPTY_OBJ } from '@tsdi/ioc';
import { TransportServer, RunnableFactoryResolver, ModuleRef, Router, ExecptionTypedRespond, TransportStatus, Protocol, HandlerBinding } from '@tsdi/core';
import { LISTEN_OPTS } from '@tsdi/platform-server';
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
import { DefaultStatusFormater } from '../../interceptors/formater';
import { db } from '../../impl/mimedb';
import { TrasportMimeAdapter } from '../../impl/mime';
import { TransportSendAdapter } from '../../impl/send';
import { TransportNegotiator } from '../../impl/negotiator';
import { HttpExecptionTypedRespond, HttpRespondAdapter } from './respond';
import { ArgumentErrorFilter, HttpFinalizeFilter } from './finalize-filter';
import { Http2ServerOpts, HttpServerOpts, HTTP_EXECPTION_FILTERS, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS } from './options';
import { HttpStatus } from '../status';
import { HttpProtocol } from '../protocol';
import { HttpHandlerBinding } from './binding';



/**
 * default options.
 */
const httpOpts = {
    majorVersion: 2,
    options: { allowHTTP1: true },
    listenOpts: { port: 3000, host: LOCALHOST } as ListenOptions,
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
} as Http2ServerOpts;

/**
 * http server.
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater, asDefault: true },
    { provide: RespondAdapter, useClass: HttpRespondAdapter, asDefault: true },
    { provide: ExecptionTypedRespond, useClass: HttpExecptionTypedRespond, asDefault: true },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter, asDefault: true },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter, asDefault: true },
    { provide: Negotiator, useClass: TransportNegotiator, asDefault: true },
    { provide: TransportStatus, useClass: HttpStatus, asDefault: true },
    { provide: Protocol, useClass: HttpProtocol, asDefault: true },
    { provide: HandlerBinding, useClass: HttpHandlerBinding, asDefault: true }
])
export class HttpServer extends TransportServer<HttpServRequest, HttpServResponse, HttpContext, HttpServerOpts>  {

    private _server?: http2.Http2Server | http.Server | https.Server;

    constructor(@Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOpts) {
        super(options)
    }

    get server() {
        return this._server
    }

    get proxy() {
        return this.getOptions().proxy === true
    }

    get proxyIpHeader() {
        return this.getOptions().proxyIpHeader
    }

    get maxIpsCount() {
        return this.getOptions().maxIpsCount ?? 0
    }

    protected override initOption(options: HttpServerOpts): HttpServerOpts {
        if (options?.options) {
            options.options = { ...httpOpts.options, ...options.options }
        }
        if (options?.listenOpts) {
            options.listenOpts = { ...httpOpts.listenOpts, ...options.listenOpts }
        }
        const opts = { ...httpOpts, ...options } as HttpServerOpts;

        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.cors && m === CorsMiddleware) return false;
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.csrf && m === CsrfMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }
        return opts;
    }

    protected override initContext(options: HttpServerOpts): void {
        this.context.setValue(HTTP_SERVEROPTIONS, options);

        if (options.content && !isBoolean(options.content)) {
            this.context.setValue(ContentOptions, options.content)
        }

        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }
        super.initContext(options);
    }

    async start(): Promise<void> {
        const opts = this.getOptions();
        const injector = this.context.injector;
        if (this.context.has(CONTENT_DISPOSITION)) {
            const func = await injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.context.setValue(CONTENT_DISPOSITION, func)
        }

        let cert: any;
        if (opts.majorVersion === 2) {
            const option = opts.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? http2.createSecureServer(option, (req, res) => this.onRequestHandler(req, res)) : http2.createServer(option, (req, res) => this.onRequestHandler(req, res));
            this._server = server;
            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        } else {
            const option = opts.options ?? EMPTY_OBJ;
            cert = option.cert;
            const server = cert ? https.createServer(option, (req, res) => this.onRequestHandler(req, res)) : http.createServer(option, (req, res) => this.onRequestHandler(req, res));
            this._server = server;
            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        }

        //sharing servers
        if (opts.sharing) {
            const resolver = injector.get(RunnableFactoryResolver);
            const providers = [
                { provide: HttpServer, useValue: this },
                { provide: HTTP_SERVEROPTIONS, useValue: opts }
            ];
            await Promise.all(opts.sharing.map(sr => {
                const runnable = resolver.resolve(sr);
                return runnable.create(injector, { providers }).run()
            }))
        }

        const listenOptions = opts.listenOpts;
        injector.get(ModuleRef).setValue(LISTEN_OPTS, { ...listenOptions, withCredentials: isDefined(cert), majorVersion: opts.majorVersion });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${cert ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
        this._server.listen(listenOptions)
    }

    async close(): Promise<void> {
        if (!this._server) return;
        const defer = lang.defer();
        this._server.close((err) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err)
            } else {
                this.logger.info(lang.getClassName(this), this.getOptions().listenOpts, 'closed !');
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

