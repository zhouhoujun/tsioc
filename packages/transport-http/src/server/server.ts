import { Inject, Injectable, isFunction, lang, EMPTY_OBJ, promisify } from '@tsdi/ioc';
import { MiddlewareRouter, ListenOpts, ExecptionHandlerFilter, Server, ModuleLoader
} from '@tsdi/core';
import { Subscriber } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import {
    CONTENT_DISPOSITION, LOCALHOST, LogInterceptor,
    CorsMiddleware, EncodeJsonMiddleware, HelmetMiddleware, BodyparserMiddleware,
    ContentMiddleware, SessionMiddleware, CsrfMiddleware, Cleanup
} from '@tsdi/transport';
import { HttpContext, HttpServRequest, HttpServResponse, HTTP_MIDDLEWARES } from './context';
import { Http2ServerOpts, HttpServerOpts, HTTP_EXECPTION_FILTERS, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS } from './options';
import { HTTP_SERVR_PROVIDERS } from './providers';

// import { HttpFinalizeFilter } from './filter';
// import { HttpExecptionFinalizeFilter } from './exception-filter';


/**
 * default options.
 */
const httpOpts = {
    majorVersion: 2,
    serverOpts: { allowHTTP1: true },
    listenOpts: { port: 3000, host: LOCALHOST } as ListenOptions,
    hasRequestEvent: true,
    content: {
        root: 'public'
    },
    interceptorsToken: HTTP_SERV_INTERCEPTORS,
    middlewaresToken: HTTP_MIDDLEWARES,
    filtersToken: HTTP_EXECPTION_FILTERS,
    detailError: true,
    interceptors: [
        LogInterceptor,
        // StatusInterceptorFilter,
        ExecptionHandlerFilter,
        // PathHanlderFilter,
        // InOutInterceptorFilter,
        // HttpFinalizeFilter
    ],
    filters: [
        // HttpExecptionFinalizeFilter
    ],
    middlewares: [
        HelmetMiddleware,
        CorsMiddleware,
        ContentMiddleware,
        SessionMiddleware,
        CsrfMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        MiddlewareRouter
    ]
} as Http2ServerOpts;


/**
 * http server.
 */
@Injectable()
export class HttpServer extends Server<HttpContext>  {

    constructor(@Inject(HTTP_SERVEROPTIONS, { nullable: true }) private options: HttpServerOpts) {
        super()
    }

    // get proxyIpHeader() {
    //     return this.getOptions().proxyIpHeader
    // }

    // get maxIpsCount() {
    //     return this.getOptions().maxIpsCount ?? 0
    // }


    // protected override initContext(options: HttpServerOpts): void {
    //     this.context.setValue(HTTP_SERVEROPTIONS, options);
    //     super.initContext(options);
    // }

    // protected override getDefaultOptions(): HttpServerOpts {
    //     return httpOpts
    // }

    // protected override defaultProviders() {
    //     return HTTP_SERVR_PROVIDERS;
    // }

    private _secure?: boolean;
    get isSecure() {
        return this._secure === true
    }

    protected async createServer(opts: HttpServerOpts): Promise<http2.Http2Server | http.Server | https.Server> {
        const injector = this.endpoint.injector;
        const loader = injector.get(ModuleLoader);
        if (injector.has(CONTENT_DISPOSITION)) {
            const func = await loader.require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            injector.setValue(CONTENT_DISPOSITION, func)
        }

        if (opts.controllers) {
            await loader.register(injector, opts.controllers);
        }

        const option = opts.serverOpts ?? EMPTY_OBJ;
        const isSecure = this.isSecure;
        if (opts.majorVersion === 2) {
            const server = isSecure ? http2.createSecureServer(option as http2.SecureServerOptions)
                : http2.createServer(option as http2.ServerOptions);
            server.listen()
            return server;
        } else {
            const server = isSecure ? https.createServer(option as http.ServerOptions)
                : http.createServer(option as https.ServerOptions);
            return server;
        }
    }

    protected override async setupServe(server: http2.Http2Server | http.Server | https.Server, observer: Subscriber<http2.Http2Server | http.Server | https.Server>, opts: HttpServerOpts): Promise<Cleanup> {
        // const cleanup = await super.setupServe(server, observer, opts);
        const injector = this.endpoint.injector;
        const sharing = opts.sharing;
        //sharing servers
        if (sharing) {
            const factory = injector.get(RunnableFactory);
            const providers = [
                { provide: HttpServer, useValue: this },
                { provide: HTTP_SERVEROPTIONS, useValue: opts }
            ];
            await Promise.all(sharing.map(sr => {
                const runnable = factory.create(sr, injector, { providers });
                return runnable.run()
            }))
        }
        return cleanup;
    }

    protected async listen(opts: ListenOpts): Promise<void> {
        const isSecure = this.isSecure;
        this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host}:${opts?.port}${opts?.path ?? ''}`, '!')
        this.server.listen(opts as ListenOptions)
    }

    protected override validOptions(opts: HttpServerOpts) {
        super.validOptions(opts);
        const withCredentials = this._secure = opts.protocol !== 'http' && !!(opts.serverOpts as any).cert;
        opts.listenOpts = { ...opts.listenOpts!, withCredentials, majorVersion: opts.majorVersion } as ListenOptions;
    }

    protected createContext(req: HttpServRequest, res: HttpServResponse): HttpContext {
        return new HttpContext(this.endpoint.injector, req, res, this.options.proxy);
    }


    async close(): Promise<void> {
        if (!this.server) return;
        await promisify(this.server.close, this.server)()
            .then(()=> {
                this.logger.info(lang.getClassName(this), this.getOptions().listenOpts, 'closed !');
            })
            .catch(err=> {
                this.logger.error(err);
            })
    }

}

