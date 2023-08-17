import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { TransportModule, TransportSessionFactory, StatusVaildator, BodyContentInterceptor, RequestAdapter, TransportBackend } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import { TcpTransportSessionFactory, TcpTransportSessionFactoryImpl, defaultMaxSize } from '../transport';
import { TcpStatusVaildator } from '../status';
import { TcpRequestAdapter } from './request';
import { TcpClient } from './client';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TcpClientOpts, TcpClientsOpts } from './options';
import { TcpHandler } from './handler';



/**
 * TCP client default options.
 */
const defClientOpts = {
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
    filtersToken: TCP_CLIENT_FILTERS,
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: TcpStatusVaildator },
        { provide: RequestAdapter, useExisting: TcpRequestAdapter }
    ]
} as TcpClientOpts;


/**
 * TCP Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: TcpTransportSessionFactory, useClass: TcpTransportSessionFactoryImpl, asDefault: true },
        { provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        TcpStatusVaildator,
        TcpRequestAdapter,
        {
            provide: TcpHandler,
            useFactory: (injector: Injector, opts: TcpClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(TCP_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, TCP_CLIENT_OPTS]
        },
        TcpClient
    ]
})
export class TcpClientModule {

    /**
     * import tcp client module with options.
     * @param options module options.
     * @returns 
     */
    static withOptions(options: {
        /**
         * client options.
         */
        clientOpts?: TcpClientOpts | TcpClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<TcpHandler>;
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<TcpClientModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(TcpHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TcpTransportSessionFactory, options.transportFactory))
        }
        return {
            module: TcpClientModule,
            providers
        }
    }


}
