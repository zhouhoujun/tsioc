import { PatternFormatter, StatusVaildator, createHandler } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, TransportBackend, TransportModule, RequestAdapter } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { NatsClient } from './client';
import { NatsHandler } from './handler';
import { NatsRequestAdapter } from './request';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS, NATS_CLIENT_OPTS, NatsClientOpts, NatsClientsOpts } from './options';
import { NatsTransportSessionFactory, NatsTransportSessionFactoryImpl } from '../transport';
import { NatsStatusVaildator } from '../status';
import { NatsPatternFormatter } from '../pattern';




const defClientOpts = {
    encoding: 'utf8',
    interceptorsToken: NATS_CLIENT_INTERCEPTORS,
    filtersToken: NATS_CLIENT_FILTERS,
    backend: TransportBackend,
    interceptors: [BodyContentInterceptor],
    transportOpts: {
    },
    providers: [
        { provide: StatusVaildator, useExisting: NatsStatusVaildator },
        { provide: RequestAdapter, useExisting: NatsRequestAdapter },
        { provide: PatternFormatter, useExisting: NatsPatternFormatter }
    ]
} as NatsClientOpts;


/**
 * Nats Client Module.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        NatsStatusVaildator,
        NatsRequestAdapter,
        NatsPatternFormatter,
        { provide: NatsTransportSessionFactory, useClass: NatsTransportSessionFactoryImpl, asDefault: true },
        { provide: NATS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: NatsHandler,
            useFactory: (injector: Injector, opts: NatsClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(NATS_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, NATS_CLIENT_OPTS]
        },
        NatsClient
    ]
})
export class NatsClientModule {

    /**
     * import NATS micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: NatsClientOpts | NatsClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<NatsHandler>;

        transportFactory?: ProvdierOf<NatsTransportSessionFactory>;
    }): ModuleWithProviders<NatsClientModule> {

        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(NatsClient, [{ provide: NATS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: NATS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];
        if (options.handler) {
            providers.push(toProvider(NatsHandler, options.handler))
        }
        if (options.transportFactory) {
            providers.push(toProvider(NatsTransportSessionFactory, options.transportFactory))
        }

        return {
            module: NatsClientModule,
            providers
        }
    }

}
