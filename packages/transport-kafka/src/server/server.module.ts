import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, StatusVaildator, createTransportEndpoint } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaEndpoint } from './endpoint';
import { KafkaServer } from './server';
import { KafkaTransportSessionFactory, KafkaTransportSessionFactoryImpl } from '../transport';
import { KafkaStatusVaildator } from '../status';
import { KafkaExecptionHandlers } from './execption.handles';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS, KAFKA_SERV_OPTS, KafkaServerOptions } from './options';




/**
 * kafka microservice default options.
 */
const defMicroOpts = {
    connectOpts: {
        brokers: ['localhost:9092']
    },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: KAFKA_SERV_INTERCEPTORS,
    filtersToken: KAFKA_SERV_FILTERS,
    guardsToken: KAFKA_SERV_GUARDS,
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
    ],
    providers: [
        { provide: StatusVaildator, useExisting: KafkaStatusVaildator }
    ]
} as KafkaServerOptions


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        KafkaStatusVaildator,
        { provide: KafkaTransportSessionFactory, useClass: KafkaTransportSessionFactoryImpl, asDefault: true },
        { provide: KAFKA_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        {
            provide: KafkaEndpoint,
            useFactory: (injector: Injector, opts: KafkaServerOptions) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, KAFKA_SERV_OPTS]

        },

        KafkaExecptionHandlers,
        KafkaServer
    ]
})
export class KafkaMicroServiceModule {
    /**
     * import Kafka micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<KafkaEndpoint>;
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<KafkaTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: KafkaServerOptions;
    }): ModuleWithProviders<KafkaMicroServiceModule> {
        const providers: ProviderType[] = [
            {
                provide: KAFKA_SERV_OPTS,
                useValue: {
                    ...defMicroOpts,
                    ...options.serverOpts,
                    providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(KafkaEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(KafkaTransportSessionFactory, options.transportFactory))
        }

        return {
            module: KafkaMicroServiceModule,
            providers
        }
    }
}


