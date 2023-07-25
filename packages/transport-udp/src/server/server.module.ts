import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, StatusVaildator, TransformModule, createTransportEndpoint, MicroServRouterModule } from '@tsdi/core';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import { UDP_SERV_INTERCEPTORS, UdpServerOpts, UDP_SERV_FILTERS, UDP_SERV_OPTS, UDP_SERV_GUARDS } from './options';
import { UdpServer } from './server';
import { UdpEndpoint } from './endpoint';
import { UdpExecptionHandlers } from './execption.handles';
import { UdpStatusVaildator } from '../status';
import { UdpTransportSessionFactory, UdpTransportSessionFactoryImpl } from '../transport';
import { defaultMaxSize } from '../const';




/**
 * UDP microservice default options.
 */
const defMicroOpts = {
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: UDP_SERV_INTERCEPTORS,
    filtersToken: UDP_SERV_FILTERS,
    guardsToken: UDP_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('udp'),
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
        { provide: StatusVaildator, useExisting: UdpStatusVaildator }
    ]

} as UdpServerOpts;

/**
 * UDP microservice Module.
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('udp'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: UdpTransportSessionFactory, useClass: UdpTransportSessionFactoryImpl, asDefault: true },
        { provide: UDP_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        UdpStatusVaildator,
        UdpExecptionHandlers,
        {
            provide: UdpEndpoint,
            useFactory: (injector: Injector, opts: UdpServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, UDP_SERV_OPTS]
        },
        UdpServer
    ]
})
export class UdpMicroServModule {
    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<UdpEndpoint>;
        /**
         * transport session factory.
         */
        transportFactory?: ProvdierOf<UdpTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: UdpServerOpts;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<UdpMicroServModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            {
                provide: UDP_SERV_OPTS,
                useValue: {
                    ...defMicroOpts,
                    ...options.serverOpts,
                    providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(UdpEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(UdpTransportSessionFactory, options.transportFactory))
        }
        return {
            module: UdpMicroServModule,
            providers
        }
    }

}


