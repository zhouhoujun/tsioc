import { Inject, Injectable, isBoolean, isFunction, lang, EMPTY_OBJ } from '@tsdi/ioc';
import {
    Server, RunnableFactory, ModuleRef, Router, ListenOpts, InOutInterceptorFilter,
    PathHanlderFilter, StatusInterceptorFilter, CatchInterceptor
} from '@tsdi/core';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import {
    CONTENT_DISPOSITION, ev, LOCALHOST, LogInterceptor,
    CorsMiddleware, EncodeJsonMiddleware, HelmetMiddleware, BodyparserMiddleware,
    ContentMiddleware, ContentOptions, SessionMiddleware, CsrfMiddleware, MimeDb
} from '@tsdi/transport';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';

import { HttpExecptionFinalizeFilter } from './exception-filter';
import { Http2ServerOpts, HttpServerOpts, HTTP_EXECPTION_FILTERS, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS } from './options';
import { HttpHandlerBinding } from './binding';
import { HttpInterceptorFinalizeFilter } from './filter';
import { HTTP_SERVR_PROVIDERS } from './providers';
import { HttpStatusFactory } from '../status';



/**
 * default options.
 */
const httpOpts = {
    majorVersion: 2,
    options: { allowHTTP1: true },
    listenOpts: { port: 3000, host: LOCALHOST } as ListenOptions,
    closeDelay: 500,
    statusFactory: HttpStatusFactory,
    content: {
        root: 'public'
    },
    interceptorsToken: HTTP_SERV_INTERCEPTORS,
    middlewaresToken: HTTP_MIDDLEWARES,
    filtersToken: HTTP_EXECPTION_FILTERS,
    detailError: true,
    interceptors: [
        LogInterceptor,
        StatusInterceptorFilter,
        CatchInterceptor,
        PathHanlderFilter,
        InOutInterceptorFilter,
        HttpInterceptorFinalizeFilter
    ],
    filters: [
        HttpExecptionFinalizeFilter
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
export class HttpServer extends Server<HttpServRequest, HttpServResponse, HttpContext, HttpServerOpts>  {

    private _server?: http2.Http2Server | http.Server | https.Server;

    constructor(@Inject(HTTP_SERVEROPTIONS, { nullable: true }) options: HttpServerOpts) {
        super(options)
    }

    get server() {
        return this._server
    }

    get proxyIpHeader() {
        return this.getOptions().proxyIpHeader
    }

    get maxIpsCount() {
        return this.getOptions().maxIpsCount ?? 0
    }

    protected override initOption(options: HttpServerOpts): HttpServerOpts {
        const opts = super.initOption(options);
        const dOpts = this.getDefaultOptions();
        if (options?.options) opts.options = { ...dOpts.options, ...options.options }
        if (options?.listenOpts) opts.listenOpts = { ...dOpts.listenOpts, ...options.listenOpts }

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

    protected override getDefaultOptions(): HttpServerOpts {
        return httpOpts
    }

    protected override defaultProviders() {
        return HTTP_SERVR_PROVIDERS;
    }

    async start(): Promise<void> {
        const opts = this.getOptions();
        const injector = this.context.injector;
        if (this.context.has(CONTENT_DISPOSITION)) {
            const func = await injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.context.setValue(CONTENT_DISPOSITION, func)
        }


        if (opts.controllers) {
            await injector.load(opts.controllers);
        }

        const option = opts.options ?? EMPTY_OBJ;
        const isSecure = opts.protocol !== 'http' && !!option.cert;
        if (opts.majorVersion === 2) {
            const server = this._server = isSecure ? http2.createSecureServer(option, (req, res) => this.onRequestHandler(req, res))
                : http2.createServer(option, (req, res) => this.onRequestHandler(req, res));

            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        } else {
            const server = this._server = isSecure ? https.createServer(option, (req, res) => this.onRequestHandler(req, res))
                : http.createServer(option, (req, res) => this.onRequestHandler(req, res));

            server.on(ev.ERROR, (err) => {
                this.logger.error(err)
            })
        }

        //sharing servers
        if (opts.sharing) {
            const factory = injector.get(RunnableFactory);
            const providers = [
                { provide: HttpServer, useValue: this },
                { provide: HTTP_SERVEROPTIONS, useValue: opts }
            ];
            await Promise.all(opts.sharing.map(sr => {
                const runnable = factory.create(sr, injector, { providers });
                return runnable.run()
            }))
        }

        const listenOptions = opts.listenOpts;
        injector.get(ModuleRef).setValue(ListenOpts, { ...listenOptions, withCredentials: isSecure, majorVersion: opts.majorVersion });
        this.logger.info(lang.getClassName(this), 'listen:', listenOptions, '. access with url:', `http${isSecure ? 's' : ''}://${listenOptions?.host}:${listenOptions?.port}${listenOptions?.path ?? ''}`, '!')
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

    /**
     * request handler.
     * @param request 
     * @param response 
     */
    protected onRequestHandler(request: HttpServRequest, response: HttpServResponse) {
        const ctx = new HttpContext(this.context.injector, request, response, this as Server, this.statusFactory());
        this.context.injector.get(HttpHandlerBinding).binding(ctx, this.endpoint);
    }

}

