import { ExecptionHandlerFilter, MiddlewareRouter, RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter, HelmetMiddleware, LOCALHOST, LogInterceptor, RequestAdapter, RespondAdapter, ServerFinalizeFilter, SessionMiddleware, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ListenOptions } from 'net';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVEROPTIONS, HTTP_SERV_INTERCEPTORS, HTTP_EXECPTION_FILTERS, Http2ServerOpts } from './server/options';
import { HttpExecptionHandlers } from './server/exception-filter';
import { HttpStatusVaildator } from './status';
import { HttpRequestAdapter } from './client/request';
import { HttpRespondAdapter } from './server/respond';
import { HttpGuardsHandler } from './client/handler';
import { HttpEndpoint } from './server/endpoint';
import { HTTP_CLIENT_FILTERS, HTTP_INTERCEPTORS, HttpClientOpts } from './client/option';
import { HTTP_MIDDLEWARES } from './server/context';

export interface HttpModuleOptions {
    handler: ProvdierOf<HttpGuardsHandler>;
    endpoint: ProvdierOf<HttpEndpoint>;
    serverOpts?: HttpServerOpts;
    clientOpts?: HttpClientOpts;
}

/**
 * http module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
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
            { provide: HttpClientOpts, useValue: options.clientOpts ?? defClientOpts },
            { provide: HTTP_SERVEROPTIONS, useValue: options.serverOpts ?? defServerOpts },
            toProvider(HttpGuardsHandler, options.handler),
            toProvider(HttpEndpoint, options.endpoint)
        ];
        return {
            module: HttpModule,
            providers
        }
    }
}

const defClientOpts = {
    endpoint: {
        interceptorsToken: HTTP_INTERCEPTORS,
        interceptors: [HttpPathInterceptor, BodyContentInterceptor],
        filtersToken: HTTP_CLIENT_FILTERS,
        backend: TransportBackend
    }
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
    interceptorsToken: HTTP_SERV_INTERCEPTORS,
    middlewaresToken: HTTP_MIDDLEWARES,
    filtersToken: HTTP_EXECPTION_FILTERS,
    detailError: true,
    interceptors: [
        LogInterceptor,
        // StatusInterceptorFilter,
        // PathHanlderFilter,
        // InOutInterceptorFilter,
        // HttpFinalizeFilter
    ],
    filters: [
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
        MiddlewareRouter
    ]
} as Http2ServerOpts;

