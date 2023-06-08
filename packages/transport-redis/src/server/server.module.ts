import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createTransportEndpoint } from '@tsdi/core';
import { Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, StatusVaildator, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { RedisTransportSessionFactory } from '../transport';
import { RedisServer } from './server';
import { RedisStatusVaildator } from '../status';
import { RedisExecptionHandlers } from './execption.handles';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS, REDIS_SERV_OPTS, RedisServerOpts } from './options';
import { RedisEndpoint } from './endpoint';



/**
 * amqp microservice default options.
 */
const defMicroOpts = {
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public',
        prefix: '/content'
    },
    detailError: true,
    interceptorsToken: REDIS_SERV_INTERCEPTORS,
    filtersToken: REDIS_SERV_FILTERS,
    guardsToken: REDIS_SERV_GUARDS,
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
} as RedisServerOpts;


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        RedisTransportSessionFactory,
        { provide: TransportSessionFactory, useExisting: RedisTransportSessionFactory, asDefault: true },
        { provide: StatusVaildator, useClass: RedisStatusVaildator },
        { provide: REDIS_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
        {
            provide: RedisEndpoint,
            useFactory: (injector: Injector, opts: RedisServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, REDIS_SERV_OPTS]
        },
        RedisExecptionHandlers,
        RedisServer
    ]
})
export class RedisMicroServiceModule {

    /**
     * import Redis micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<RedisEndpoint>;
    
        transportFactory?: ProvdierOf<TransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: RedisServerOpts;
    }): ModuleWithProviders<RedisMicroServiceModule> {
        const providers: ProviderType[] = [
            { provide: REDIS_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(RedisEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(TransportSessionFactory, options.transportFactory))
        }

        return {
            module: RedisMicroServiceModule,
            providers
        }
    }

}

