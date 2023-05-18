import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, createHandler, createAssetEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import {
    BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter,
    HelmetMiddleware, LOCALHOST, LogInterceptor, StreamRequestAdapter, RespondAdapter, ServerFinalizeFilter, SessionMiddleware, StatusVaildator, TransportBackend, TransportModule, RequestAdapter, StreamTransportBackend
} from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { ListenOptions } from 'net';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpPathInterceptor } from './client/path';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HTTP_CLIENT_OPTS, HttpClientOpts, HttpClientsOpts } from './client/option';
import { HttpServerOpts, HTTP_SERV_OPTS, HTTP_SERV_INTERCEPTORS, HTTP_SERV_FILTERS, Http2ServerOpts } from './server/options';
import { HttpExecptionHandlers } from './server/exception-filter';
import { HttpStatusVaildator } from './status';
import { HttpRequestAdapter } from './client/request';
import { HttpRespondAdapter } from './server/respond';
import { HttpHandler } from './client/handler';
import { HttpEndpoint } from './server/endpoint';
import { HTTP_MIDDLEWARES } from './server/context';



export interface HttpModuleOptions {
    /**
     * client options.
     */
    clientOpts?: HttpClientOpts | HttpClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<HttpHandler>;

    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<HttpEndpoint>;
    /**
     * server options
     */
    serverOpts?: HttpServerOpts;
}

/**
 * http module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        HttpStatusVaildator,
        HttpRequestAdapter,
        HttpPathInterceptor,
        { provide: StreamRequestAdapter, useExisting: HttpRequestAdapter },
        { provide: StatusVaildator, useExisting: HttpStatusVaildator },
        Http,

        HttpRespondAdapter,
        HttpExecptionHandlers,
        { provide: RespondAdapter, useExisting: HttpRespondAdapter },
        HttpServer
    ]
})
export class HttpModule {

    static withOption(options: HttpModuleOptions): ModuleWithProviders<HttpModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(Http, [{ provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: HTTP_SERV_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } },
            toProvider(HttpHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: HttpClientOpts) => {
                    return createHandler(injector, opts);
                },
                deps: [Injector, HTTP_CLIENT_OPTS]
            }),
            toProvider(HttpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: HttpServerOpts) => {
                    return createAssetEndpoint(injector, opts)
                },
                deps: [Injector, HTTP_SERV_OPTS]
            })
        ];
        return {
            module: HttpModule,
            providers
        }
    }
}

const defClientOpts = {
    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
    interceptors: [HttpPathInterceptor, BodyContentInterceptor],
    filtersToken: HTTP_CLIENT_FILTERS,
    backend: StreamTransportBackend

} as HttpClientOpts;



/**
 * default options.
 */
const defServerOpts = {
    majorVersion: 2,
    serverOpts: { allowHTTP1: true },
    autoListen: true,
    listenOpts: { port: 3000, host: LOCALHOST } as ListenOptions,
    hasRequestEvent: true,
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: HTTP_SERV_INTERCEPTORS,
    middlewaresToken: HTTP_MIDDLEWARES,
    filtersToken: HTTP_SERV_FILTERS,
    interceptors: [],
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    middlewares: [
        HelmetMiddleware,
        CorsMiddleware,
        ContentMiddleware,
        SessionMiddleware,
        CsrfMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        HybridRouter
    ]

} as Http2ServerOpts;

