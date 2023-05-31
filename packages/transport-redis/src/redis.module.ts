import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createTransportEndpoint } from '@tsdi/core';
import { BodyContentInterceptor, Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, RequestAdapter, ServerFinalizeFilter, Session, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { RedisTransportSessionFactory } from './transport';
import { RedisRequestAdapter } from './client/request';
import { RedisClient } from './client/client';
import { RedisServer } from './server/server';
import { RedisStatusVaildator } from './status';
import { RedisExecptionHandlers } from './server/execption-filter';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS, REDIS_CLIENT_OPTS, RedisClientOpts, RedisClientsOpts } from './client/options';
import { REDIS_SERV_FILTERS, REDIS_SERV_INTERCEPTORS, REDIS_SERV_OPTS, RedisServerOpts } from './server/options';
import { RedisHandler } from './client/handler';
import { RedisEndpoint } from './server/endpoint';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        RedisTransportSessionFactory,
        { provide: StatusVaildator, useClass: RedisStatusVaildator },
        { provide: RequestAdapter, useClass: RedisRequestAdapter },
        RedisClient,

        RedisExecptionHandlers,
        RedisServer
    ]
})
export class RedisModule {

    /**
     * import Redis mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
    static forMicroService(options: RedisModuleOptions): ModuleWithProviders<RedisModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(RedisClient, [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: REDIS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: REDIS_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } },
            toProvider(RedisHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: RedisClientOpts) => {
                    if (!opts.interceptors || !opts.interceptorsToken) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(REDIS_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, REDIS_CLIENT_OPTS]
            }),
            toProvider(RedisEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: RedisServerOpts) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, REDIS_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? RedisTransportSessionFactory)
        ];

        return {
            module: RedisModule,
            providers
        }
    }

}


export interface RedisModuleOptions {

    /**
     * client options.
     */
    clientOpts?: RedisClientOpts | RedisClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<RedisHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<RedisEndpoint>;

    transportFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * server options
     */
    serverOpts?: RedisServerOpts;
}

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

/**
 * amqp microservice default options.
 */
const defMicroOpts = {
    autoListen: true,
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024
    },
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: REDIS_SERV_INTERCEPTORS,
    filtersToken: REDIS_SERV_FILTERS,
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
} as RedisServerOpts