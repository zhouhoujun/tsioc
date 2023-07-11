import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { PatternFormatter, StatusVaildator, createHandler } from '@tsdi/core';
import { BodyContentInterceptor, RequestAdapter, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { RedisTransportSessionFactory, RedisTransportSessionFactoryImpl } from '../transport';
import { RedisStatusVaildator } from '../status';
import { RedisRequestAdapter } from './request';
import { RedisHandler } from './handler';
import { RedisClient } from './client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS, REDIS_CLIENT_OPTS, RedisClientOpts, RedisClientsOpts } from './options';
import { RedisPatternFormatter } from '../pattern';


/**
 * Redis client default options.
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
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: RedisStatusVaildator },
        { provide: RequestAdapter, useExisting: RedisRequestAdapter },
        { provide: PatternFormatter, useExisting: RedisPatternFormatter }
    ]

} as RedisClientOpts;

/**
 * Redis Client Module
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        RedisStatusVaildator,
        RedisRequestAdapter,
        RedisPatternFormatter,
        { provide: RedisTransportSessionFactory, useClass: RedisTransportSessionFactoryImpl, asDefault: true },
        { provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: RedisHandler,
            useFactory: (injector: Injector, opts: RedisClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
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
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<RedisTransportSessionFactory>;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }
    ): ModuleWithProviders<RedisClientModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(RedisClient, [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];
        if (options.handler) {
            providers.push(toProvider(RedisHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(RedisTransportSessionFactory, options.transportFactory))
        }

        return {
            module: RedisClientModule,
            providers
        }
    }

}
