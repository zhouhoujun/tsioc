import { ClientStreamFactory, ExecptionHandlerFilter, IncomingFactory, MiddlewareRouter, OutgoingFactory, StreamCoding, RouterModule, TransformModule, createHandler, createAssetEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter, LOCALHOST, LogInterceptor, StreamRequestAdapter, ServerFinalizeFilter, SessionMiddleware, StreamTransportBackend, TransportModule, ev } from '@tsdi/transport';
import { TcpClient } from './client/clinet';
// import { TcpVaildator, TcpPackFactory } from './transport';
import { TCP_SERV_INTERCEPTORS, TcpServerOpts, TCP_SERV_FILTERS, TCP_MIDDLEWARES, TCP_SERV_OPTS } from './server/options';
import { TcpServer } from './server/server';
import { TcpRequestAdapter } from './client/request';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TcpClientOpts } from './client/options';
import { TcpEndpoint } from './server/endpoint';
import { TcpPathInterceptor } from './client/path';
import { TcpHandler } from './client/handler';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        // TcpVaildator,
        // TcpPackFactory,
        TcpClient,
        TcpServer,
        { provide: StreamRequestAdapter, useClass: TcpRequestAdapter }
    ]
})
export class TcpModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: TcpModuleOptions): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [
            { provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } },
            { provide: TCP_SERV_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } },
            toProvider(TcpHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: TcpClientOpts) => {
                    return createHandler(injector, opts);
                },
                deps: [Injector, TCP_CLIENT_OPTS]
            }),
            toProvider(TcpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: TcpServerOpts) => {
                    return createAssetEndpoint(injector, opts)
                },
                deps: [Injector, TCP_SERV_OPTS]
            })
        ];
        return {
            module: TcpModule,
            providers
        }
    }
}


export interface TcpModuleOptions {
    /**
     * client options.
     */
    clientOpts?: TcpClientOpts|TcpClientOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<TcpHandler>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TcpEndpoint>;
    
    coding?:ProvdierOf<StreamCoding>;
    clientStreamFactory?: ProvdierOf<ClientStreamFactory>;
    incomingFactory?: ProvdierOf<IncomingFactory>;
    outgoingFactory?: ProvdierOf<OutgoingFactory>;

    /**
     * server options
     */
    serverOpts?: TcpServerOpts;
}

/**
 * tcp client default options.
 */
const defClientOpts = {
    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
    connectionOpts: {
        events: [ev.CONNECT],
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
    },
    interceptors: [TcpPathInterceptor, BodyContentInterceptor],
    filtersToken: TCP_CLIENT_FILTERS,
    backend: StreamTransportBackend

} as TcpClientOpts;



/**
 * tcp server default options.
 */
const defServerOpts = {
    autoListen: true,
    listenOpts: { port: 3200, host: LOCALHOST },
    connectionOpts: {
        events: [ev.CONNECTION],
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    middlewaresToken: TCP_MIDDLEWARES,
    filtersToken: TCP_SERV_FILTERS,
    interceptors: [
        // LogInterceptor,
        // StatusInterceptorFilter,
        // PathHanlderFilter,
        // InOutInterceptorFilter,
        // HttpFinalizeFilter
    ],
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    middlewares: [
        SessionMiddleware,
        ContentMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        MiddlewareRouter
    ]

} as TcpServerOpts;
