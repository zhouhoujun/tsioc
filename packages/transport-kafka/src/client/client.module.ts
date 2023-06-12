import { RouterModule, TransformModule, TransportSessionFactory, createHandler } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, RequestAdapter, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { KafkaHandler } from './handler';
import { KafkaClient } from './client';
import { KafkaTransportSessionFactory } from '../transport';
import { KafkaRequestAdapter } from './request';
import { KafkaStatusVaildator } from '../status';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS, KAFKA_CLIENT_OPTS, KafkaClientOpts, KafkaClientsOpts } from './options';


/**
 * kafka client default options.
 */
const defClientOpts = {
    interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
    filtersToken: KAFKA_CLIENT_FILTERS,
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
} as KafkaClientOpts;


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
        { provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        { provide: TransportSessionFactory, useExisting: KafkaTransportSessionFactory, asDefault: true },
        {
            provide: KafkaHandler,
            useFactory: (injector: Injector, opts: KafkaClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken) {
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
        transportFactory?: ProvdierOf<TransportSessionFactory>;
    }): ModuleWithProviders<KafkaClientModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(KafkaClient, [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: KAFKA_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }]
        ];

        if (options.handler) {
            providers.push(toProvider(KafkaHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }
        return {
            module: KafkaClientModule,
            providers
        }
    }
}
