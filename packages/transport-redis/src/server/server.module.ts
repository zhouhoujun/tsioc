import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, MicroServRouterModule, TransformModule, StatusVaildator, createTransportEndpoint } from '@tsdi/core';
import { Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { RedisTransportSessionFactory, RedisTransportSessionFactoryImpl } from '../transport';
import { RedisServer } from './server';
import { RedisStatusVaildator } from '../status';
import { RedisExecptionHandlers } from './execption.handles';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS, REDIS_SERV_OPTS, RedisServerOpts } from './options';
import { RedisEndpoint } from './endpoint';
import { RedisPatternFormatter } from '../pattern';



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
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: REDIS_SERV_INTERCEPTORS,
    filtersToken: REDIS_SERV_FILTERS,
    guardsToken: REDIS_SERV_GUARDS,
    backend: MicroServRouterModule.getToken('redis'),
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
        { provide: StatusVaildator, useExisting: RedisStatusVaildator }
    ]
} as RedisServerOpts;


@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('redis', {
            formatter: RedisPatternFormatter,
        }),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        RedisStatusVaildator,
        RedisPatternFormatter,
        { provide: RedisTransportSessionFactory, useClass: RedisTransportSessionFactoryImpl, asDefault: true },
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
export class RedisMicroServModule {

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

        transportFactory?: ProvdierOf<RedisTransportSessionFactory>;
        /**
         * server options
         */
        serverOpts?: RedisServerOpts;
    }): ModuleWithProviders<RedisMicroServModule> {
        const providers: ProviderType[] = [
            {
                provide: REDIS_SERV_OPTS,
                useValue: {
                    ...defMicroOpts,
                    ...options.serverOpts,
                    providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(RedisEndpoint, options.endpoint))
        }
        if (options.transportFactory) {
            providers.push(toProvider(RedisTransportSessionFactory, options.transportFactory))
        }

        return {
            module: RedisMicroServModule,
            providers
        }
    }

}

