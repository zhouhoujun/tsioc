import { ExecptionHandlerFilter, StatusVaildator, MicroServRouterModule, TransformModule, createTransportEndpoint, PatternFormatter } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, Json, Session, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { NatsServer } from './server';
import { NatsEndpoint } from './endpoint';
// import { NatsExecptionHandlers } from './execption.handles';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS, NATS_SERV_OPTS, NatsMicroServOpts } from './options';
import { NatsTransportSessionFactory, NatsTransportSessionFactoryImpl } from '../transport';
import { NatsStatusVaildator } from '../status';
import { NatsPatternFormatter } from '../pattern';
import { NatsExecptionHandlers } from './execption.handles';





const defaultServOpts = {
    transportOpts: {
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: NATS_SERV_INTERCEPTORS,
    filtersToken: NATS_SERV_FILTERS,
    guardsToken: NATS_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('nats'),
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
        { provide: StatusVaildator, useExisting: NatsStatusVaildator },
        { provide: PatternFormatter, useExisting: NatsPatternFormatter }
    ]
} as NatsMicroServOpts;


/**
 * Nats microservice module
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('nats', {
            formatter: NatsPatternFormatter
        }),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        NatsStatusVaildator,
        NatsPatternFormatter,
        NatsExecptionHandlers,
        { provide: NatsTransportSessionFactory, useClass: NatsTransportSessionFactoryImpl, asDefault: true },
        { provide: NATS_SERV_OPTS, useValue: { ...defaultServOpts }, asDefault: true },
        {
            provide: NatsEndpoint,
            useFactory: (injector: Injector, opts: NatsMicroServOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, NATS_SERV_OPTS]
        },
        NatsServer
    ]
})
export class NatsMicroServModule {

    /**
     * import NATS micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<NatsEndpoint>;

        transportFactory?: ProvdierOf<NatsTransportSessionFactory>;
        /**
         * service options
         */
        serverOpts?: NatsMicroServOpts;
    }
    ): ModuleWithProviders<NatsMicroServModule> {

        const providers: ProviderType[] = [
            {
                provide: NATS_SERV_OPTS,
                useValue: {
                    ...defaultServOpts,
                    ...options.serverOpts,
                    providers: [...defaultServOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(NatsEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(NatsTransportSessionFactory, options.transportFactory))
        }


        return {
            module: NatsMicroServModule,
            providers
        }
    }

}

