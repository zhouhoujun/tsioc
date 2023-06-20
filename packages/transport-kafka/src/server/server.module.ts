import { ExecptionHandlerFilter, TransformModule, StatusVaildator, createTransportEndpoint, MicroServRouterModule } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaEndpoint } from './endpoint';
import { KafkaServer } from './server';
import { KafkaTransportSessionFactory, KafkaTransportSessionFactoryImpl } from '../transport';
import { KafkaStatusVaildator } from '../status';
import { KafkaExecptionHandlers } from './execption.handles';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS, KAFKA_SERV_OPTS, KafkaServerOptions } from './options';
import { KafkaPatternFormatter } from '../pattern';




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
    backend: MicroServRouterModule.getToken('kafka'),
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

/**
 * Kafka microservice module
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('kafka', {
            formatter: KafkaPatternFormatter
        }),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        KafkaStatusVaildator,
        KafkaPatternFormatter,
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
export class KafkaMicroServModule {
    /**
     * import Kafka microservice module with options.
     * @param options microservice module options.
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
    }): ModuleWithProviders<KafkaMicroServModule> {
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
            module: KafkaMicroServModule,
            providers
        }
    }
}


