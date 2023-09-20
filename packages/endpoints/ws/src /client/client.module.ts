import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { TransportModule, TransportSessionFactory, StatusVaildator, BodyContentInterceptor, RequestAdapter, TransportBackend } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import { WsTransportSessionFactory, WsTransportSessionFactoryImpl, defaultMaxSize } from '../transport';
import { WsStatusVaildator } from '../status';
import { WsRequestAdapter } from './request';
import { WsClient } from './client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WS_CLIENT_OPTS, WsClientOpts, WsClientsOpts } from './options';
import { WsHandler } from './handler';



/**
 * WS client default options.
 */
const defClientOpts = {
    url: 'ws://localhost:3000',
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    interceptorsToken: WS_CLIENT_INTERCEPTORS,
    filtersToken: WS_CLIENT_FILTERS,
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: WsStatusVaildator },
        { provide: RequestAdapter, useExisting: WsRequestAdapter }
    ]
} as WsClientOpts;


/**
 * WS Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: WsTransportSessionFactory, useClass: WsTransportSessionFactoryImpl, asDefault: true },
        { provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        WsStatusVaildator,
        WsRequestAdapter,
        {
            provide: WsHandler,
            useFactory: (injector: Injector, opts: WsClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(WS_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, WS_CLIENT_OPTS]
        },
        WsClient
    ]
})
export class WsClientModule {

    /**
     * import ws client module with options.
     * @param options module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: WsClientOpts | WsClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<WsHandler>;
        /**
         * transport factory
         */
        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<WsClientModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(WsClient, [{ provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(WsHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(WsTransportSessionFactory, options.transportFactory))
        }
        return {
            module: WsClientModule,
            providers
        }
    }


}
