import {
    Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProviderType, Token,
    tokenId, getToken, isArray, toFactory, toProvider, lang
} from '@tsdi/ioc';
import { CanActivate, Filter, TransformModule, TypedRespond } from '@tsdi/core';
import { NotImplementedExecption, Transport } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { ServerOpts } from './Server';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { Session } from './Session';
import { HybridRouter } from './router/router.hybrid';
import { REGISTER_SERVICES, SERVER_MODULES, ServerModuleOpts, SetupServices, ServiceModuleOpts, ServiceOpts } from './SetupServices';
import { EndpointTypedRespond } from './typed.respond';
import { LoggerInterceptor, JsonInterceptor, ContentInterceptor, BodyparserInterceptor } from './interceptors';
import { ServerTransportSessionFactory } from './transport.session';
import { ClientDuplexTransportSessionFactory, DuplexTransportSessionFactory } from './impl/duplex.session';


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
        ClientDuplexTransportSessionFactory,
        DuplexTransportSessionFactory,
        // TopicTransportSessionFactory,

        { provide: TypedRespond, useClass: EndpointTypedRespond, asDefault: true },

        LoggerInterceptor,
        JsonInterceptor,
        ContentInterceptor,
        BodyparserInterceptor,

        FinalizeFilter,
        ExecptionFinalizeFilter,
        Session
    ]
})
export class EndpointModule {

    /**
     * register service.
     * @param options 
     * @param autoBootstrap default true 
     */
    static register(options: ServiceOpts): ModuleWithProviders<EndpointModule>;
    /**
     * register service.
     * @param options
     * @param autoBootstrap default true 
     */
    static register(options: Array<ServiceOpts>): ModuleWithProviders<EndpointModule>;
    static register(options: Arrayify<ServiceOpts>): ModuleWithProviders<EndpointModule> {

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
            module: EndpointModule
        }
    }
}

/**
 * Global filters for all server
 */
export const GLOBAL_SERVER_FILTERS = tokenId<Filter<RequestContext>[]>('GLOBAL_SERVER_FILTERS');
/**
 * Global guards for all server
 */
export const GLOBAL_SERVER_GRAUDS = tokenId<CanActivate<RequestContext>>('GLOBAL_SERVER_GRAUDS');
/**
 * Global interceptors for all server
 */
export const GLOBAL_SERVER_INTERCEPTORS = tokenId<Filter<RequestContext>[]>('GLOBAL_SERVER_INTERCEPTORS');

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


                            if (isArray(serverOpts.execptionHandlers)) {
                                serverOpts.providers.push(...serverOpts.execptionHandlers)
                            }

                            if (serverOpts.sessionFactory) {
                                serverOpts.providers.push(toProvider(ServerTransportSessionFactory, serverOpts.sessionFactory))
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


