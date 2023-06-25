import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, HybridRouter, StatusVaildator, RouterModule, TransformModule, createTransportEndpoint, MicroServRouterModule } from '@tsdi/core';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LOCALHOST, LogInterceptor, ServerFinalizeFilter, Session, TransportModule, RespondAdapter } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import {
    TCP_SERV_INTERCEPTORS, TcpServerOpts, TCP_SERV_FILTERS, TCP_SERV_OPTS, TCP_SERV_GUARDS,
    TCP_MICRO_SERV_OPTS, TCP_MICRO_SERV_INTERCEPTORS, TCP_MICRO_SERV_FILTERS, TCP_MICRO_SERV_GUARDS
} from './options';
import { TcpMicroService, TcpServer } from './server';
import { TcpEndpoint, TcpMicroEndpoint } from './endpoint';
import { TcpExecptionHandlers } from './execption.handles';
import { TcpRespondAdapter } from './respond';
import { TcpMicroStatusVaildator, TcpStatusVaildator } from '../status';
import { TcpTransportSessionFactory, TcpTransportSessionFactoryImpl } from '../transport';




/**
 * tcp microservice default options.
 */
const defMicroOpts = {
    autoListen: true,
    micro: true,
    listenOpts: { port: 3000, host: LOCALHOST },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: TCP_MICRO_SERV_INTERCEPTORS,
    filtersToken: TCP_MICRO_SERV_FILTERS,
    guardsToken: TCP_MICRO_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('tcp'),
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
    ],
    providers: [
        { provide: StatusVaildator, useExisting: TcpMicroStatusVaildator },
        { provide: RespondAdapter, useExisting: TcpRespondAdapter }
    ]

} as TcpServerOpts;

/**
 * TCP microservice Module.
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('tcp'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: TcpTransportSessionFactory, useClass: TcpTransportSessionFactoryImpl, asDefault: true },
        { provide: TCP_MICRO_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        TcpMicroStatusVaildator,
        TcpRespondAdapter,
        TcpExecptionHandlers,
        {
            provide: TcpMicroEndpoint,
            useFactory: (injector: Injector, opts: TcpServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, TCP_MICRO_SERV_OPTS]
        },
        TcpMicroService
    ]
})
export class TcpMicroServModule {
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
        /**
         * transport session factory.
         */
        transportFactory?: ProvdierOf<TcpTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: TcpServerOpts;
    }): ModuleWithProviders<TcpMicroServModule> {
        const providers: ProviderType[] = [
            {
                provide: TCP_MICRO_SERV_OPTS,
                useValue: {
                    ...defMicroOpts,
                    ...options.serverOpts,
                    providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(TcpMicroEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TcpTransportSessionFactory, options.transportFactory))
        }
        return {
            module: TcpMicroServModule,
            providers
        }
    }

}



/**
 * TCP server default options.
 */
const defServerOpts = {
    autoListen: true,
    listenOpts: { port: 3000, host: LOCALHOST },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    filtersToken: TCP_SERV_FILTERS,
    guardsToken: TCP_SERV_GUARDS,
    backend: HybridRouter,
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
    ],
    providers: [
        { provide: StatusVaildator, useExisting: TcpStatusVaildator },
        { provide: RespondAdapter, useExisting: TcpRespondAdapter },
    ]

} as TcpServerOpts;


/**
 * TCP server Module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: TcpTransportSessionFactory, useClass: TcpTransportSessionFactoryImpl, asDefault: true },
        { provide: TCP_SERV_OPTS, useValue: { ...defServerOpts }, asDefault: true },
        TcpStatusVaildator,
        TcpRespondAdapter,
        TcpExecptionHandlers,
        {
            provide: TcpEndpoint,
            useFactory: (injector: Injector, opts: TcpServerOpts) => {
                return createTransportEndpoint(injector, opts)
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
        /**
         * transport session factory.
         */
        transportFactory?: ProvdierOf<TcpTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: TcpServerOpts;
    }): ModuleWithProviders<TcpServerModule> {
        const providers: ProviderType[] = [
            {
                provide: TCP_SERV_OPTS,
                useValue: {
                    ...defServerOpts,
                    ...options.serverOpts,
                    providers: [...defServerOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];
        if (options.endpoint) {
            providers.push(toProvider(TcpEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TcpTransportSessionFactory, options.transportFactory))
        }

        return {
            module: TcpServerModule,
            providers
        }
    }

}

