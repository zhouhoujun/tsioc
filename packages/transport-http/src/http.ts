import { ExecptionHandlerFilter, MiddlewareRouter, RouterModule, TransformModule, createHandler, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import {
    BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter,
    HelmetMiddleware, LOCALHOST, LogInterceptor, RequestAdapter, RespondAdapter, ServerFinalizeFilter, SessionMiddleware, StatusVaildator, TransportBackend, TransportModule
} from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { ListenOptions } from 'net';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVER_OPTS, HTTP_SERV_INTERCEPTORS, HTTP_EXECPTION_FILTERS, Http2ServerOpts } from './server/options';
import { HttpExecptionHandlers } from './server/exception-filter';
import { HttpStatusVaildator } from './status';
import { HttpRequestAdapter } from './client/request';
import { HttpRespondAdapter } from './server/respond';
import { HttpGuardsHandler } from './client/handler';
import { HttpEndpoint } from './server/endpoint';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HTTP_CLIENT_OPTS, HttpClientOpts } from './client/option';
import { HTTP_MIDDLEWARES } from './server/context';



export interface HttpModuleOptions {
    /**
     * client options.
     */
    clientOpts?: HttpClientOpts;
    /**
     * client handler provider
     */
    handler?: ProvdierOf<HttpGuardsHandler>;

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
        { provide: RequestAdapter, useExisting: HttpRequestAdapter },
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
            { provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } },
            { provide: HTTP_SERVER_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } },
            toProvider(HttpGuardsHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: HttpClientOpts) => {
                    return createHandler(injector, opts);
                },
                deps: [Injector, HTTP_CLIENT_OPTS]
            }),
            toProvider(HttpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: HttpServerOpts) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, HTTP_SERVER_OPTS]
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
    backend: TransportBackend

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
    filtersToken: HTTP_EXECPTION_FILTERS,
    interceptors: [
        LogInterceptor,
        // StatusInterceptorFilter,
        // PathHanlderFilter,
        // InOutInterceptorFilter,
        // HttpFinalizeFilter
    ],
    filters: [
        ExecptionHandlerFilter,
        ExecptionFinalizeFilter,
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
        MiddlewareRouter
    ]

} as Http2ServerOpts;

