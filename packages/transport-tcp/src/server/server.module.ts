import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, getToken, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, createMiddlewareEndpoint, TransportSessionFactory, createTransportEndpoint, MicroServiceRouterModule, MessageRouter } from '@tsdi/core';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LOCALHOST, LogInterceptor, ServerFinalizeFilter, Session, TransportModule, RespondAdapter, StatusVaildator } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { TCP_SERV_INTERCEPTORS, TcpServerOpts, TCP_SERV_FILTERS, TCP_SERV_MIDDLEWARES, TCP_SERV_OPTS, TcpMicroServiceOpts, TCP_SERV_GUARDS, TCP_MICRO_SERV_OPTS, TCP_MICRO_SERV_INTERCEPTORS, TCP_MICRO_SERV_GUARDS, TCP_MICRO_SERV_FILTERS } from './options';
import { TcpMicroService, TcpServer } from './server';
import { TcpEndpoint, TcpMicroEndpoint } from './endpoint';
import { TcpExecptionHandlers } from './execption.handles';
import { TcpRespondAdapter } from './respond';
import { TcpMicroStatusVaildator, TcpStatusVaildator } from '../status';
import { TcpTransportSessionFactory } from '../transport';




/**
 * tcp microservice default options.
 */
const defMicroOpts = {
    autoListen: true,
    listenOpts: { port: 3200, host: LOCALHOST },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public',
        prefix: '/content'
    },
    detailError: true,
    interceptorsToken: TCP_MICRO_SERV_INTERCEPTORS,
    filtersToken: TCP_MICRO_SERV_FILTERS,
    guardsToken: TCP_MICRO_SERV_GUARDS,
    backend: getToken(MessageRouter, 'tcp'),
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    interceptors: [
        Session,
        Content,
        Json,
        Bodyparser
    ]
} as TcpMicroServiceOpts



@Module({
    imports: [
        TransformModule,
        MicroServiceRouterModule.forRoot('tcp'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: TCP_MICRO_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        { provide: StatusVaildator, useClass: TcpMicroStatusVaildator },
        TcpTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: TcpTransportSessionFactory, asDefault: true },
        TcpRespondAdapter,
        TcpExecptionHandlers,
        { provide: RespondAdapter, useExisting: TcpRespondAdapter },
        {
            provide: TcpMicroEndpoint,
            useFactory: (injector: Injector, opts: TcpMicroServiceOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, TCP_MICRO_SERV_OPTS]
        },
        TcpMicroService
    ]
})
export class TcpMicroServiceModule {
    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<TcpEndpoint>;

        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: TcpMicroServiceOpts;
    }): ModuleWithProviders<TcpMicroServiceModule> {
        const providers: ProviderType[] = [
            TcpMicroService,
            { provide: TCP_MICRO_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(TcpMicroEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }
        return {
            module: TcpMicroServiceModule,
            providers
        }
    }

}



/**
 * tcp server default options.
 */
const defServerOpts = {
    autoListen: true,
    listenOpts: { port: 3200, host: LOCALHOST },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    middlewaresToken: TCP_SERV_MIDDLEWARES,
    filtersToken: TCP_SERV_FILTERS,
    guardsToken: TCP_SERV_GUARDS,
    interceptors: [],
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    middlewares: [
        Session,
        Content,
        Json,
        Bodyparser,
        HybridRouter
    ]

} as TcpServerOpts;


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: TCP_SERV_OPTS, useValue: { ...defServerOpts }, asDefault: true },
        { provide: StatusVaildator, useClass: TcpStatusVaildator },
        TcpTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: TcpTransportSessionFactory, asDefault: true },
        TcpRespondAdapter,
        TcpExecptionHandlers,
        { provide: RespondAdapter, useExisting: TcpRespondAdapter },
        {
            provide: TcpEndpoint,
            useFactory: (injector: Injector, opts: TcpServerOpts) => {
                return createMiddlewareEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, TCP_SERV_OPTS]
        },
        TcpServer
    ]
})
export class TcpServerModule {

    /**
     * import tcp server module with options.
     * @param options module options.
     * @returns 
     */
    static withOptions(options: {
        /**
         * server endpoint provider
         */
        endpoint?: ProvdierOf<TcpEndpoint>;

        transportFactory?: ProvdierOf<TransportSessionFactory>;

        /**
         * server options
         */
        serverOpts?: TcpServerOpts;
    }): ModuleWithProviders<TcpServerModule> {
        const providers: ProviderType[] = [
            { provide: TCP_SERV_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } }
        ];
        if (options.endpoint) {
            providers.push(toProvider(TcpEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }

        return {
            module: TcpServerModule,
            providers
        }
    }

}

