
import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, TransportSessionFactory, createHandler, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, Bodyparser, Content, ExecptionFinalizeFilter, Json, LogInterceptor, ServerFinalizeFilter, Session, TransportBackend, TransportModule } from '@tsdi/transport';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';
import { AMQP_SERV_FILTERS, AMQP_SERV_INTERCEPTORS, AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './server/options';
import { AMQP_CLIENT_FILTERS, AMQP_CLIENT_INTERCEPTORS, AMQP_CLIENT_OPTS, AmqpClientOpts, AmqpClientsOpts } from './client/options';
import { AmqpHandler } from './client/handler';
import { AmqpEndpoint } from './server/endpoint';
import { AmqpTransportSessionFactory } from './transport';
import { AmqpPathInterceptor } from './client/path';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        AmqpClient,
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
                    return createHandler(injector, { ...defClientOpts, ...opts });
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
    interceptors: [AmqpPathInterceptor, BodyContentInterceptor],
    filtersToken: AMQP_CLIENT_FILTERS,
    backend: TransportBackend

} as AmqpClientOpts;

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
    interceptorsToken: AMQP_SERV_INTERCEPTORS,
    filtersToken: AMQP_SERV_FILTERS,
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