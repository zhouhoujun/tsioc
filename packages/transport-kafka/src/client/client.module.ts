import { RouterModule, TransformModule, StatusVaildator, createHandler, PatternFormatter } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, RequestAdapter, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaHandler } from './handler';
import { KafkaClient } from './client';
import { KafkaTransportSessionFactory, KafkaTransportSessionFactoryImpl } from '../transport';
import { KafkaRequestAdapter } from './request';
import { KafkaStatusVaildator } from '../status';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS, KAFKA_CLIENT_OPTS, KafkaClientOpts, KafkaClientsOpts } from './options';
import { KafkaPatternFormatter } from '../pattern';



/**
 * kafka client default options.
 */
const defClientOpts = {
    interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
    filtersToken: KAFKA_CLIENT_FILTERS,
    transportOpts: {
    },
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: KafkaStatusVaildator },
        { provide: RequestAdapter, useExisting: KafkaRequestAdapter },
        { provide: PatternFormatter, useExisting: KafkaPatternFormatter }
    ]
} as KafkaClientOpts;


/**
 * Kafka client module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        KafkaStatusVaildator,
        KafkaRequestAdapter,
        KafkaPatternFormatter,
        { provide: KafkaTransportSessionFactory, useClass: KafkaTransportSessionFactoryImpl, asDefault: true },
        { provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: KafkaHandler,
            useFactory: (injector: Injector, opts: KafkaClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(KAFKA_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, KAFKA_CLIENT_OPTS]
        },
        KafkaClient
    ]
})
export class KafkaClientModule {
    /**
     * import Kafka micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: KafkaClientOpts | KafkaClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<KafkaHandler>;
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<KafkaTransportSessionFactory>;
    }): ModuleWithProviders<KafkaClientModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(KafkaClient, [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(KafkaHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(KafkaTransportSessionFactory, options.transportFactory))
        }
        return {
            module: KafkaClientModule,
            providers
        }
    }
}
