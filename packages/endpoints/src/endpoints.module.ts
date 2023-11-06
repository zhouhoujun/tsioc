import { Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProviderType, Token, tokenId, getToken, isArray, toFactory, toProvider, lang, isString, ArgumentExecption } from '@tsdi/ioc';
import { CanActivate, Filter, TransformModule, TypedRespond } from '@tsdi/core';
import { Decoder, Encoder, NotImplementedExecption, Transport, TransportSessionFactory } from '@tsdi/common';
import { TransportContext, TransportContextFactory } from './TransportContext';
import { ServerOpts, TRANSPORT_PACKET_STRATEGIES } from './Server';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';
import { Session } from './Session';
import { DuplexTransportSessionFactory } from './impl/duplex.session';
import { HybridRouter } from './router/router.hybrid';
import { TopicTransportSessionFactory } from './impl/topic.session';
import { TransportContextFactoryImpl } from './impl/transport.context';
import { REGISTER_SERVICES, SERVER_MODULES, ServerModuleOpts, SetupServices, ServiceModuleOpts, ServiceOpts } from './SetupServices';
import { RequestHandler } from './RequestHandler';
import { TransportTypedRespond } from './transport/typed.respond';



/**
 * Endpoint services module.
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule,
        RouterModule
    ],
    providers: [
        SetupServices,
        DuplexTransportSessionFactory,
        TopicTransportSessionFactory,

        TransportContextFactoryImpl,
        { provide: TransportContextFactory, useExisting: TransportContextFactoryImpl },

        TransportTypedRespond,
        { provide: TypedRespond, useExisting: TransportTypedRespond },

        LogInterceptor,
        // TransportExecptionHandlers,
        FinalizeFilter,
        ExecptionFinalizeFilter,
        Session
    ]
})
export class EndpointsModule {

    /**
     * register service.
     * @param options 
     * @param autoBootstrap default true 
     */
    static register(options: ServiceOpts): ModuleWithProviders<EndpointsModule>;
    /**
     * register service.
     * @param options
     * @param autoBootstrap default true 
     */
    static register(options: Array<ServiceOpts>): ModuleWithProviders<EndpointsModule>;
    static register(options: Arrayify<ServiceOpts>): ModuleWithProviders<EndpointsModule> {

        const providers: ProviderType[] = [];
        if (isArray(options)) {
            options.forEach((op, idx) => {
                providers.push(...createServiceProviders(op, idx));
            })
        } else {
            providers.push(...createServiceProviders(options, 0));
        }

        return {
            providers,
            module: EndpointsModule
        }
    }
}

/**
 * Global filters for all server
 */
export const GLOBAL_SERVER_FILTERS = tokenId<Filter<TransportContext>[]>('GLOBAL_SERVER_FILTERS');
/**
 * Global guards for all server
 */
export const GLOBAL_SERVER_GRAUDS = tokenId<CanActivate<TransportContext>>('GLOBAL_SERVER_GRAUDS');
/**
 * Global interceptors for all server
 */
export const GLOBAL_SERVER_INTERCEPTORS = tokenId<Filter<TransportContext>[]>('GLOBAL_SERVER_INTERCEPTORS');

function createServiceProviders(options: ServiceOpts, idx: number) {
    const { transport, microservice } = options;

    const moduleOptsToken: Token<ServerModuleOpts> = getToken<any>(transport, (microservice ? 'microservice_module' : 'server_module') + idx);

    const servOptsToken: Token<ServerOpts> = getToken<any>(transport, (microservice ? 'microservice_opts' : 'server_opts') + idx);

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        toFactory(moduleOptsToken, options, {
            init: (options, injector) => {
                const mdopts = injector.get(SERVER_MODULES).find(r => r.transport === transport && r.microservice === microservice);
                if (!mdopts) throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice' : 'server'} has not implemented`);
                const moduleOpts = { registerAs: servOptsToken, ...mdopts, ...options } as ServiceModuleOpts & ServiceOpts;
                return moduleOpts;
            },
            onRegistered: (injector) => {
                const moduleOpts = injector.get(moduleOptsToken);
                const { defaultOpts, microservice } = moduleOpts;

                const providers: ProviderType[] = [
                    toFactory(servOptsToken, options.serverOpts!, {
                        init: (opts: ServerOpts, injector: Injector) => {
                            const serverOpts = {
                                backend: microservice ? MicroServRouterModule.getToken(transport as Transport) : HybridRouter,
                                globalFiltersToken: GLOBAL_SERVER_FILTERS,
                                globalGuardsToken: GLOBAL_SERVER_GRAUDS,
                                globalInterceptorsToken: GLOBAL_SERVER_INTERCEPTORS,
                                ...lang.deepClone(defaultOpts),
                                ...opts,
                                routes: {
                                    ...defaultOpts?.routes,
                                    ...opts?.routes
                                },
                                providers: [...defaultOpts?.providers || EMPTY, ...opts?.providers || EMPTY]
                            } as ServerOpts & { providers: ProviderType[] };

                            if (microservice) {
                                if (serverOpts.transportOpts) {
                                    serverOpts.transportOpts.microservice = microservice;
                                } else {
                                    serverOpts.transportOpts = { microservice };
                                }
                            }

                            if (serverOpts.detailError) {
                                serverOpts.providers.push({
                                    provide: SHOW_DETAIL_ERROR,
                                    useValue: true
                                });
                            }


                            if (isArray(serverOpts.execptionHandlers)) {
                                serverOpts.providers.push(...serverOpts.execptionHandlers)
                            } else {
                                serverOpts.providers.push(serverOpts.execptionHandlers ?? TransportExecptionHandlers)
                            }

                            if (serverOpts.sessionFactory) {
                                serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory))
                            }

                            if (serverOpts.strategy) {
                                const strategy = isString(serverOpts.strategy) ? TRANSPORT_PACKET_STRATEGIES[serverOpts.strategy] : serverOpts.strategy;
                                if (!strategy) throw new ArgumentExecption('The configured transport packet strategy is empty.')
                                if (strategy.encoder) {
                                    serverOpts.providers.push(toProvider(Encoder, strategy.encoder))
                                }

                                if (strategy.decoder) {
                                    serverOpts.providers.push(toProvider(Decoder, strategy.decoder))
                                }

                                if (strategy.requestHanlder) {
                                    serverOpts.providers.push(toProvider(RequestHandler, strategy.requestHanlder))
                                }

                                if (strategy.providers) {
                                    serverOpts.providers.push(...strategy.providers)
                                }
                            }

                            return serverOpts;
                        }
                    }),
                    ...microservice ? createMicroRouteProviders(transport as Transport, (injector) => injector.get(servOptsToken).routes || EMPTY_OBJ)
                        : createRouteProviders(injector => injector.get(servOptsToken).routes || EMPTY_OBJ)
                ];

                injector.inject(providers);

            }
        }),
        { provide: REGISTER_SERVICES, useExisting: moduleOptsToken, multi: true }
    ];

    return providers
}


