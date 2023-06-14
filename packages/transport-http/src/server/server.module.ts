import { ExecptionHandlerFilter, RouterModule, TransformModule, createMiddlewareEndpoint, HybridRouter } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import {
    BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, JsonMiddleware, ExecptionFinalizeFilter, StatusVaildator, HttpStatusVaildator,
    HelmetMiddleware, LOCALHOST, LogInterceptor, RespondAdapter, ServerFinalizeFilter, SessionMiddleware, TransportModule
} from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { ListenOptions } from 'net';
import { HttpServer } from './server';
import { HttpServerOpts, HTTP_SERV_OPTS, HTTP_SERV_INTERCEPTORS, HTTP_SERV_FILTERS, Http2ServerOpts, HTTP_SERV_GUARDS } from './options';
import { HttpExecptionHandlers } from './exception.handles';
import { HttpRespondAdapter } from './respond';
import { HttpEndpoint } from './endpoint';
import { HTTP_MIDDLEWARES } from './context';



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
    guardsToken: HTTP_SERV_GUARDS,
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
        JsonMiddleware,
        BodyparserMiddleware,
        HybridRouter
    ],
    providers: [
        { provide: StatusVaildator, useExisting: HttpStatusVaildator },
        { provide: RespondAdapter, useExisting: HttpRespondAdapter },
    ]

} as Http2ServerOpts;



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
        { provide: HTTP_SERV_OPTS, useValue: { ...defServerOpts }, asDefault: true },
        HttpStatusVaildator,
        HttpRespondAdapter,
        HttpExecptionHandlers,
        {
            provide: HttpEndpoint,
            useFactory: (injector: Injector, opts: HttpServerOpts) => {
                return createMiddlewareEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, HTTP_SERV_OPTS]
        },
        HttpServer
    ]
})
export class HttpServerModule {

    static withOption(options: {
        /**
         * server endpoint provider
         */
        endpoint?: ProvdierOf<HttpEndpoint>;
        /**
         * server options
         */
        serverOpts?: HttpServerOpts;
    }): ModuleWithProviders<HttpServerModule> {
        const providers: ProviderType[] = [
            {
                provide: HTTP_SERV_OPTS,
                useValue: {
                    ...defServerOpts,
                    ...options.serverOpts,
                    providers: [...defServerOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(HttpEndpoint, options.endpoint))
        }
        return {
            module: HttpServerModule,
            providers
        }
    }
}

