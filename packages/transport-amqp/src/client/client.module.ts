
import { StatusVaildator, createHandler } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, RequestAdapter, TransportBackend, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { AmqpTransportSessionFactory, AmqpTransportSessionFactoryImpl } from '../transport';
import { AmqpStatusVaildator } from '../status';
import { AmqpClient } from './client';
import { AmqpHandler } from './handler';
import { AmqpRequestAdapter } from './request';
import { AMQP_CLIENT_FILTERS, AMQP_CLIENT_INTERCEPTORS, AMQP_CLIENT_OPTS, AmqpClientOpts, AmqpClientsOpts } from './options';





/**
 * amqp client default options.
 */
const defClientOpts = {
    interceptorsToken: AMQP_CLIENT_INTERCEPTORS,
    filtersToken: AMQP_CLIENT_FILTERS,
    connectOpts: 'amqp://localhost',
    transportOpts: {
        delimiter: '#',
        maxSize: 10 * 1024 * 1024,
        queue: 'amqp.queue',
        persistent: false,
        noAssert: false,
        queueOpts: {},
        prefetchCount: 0
    },
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: AmqpStatusVaildator },
        { provide: RequestAdapter, useExisting: AmqpRequestAdapter }
    ]
} as AmqpClientOpts;

/**
 * Amqp Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        AmqpStatusVaildator,
        AmqpRequestAdapter,
        { provide: AmqpTransportSessionFactory, useClass: AmqpTransportSessionFactoryImpl, asDefault: true },
        { provide: AMQP_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: AmqpHandler,
            useFactory: (injector: Injector, opts: AmqpClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(AMQP_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            deps: [Injector, AMQP_CLIENT_OPTS]
        },
        AmqpClient
    ]
})
export class AmqpClientModule {
    /**
     * import Amqp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: AmqpClientOpts | AmqpClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<AmqpHandler>;
        /**
         * transport factory.
         */
        transportFactory?: ProvdierOf<AmqpTransportSessionFactory>;
    }): ModuleWithProviders<AmqpClientModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(AmqpClient, [{ provide: AMQP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: AMQP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(AmqpHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(AmqpTransportSessionFactory, options.transportFactory))
        }
        return {
            module: AmqpClientModule,
            providers
        }
    }
}
