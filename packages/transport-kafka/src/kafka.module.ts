import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, RequestAdapter, ServerFinalizeFilter, Session, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';
import { KafkaTransportSessionFactory } from './transport';
import { KafkaRequestAdapter } from './client/request';
import { KafkaStatusVaildator } from './status';
import { KafkaExecptionHandlers } from './server/execption.handles';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS, KAFKA_CLIENT_OPTS, KafkaClientOpts, KafkaClientsOpts } from './client/options';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS, KAFKA_SERV_OPTS, KafkaServerOptions } from './server/options';
import { KafkaHandler } from './client/handler';
import { KafkaEndpoint } from './server/endpoint';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        KafkaTransportSessionFactory,
        { provide: StatusVaildator, useClass: KafkaStatusVaildator },
        { provide: RequestAdapter, useClass: KafkaRequestAdapter },
        KafkaClient,

        KafkaExecptionHandlers,
        KafkaServer
    ]
})
export class KafkaModule {
    /**
     * import Kafka mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
    static forMicroService(options: KafkaModuleOptions): ModuleWithProviders<KafkaModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(KafkaClient, [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: KAFKA_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } },
            toProvider(KafkaHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: KafkaClientOpts) => {
                    if (!opts.interceptors || !opts.interceptorsToken) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(KAFKA_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, KAFKA_CLIENT_OPTS]
            }),
            toProvider(KafkaEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: KafkaServerOptions) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, KAFKA_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? KafkaTransportSessionFactory)
        ];

        return {
            module: KafkaModule,
            providers
        }
    }
}



/**
 * Kafka Module Options.
 */
export interface KafkaModuleOptions {
    /**
     * client options.
     */
    clientOpts?: KafkaClientOpts | KafkaClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<KafkaHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<KafkaEndpoint>;
    /**
     * transport factory.
     */
    transportFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * server options
     */
    serverOpts?: KafkaServerOptions;
}

/**
 * kafka client default options.
 */
const defClientOpts = {
    interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
    filtersToken: KAFKA_CLIENT_FILTERS,
    connectOpts: {
        brokers:['localhost:9092']
    },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
} as KafkaClientOpts;

/**
 * kafka microservice default options.
 */
const defMicroOpts = {
    connectOpts: {
        brokers:['localhost:9092']
    },
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public',
        prefix: '/content'
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
    ]
} as KafkaServerOptions