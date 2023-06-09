
import { ExecptionHandlerFilter, HybridRouter, MicroServiceRouterModule, TransformModule, TransportSessionFactory, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, StatusVaildator, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { AmqpTransportSessionFactory } from '../transport';
import { AmqpStatusVaildator } from '../status';
import { AmqpServer } from './server';
import { AmqpEndpoint } from './endpoint';
import { AmqpExecptionHandlers } from './execption.handles';
import { AMQP_SERV_FILTERS, AMQP_SERV_GUARDS, AMQP_SERV_INTERCEPTORS, AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './options';



/**
 * amqp microservice default options.
 */
const defMicroOpts = {
    connectOpts: 'amqp://localhost',
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
        queue: 'amqp.queue',
        persistent: false,
        noAssert: false,
        queueOpts: {},
        prefetchCount: 0
    },
    content: {
        root: 'public',
        prefix: '/content'
    },
    detailError: true,
    interceptorsToken: AMQP_SERV_INTERCEPTORS,
    filtersToken: AMQP_SERV_FILTERS,
    guardsToken: AMQP_SERV_GUARDS,
    backend: HybridRouter,
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
    ]
} as AmqpMicroServiceOpts


@Module({
    imports: [
        TransformModule,
        MicroServiceRouterModule.forRoot('amqp'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        AmqpTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: AmqpTransportSessionFactory, asDefault: true },
        { provide: StatusVaildator, useClass: AmqpStatusVaildator },
        { provide: AMQP_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        {
            provide: AmqpEndpoint,
            useFactory: (injector: Injector, opts: AmqpMicroServiceOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, AMQP_SERV_OPTS]
        },
        AmqpExecptionHandlers,
        AmqpServer
    ]
})
export class AmqpMicroServiceModule {
    /**
     * import Amqp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<AmqpEndpoint>;
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: AmqpMicroServiceOpts;
    }): ModuleWithProviders<AmqpMicroServiceModule> {
        const providers: ProviderType[] = [
            { provide: AMQP_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(AmqpEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }

        return {
            module: AmqpMicroServiceModule,
            providers
        }
    }
}


