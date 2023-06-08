import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { TransportSessionFactory, createHandler } from '@tsdi/core';
import { BodyContentInterceptor, RequestAdapter, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { TcpTransportSessionFactory } from '../transport';
import { TcpStatusVaildator } from '../status';
import { TcpRequestAdapter } from './request';
import { TcpClient } from './clinet';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TcpClientOpts, TcpClientsOpts } from './options';
import { TcpHandler } from './handler';



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


@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        TcpTransportSessionFactory,
        { provide: StatusVaildator, useClass: TcpStatusVaildator },
        { provide: RequestAdapter, useClass: TcpRequestAdapter },
        { provide: TCP_CLIENT_OPTS, useValue: {}, asDefault: true },
        {
            provide: TcpHandler,
            useFactory: (injector: Injector, opts: TcpClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken) {
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
     * import tcp server module with options.
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

        transportFactory?: ProvdierOf<TransportSessionFactory>;
    }): ModuleWithProviders<TcpClientModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(TcpClient, [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: TCP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],

            toProvider(TransportSessionFactory, options.transportFactory ?? TcpTransportSessionFactory)
        ];

        if (options.handler) {
            providers.push(toProvider(TcpHandler, options.handler))
        }

        return {
            module: TcpClientModule,
            providers
        }
    }


}
