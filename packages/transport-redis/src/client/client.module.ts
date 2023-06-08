import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createTransportEndpoint } from '@tsdi/core';
import { BodyContentInterceptor, Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, RequestAdapter, ServerFinalizeFilter, Session, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { RedisTransportSessionFactory } from '../transport';
import { RedisStatusVaildator } from '../status';
import { RedisRequestAdapter } from './request';
import { RedisHandler } from './handler';
import { RedisClient } from './client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS, REDIS_CLIENT_OPTS, RedisClientOpts, RedisClientsOpts } from './options';


/**
 * amqp client default options.
 */
const defClientOpts = {
    interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
    },
    retryAttempts: 3,
    interceptors: [BodyContentInterceptor],
    filtersToken: REDIS_CLIENT_FILTERS,
    backend: TransportBackend

} as RedisClientOpts;


@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        RedisTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: RedisTransportSessionFactory, asDefault: true },
        { provide: StatusVaildator, useClass: RedisStatusVaildator },
        { provide: RequestAdapter, useClass: RedisRequestAdapter },
        { provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: RedisHandler,
            useFactory: (injector: Injector, opts: RedisClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(REDIS_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, REDIS_CLIENT_OPTS]
        },
        RedisClient

    ]
})
export class RedisClientModule {

    /**
     * import Redis micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {

        /**
         * client options.
         */
        clientOpts?: RedisClientOpts | RedisClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<RedisHandler>;
    
        transportFactory?: ProvdierOf<TransportSessionFactory>;
    }
    ): ModuleWithProviders<RedisClientModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(RedisClient, [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }]
        ];
        if (options.handler) {
            providers.push(toProvider(RedisHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }

        return {
            module: RedisClientModule,
            providers
        }
    }

}
