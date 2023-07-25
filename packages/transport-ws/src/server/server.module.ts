import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, StatusVaildator, TransformModule, createTransportEndpoint, MicroServRouterModule } from '@tsdi/core';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import { WS_SERV_INTERCEPTORS, WsServerOpts, WS_SERV_FILTERS, WS_SERV_OPTS, WS_SERV_GUARDS } from './options';
import { WsServer } from './server';
import { WsEndpoint } from './endpoint';
import { WsExecptionHandlers } from './execption.handles';
import { WsStatusVaildator } from '../status';
import { WsTransportSessionFactory, WsTransportSessionFactoryImpl } from '../transport';




/**
 * ws microservice default options.
 */
const defMicroOpts = {
    transportOpts: {
        delimiter: '#',
        maxSize: 1024 * 256 - 6
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: WS_SERV_INTERCEPTORS,
    filtersToken: WS_SERV_FILTERS,
    guardsToken: WS_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('ws'),
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
        { provide: StatusVaildator, useExisting: WsStatusVaildator }
    ]

} as WsServerOpts;

/**
 * WS microservice Module.
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('ws'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: WsTransportSessionFactory, useClass: WsTransportSessionFactoryImpl, asDefault: true },
        { provide: WS_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        WsStatusVaildator,
        WsExecptionHandlers,
        {
            provide: WsEndpoint,
            useFactory: (injector: Injector, opts: WsServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, WS_SERV_OPTS]
        },
        WsServer
    ]
})
export class WsMicroServModule {
    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<WsEndpoint>;
        /**
         * transport session factory.
         */
        transportFactory?: ProvdierOf<WsTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: WsServerOpts;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<WsMicroServModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            {
                provide: WS_SERV_OPTS,
                useValue: {
                    ...defMicroOpts,
                    ...options.serverOpts,
                    providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(WsEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(WsTransportSessionFactory, options.transportFactory))
        }
        return {
            module: WsMicroServModule,
            providers
        }
    }

}


