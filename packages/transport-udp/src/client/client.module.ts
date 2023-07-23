import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { TransportSessionFactory, StatusVaildator, createHandler } from '@tsdi/core';
import { BodyContentInterceptor, RequestAdapter, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { UdpTransportSessionFactory, UdpTransportSessionFactoryImpl } from '../transport';
import { UdpStatusVaildator } from '../status';
import { UdpRequestAdapter } from './request';
import { UdpClient } from './client';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS, UDP_CLIENT_OPTS, UdpClientOpts, UdpClientsOpts } from './options';
import { UdpHandler } from './handler';



/**
 * UDP client default options.
 */
const defClientOpts = {
    url: 'ws://localhost:3000',
    transportOpts: {
        delimiter: '#',
        maxSize: 1024 * 64 - 6,
    },
    interceptorsToken: UDP_CLIENT_INTERCEPTORS,
    filtersToken: UDP_CLIENT_FILTERS,
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: UdpStatusVaildator },
        { provide: RequestAdapter, useExisting: UdpRequestAdapter }
    ]
} as UdpClientOpts;


/**
 * UDP Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: UdpTransportSessionFactory, useClass: UdpTransportSessionFactoryImpl, asDefault: true },
        { provide: UDP_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        UdpStatusVaildator,
        UdpRequestAdapter,
        {
            provide: UdpHandler,
            useFactory: (injector: Injector, opts: UdpClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(UDP_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, UDP_CLIENT_OPTS]
        },
        UdpClient
    ]
})
export class UdpClientModule {

    /**
     * import ws client module with options.
     * @param options module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: UdpClientOpts | UdpClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<UdpHandler>;
        /**
         * transport factory
         */
        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<UdpClientModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(UdpClient, [{ provide: UDP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: UDP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(UdpHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(UdpTransportSessionFactory, options.transportFactory))
        }
        return {
            module: UdpClientModule,
            providers
        }
    }


}
