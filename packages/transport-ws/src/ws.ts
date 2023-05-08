import { ClientStreamFactory, ExecptionHandlerFilter, PacketTransformer, RouterModule, ServerStreamFactory, TransformModule, createAssetEndpoint, createHandler } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { WsClient } from './client/client';
import { WsServer } from './server/server';
import { WS_CLIENT_OPTS, WsClientOpts, WsClientsOpts } from './client/options';
import { WsHandler } from './client/handler';
import { WsEndpoint } from './server/endpoint';
import { WS_SERV_FILTERS, WS_SERV_INTERCEPTORS, WS_SERV_OPTS, WsServerOpts } from './server/options';
import { ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, ev } from '@tsdi/transport';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        WsClient,
        WsServer
    ]
})
export class WsModule {

    /**
     * Ws module options.
     * @param options 
     * @returns 
     */
    static withOptions(options: WsModuleOptions): ModuleWithProviders<WsModule> {
        const clopts = { ...defClientOpts };
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(WsClient, [{ provide: WS_CLIENT_OPTS, useValue: { ...clopts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: WS_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } }],
            { provide: WS_CLIENT_OPTS, useValue: { ...clopts, ...options.clientOpts } },
            { provide: WS_SERV_OPTS, useValue: { ...defServerOpts, ...options.serverOpts } },
            toProvider(WsHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: WsClientOpts) => {
                    return createHandler(injector, opts);
                },
                deps: [Injector, WS_CLIENT_OPTS]
            }),
            toProvider(WsEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: WsServerOpts) => {
                    return createAssetEndpoint(injector, opts)
                },
                deps: [Injector, WS_SERV_OPTS]
            }),
            // toProvider(ClientStreamFactory, options.clientStreamFactory ?? ClientStreamFactoryImpl),
            // toProvider(ServerStreamFactory, options.serverStreamFactory ?? ServerStreamFactoryImpl)
        ];

        if (options.transformer) {
            providers.push(toProvider(PacketTransformer, options.transformer))
        }

        return {
            module: WsModule,
            providers
        }
    }
}


export interface WsModuleOptions {
    /**
     * client options.
     */
    clientOpts?: WsClientOpts | WsClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<WsHandler>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<WsEndpoint>;
    /**
     * packet transformer.
     */
    transformer?: ProvdierOf<PacketTransformer>;

    clientStreamFactory?: ProvdierOf<ClientStreamFactory>;
    serverStreamFactory?: ProvdierOf<ServerStreamFactory>;

    /**
     * server options
     */
    serverOpts?: WsServerOpts;
}



const defClientOpts = {
    url: 'wss://127.0.0.1/'
} as WsClientOpts;

/**
 * tcp server default options.
 */
const defServerOpts = {
    serverOpts: null!,
    connectionOpts: {
        events: [ev.CONNECTION],
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024
    },
    detailError: true,
    interceptorsToken: WS_SERV_INTERCEPTORS,
    filtersToken: WS_SERV_FILTERS,
    interceptors: [
    ],
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ]

} as WsServerOpts;
