
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, RequestAdapter, ServerFinalizeFilter, Session, StatusVaildator, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { AmqpTransportSessionFactory } from './transport';
import { AmqpStatusVaildator } from './status';
import { AmqpClient } from './client/client';
import { AmqpHandler } from './client/handler';
import { AmqpRequestAdapter } from './client/request';
import { AMQP_CLIENT_FILTERS, AMQP_CLIENT_INTERCEPTORS, AMQP_CLIENT_OPTS, AmqpClientOpts, AmqpClientsOpts } from './client/options';
import { AmqpServer } from './server/server';
import { AmqpEndpoint } from './server/endpoint';
import { AmqpExecptionHandlers } from './server/execption.handles';
import { AMQP_SERV_FILTERS, AMQP_SERV_GUARDS, AMQP_SERV_INTERCEPTORS, AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './server/options';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        AmqpTransportSessionFactory,
        { provide: StatusVaildator, useClass: AmqpStatusVaildator },
        { provide: RequestAdapter, useClass: AmqpRequestAdapter },
        AmqpClient,

        AmqpExecptionHandlers,
        AmqpServer
    ]
})
export class AmqpModule {
    /**
     * import Amqp mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
    static forMicroService(options: AmqpModuleOptions): ModuleWithProviders<AmqpModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(AmqpClient, [{ provide: AMQP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: AMQP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: AMQP_SERV_OPTS, useValue: { ...defMicroOpts, ...options.serverOpts } },
            toProvider(AmqpHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: AmqpClientOpts) => {
                    if (!opts.interceptors || !opts.interceptorsToken) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(AMQP_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, AMQP_CLIENT_OPTS]
            }),
            toProvider(AmqpEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: AmqpMicroServiceOpts) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, AMQP_SERV_OPTS]
            }),
            toProvider(TransportSessionFactory, options.transportFactory ?? AmqpTransportSessionFactory)
        ];

        return {
            module: AmqpModule,
            providers
        }
    }
}

/**
 * Amqp Module Options.
 */
export interface AmqpModuleOptions {
    /**
     * client options.
     */
    clientOpts?: AmqpClientOpts | AmqpClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<AmqpHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<AmqpEndpoint>;
    /**
     * transport factory.
     */
    transportFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * server options
     */
    serverOpts?: AmqpMicroServiceOpts;
}

/**
 * amqp client default options.
 */
const defClientOpts = {
    interceptorsToken: AMQP_CLIENT_INTERCEPTORS,
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
    },
    interceptors: [BodyContentInterceptor],
    filtersToken: AMQP_CLIENT_FILTERS,
    backend: TransportBackend,
    queue: 'amqp.queue',
    persistent: false,
    noAssert: false,
    queueOpts: {},
    prefetchCount: 0
} as AmqpClientOpts;

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
    interceptorsToken: AMQP_SERV_INTERCEPTORS,
    filtersToken: AMQP_SERV_FILTERS,
    guardsToken: AMQP_SERV_GUARDS,
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
} as AmqpMicroServiceOpts