import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { TransportSessionFactory } from '@tsdi/common';
import { TransportBackend } from '@tsdi/common/client';
import { WsStatusVaildator } from '../status';
import { WsClient } from './client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WS_CLIENT_OPTS, WsClientOpts, WsClientsOpts } from './options';
import { WsHandler } from './handler';


const defaultMaxSize = 1024 * 256;

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
} as WsClientOpts;


/**
 * WS Client Module.
 */
@Module({
    imports: [
    ],
    providers: [
        { provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        WsStatusVaildator,
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
         * session factory
         */
        sessionFactory?: ProvdierOf<TransportSessionFactory>;
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
        if (options.sessionFactory) {
            providers.push(toProvider(TransportSessionFactory, options.sessionFactory))
        }
        return {
            module: WsClientModule,
            providers
        }
    }


}
