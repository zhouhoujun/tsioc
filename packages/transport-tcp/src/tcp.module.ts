import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import {
    ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, createHandler,
    createMiddlewareEndpoint, TransportSessionFactory, createTransportEndpoint
} from '@tsdi/core';
import {
    BodyContentInterceptor, Bodyparser, Content, Json, ExecptionFinalizeFilter, LOCALHOST, LogInterceptor,
    ServerFinalizeFilter, Session, TransportModule, TransportBackend, RequestAdapter, StatusVaildator, RespondAdapter
} from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { TcpClient } from './client/clinet';
import { TCP_SERV_INTERCEPTORS, TcpServerOpts, TCP_SERV_FILTERS, TCP_SERV_MIDDLEWARES, TCP_SERV_OPTS, TcpMicroServiceOpts } from './server/options';
import { TcpMicroService, TcpServer } from './server/server';
import { TcpEndpoint } from './server/endpoint';
import { TcpRequestAdapter } from './client/request';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TcpClientOpts, TcpClientsOpts } from './client/options';
import { TcpHandler } from './client/handler';
import { TCP_MICRO_SERV, TcpStatusVaildator } from './status';
import { TcpTransportSessionFactory } from './transport';
import { TcpExecptionHandlers } from './server/execption.handles';
import { TcpRespondAdapter } from './server/respond';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        TcpTransportSessionFactory,
        { provide: StatusVaildator, useClass: TcpStatusVaildator },
        { provide: RequestAdapter, useClass: TcpRequestAdapter },
        TcpClient,

        TcpRespondAdapter,
        TcpExecptionHandlers,
        { provide: RespondAdapter, useExisting: TcpRespondAdapter },
        TcpServer,
        { provide: TcpMicroService, useClass: TcpServer }
    ]
})
export class TcpModule {

    /**
     * import tcp server module with options.
     * @param options module options.
     * @returns 
     */
    static withOptions(options: TcpModuleOptions): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [
            { provide: TCP_MICRO_SERV, useValue: false },
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],

            { provide: TCP_SERV_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } },
            toProvider(TcpHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: TcpClientOpts) => {
                    if (!opts.interceptors || !opts.interceptorsToken) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(TCP_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, TCP_CLIENT_OPTS]
            }),
            toProvider(TcpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: TcpServerOpts) => {
                    return createMiddlewareEndpoint(injector, opts)
                },
                deps: [Injector, TCP_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? TcpTransportSessionFactory)
        ];

        return {
            module: TcpModule,
            providers
        }
    }

    /**
     * import tcp mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
    static forMicroService(options: TcpMircoModuleOptions): ModuleWithProviders<TcpModule> {
        const providers: ProviderType[] = [
            { provide: TCP_MICRO_SERV, useValue: true },
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: TCP_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } },
            toProvider(TcpHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: TcpClientOpts) => {
                    if (!opts.interceptors) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(TCP_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, TCP_CLIENT_OPTS]
            }),
            toProvider(TcpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: TcpMicroServiceOpts) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, TCP_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? TcpTransportSessionFactory)
        ];

        return {
            module: TcpModule,
            providers
        }
    }

}

/**
 * tcp module options.
 */
export interface TcpModuleOptions {
    /**
     * client options.
     */
    clientOpts?: TcpClientOpts | TcpClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<TcpHandler>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TcpEndpoint>;

    transportFactory?: ProvdierOf<TransportSessionFactory>;

    /**
     * server options
     */
    serverOpts?: TcpServerOpts;
}

/**
 * tcp mirco service module options.
 */
export interface TcpMircoModuleOptions {
    /**
     * client options.
     */
    clientOpts?: TcpClientOpts | TcpClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<TcpHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<TcpEndpoint>;

    transportFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * server options
     */
    serverOpts?: TcpMicroServiceOpts;
}


/**
 * tcp client default options.
 */
const defClientOpts = {
    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
    },
    interceptors: [BodyContentInterceptor],
    filtersToken: TCP_CLIENT_FILTERS,
    backend: TransportBackend

} as TcpClientOpts;


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
        root: 'public'
    },
    detailError: true,
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    middlewaresToken: TCP_SERV_MIDDLEWARES,
    filtersToken: TCP_SERV_FILTERS,
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
    ]
} as TcpMicroServiceOpts


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
