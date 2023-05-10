import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import {
    ClientStreamFactory, ExecptionHandlerFilter, MiddlewareRouter,
    RouterModule, TransformModule, createHandler, createAssetEndpoint, ServerStreamFactory
} from '@tsdi/core';
import {
    BodyContentInterceptor, BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, ExecptionFinalizeFilter, LOCALHOST, LogInterceptor,
    StreamRequestAdapter, ServerFinalizeFilter, SessionMiddleware, TransportModule, ev, TransportBackend
} from '@tsdi/transport';
import { TcpClient } from './client/clinet';
import { TCP_SERV_INTERCEPTORS, TcpServerOpts, TCP_SERV_FILTERS, TCP_SERV_MIDDLEWARES, TCP_SERV_OPTS } from './server/options';
import { TcpServer } from './server/server';
import { TcpEndpoint } from './server/endpoint';
import { TcpStreamRequestAdapter } from './client/request';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TcpClientOpts, TcpClientsOpts } from './client/options';
import { TcpPathInterceptor } from './client/path';
import { TcpHandler } from './client/handler';
import { TcpClientStreamFactory } from './client/stream';
import { TcpServerStreamFactory } from './microservice/stream';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        TcpClient,
        TcpServer,
        { provide: StreamRequestAdapter, useClass: TcpStreamRequestAdapter }
    ]
})
export class TcpModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: TcpModuleOptions): ModuleWithProviders<TcpModule> {
        const clopts = { ...defClientOpts };
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } }],
            { provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } },
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
            }),
            toProvider(ClientStreamFactory, options.clientStreamFactory ?? TcpClientStreamFactory),
            toProvider(ServerStreamFactory, options.serverStreamFactory ?? TcpServerStreamFactory)
        ];

        return {
            module: TcpModule,
            providers
        }
    }

    static withMicroService(options: TcpModuleOptions): ModuleWithProviders<TcpModule> {
        const clopts = { ...defClientOpts };
        if (!options.clientStreamFactory) {
            clopts.backend = TransportBackend;
        }
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } }],
            { provide: TCP_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } },
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
            }),
            toProvider(ClientStreamFactory, options.clientStreamFactory ?? TcpClientStreamFactory),
            toProvider(ServerStreamFactory, options.serverStreamFactory ?? TcpServerStreamFactory)
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
    clientOpts?: TcpClientOpts | TcpClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<TcpHandler>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TcpEndpoint>;

    clientStreamFactory?: ProvdierOf<ClientStreamFactory>;
    serverStreamFactory?: ProvdierOf<ServerStreamFactory>;

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
    backend: TransportBackend

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
    middlewaresToken: TCP_SERV_MIDDLEWARES,
    filtersToken: TCP_SERV_FILTERS,
    interceptors: [
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
