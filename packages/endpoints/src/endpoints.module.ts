import { Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, toFactory, toProvider, tokenId } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { HybirdTransport, NotImplementedExecption, Transport, TransportSessionFactory } from '@tsdi/common';
import { TransportEndpoint, createTransportEndpoint } from './TransportEndpoint';
import { Server, ServerOpts } from './Server';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { Responder } from './Responder';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';
import { Session } from './Session';
import { DuplexTransportSessionFactory } from './impl/duplex.session';
import { MiddlewareOpts, createMiddlewareEndpoint } from './middleware/middleware.endpoint';
import { HybridRouter } from './router/router.hybrid';
import { TopicTransportSessionFactory } from './impl/topic.session';
import { REGISTER_SERVICES, SERVER_MODULES, ServerModuleOpts, ServerSetupService, ServiceModuleOpts, ServiceOpts } from './SetupService';



// export interface ServerConfig {
//     /**
//      * server provdier.
//      */
//     server?: ProvdierOf<Server>;
//     /**
//      * server endpoint provider
//      */
//     endpoint?: ProvdierOf<TransportEndpoint>;
//     /**
//      * server options
//      */
//     serverOpts?: ProvdierOf<ServerOpts & MiddlewareOpts>;
//     /**
//      * custom provider with module.
//      */
//     providers?: ProviderType[];
// }

// export interface MicroServiceOpts {
//     /**
//      * microservice or not.
//      */
//     microservice: true;
//     /**
//      * microservice transport.
//      */
//     transport: Transport;
// }

// export interface HeybirdServiceOpts {
//     microservice?: false;
//     transport: HybirdTransport;
// }

// export interface ServerModuleOpts extends ServerConfig {
//     /**
//      * microservice or not.
//      */
//     microservice?: boolean;
//     /**
//      * server type.
//      */
//     serverType: Type<Server>;
//     /**
//      * server options token.
//      */
//     serverOptsToken: Token<ServerOpts & MiddlewareOpts>;
//     /**
//      * server endpoint type
//      */
//     endpointType: Type<TransportEndpoint>;
//     /**
//      * server default options.
//      */
//     defaultOpts?: ServerOpts & MiddlewareOpts;
// }

// export type ServiceModuleOpts = (ServerModuleOpts & HeybirdServiceOpts) | (ServerModuleOpts & MicroServiceOpts);

// export type ServiceOpts = (ServerConfig & HeybirdServiceOpts) | (ServerConfig & MicroServiceOpts);

// export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');


@Module({
    imports: [
        TransformModule,
        MicroServRouterModule,
        RouterModule
    ],
    providers: [
        DuplexTransportSessionFactory,
        TopicTransportSessionFactory,

        LogInterceptor,
        TransportExecptionHandlers,
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
    static registerService(options: ServiceOpts, autoBootstrap?: boolean): ModuleWithProviders<EndpointsModule>;
    /**
     * register service.
     * @param options
     * @param autoBootstrap default true 
     */
    static registerService(options: Array<ServiceOpts>, autoBootstrap?: boolean): ModuleWithProviders<EndpointsModule>;
    static registerService(options: Arrayify<ServiceOpts>, autoBootstrap = true): ModuleWithProviders<EndpointsModule> {

        const providers: ProviderType[] = autoBootstrap ? [ServerSetupService] : [];
        if (isArray(options)) {
            options.forEach(op => {
                providers.push(...createServiceProviders(op));
            })
        } else {
            providers.push(...createServiceProviders(options));
        }

        return {
            providers,
            module: EndpointsModule
        }
    }
}


function createServiceProviders(options: ServiceOpts) {
    const { transport, microservice } = options;

    const moduleOptsToken: Token<ServerModuleOpts> = getToken<any>(transport, microservice ? 'microservice_module' : 'server_module');

    const servOptsToken: Token<ServerOpts> = getToken<any>(transport, microservice ? 'microservice_opts' : 'server_opts');

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        toFactory(moduleOptsToken, options, {
            init: (options, injector) => {
                const mdopts = injector.get(SERVER_MODULES).find(r => r.transport === transport && r.microservice === microservice);
                if (!mdopts) throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice' : 'server'} has not implemented`);
                const moduleOpts = { ...mdopts, ...options } as ServiceModuleOpts & ServiceOpts;
                return moduleOpts;
            },
            onRegistered: (injector) => {
                const { serverType, server, endpointType, endpoint, serverOptsToken, microservice } = injector.get(moduleOptsToken);
                const providers = [];
                if (server) {
                    providers.push(toProvider(serverType, server));
                }

                if (endpoint) {
                    providers.push(toProvider(endpointType, options.endpoint))
                } else {
                    providers.push({
                        provide: endpointType,
                        useFactory: (injector: Injector, opts: ServerOpts) => {
                            return microservice ? createTransportEndpoint(injector, opts) : createMiddlewareEndpoint(injector, opts);
                        },
                        asDefault: true,
                        deps: [Injector, serverOptsToken]
                    })
                }

                providers.push(
                    toFactory(servOptsToken, options.serverOpts!, {
                        init: (opts: ServerOpts, injector: Injector) => {

                            const modulesOpts = injector.get(moduleOptsToken);
                            const { defaultOpts, microservice } = modulesOpts;
                            const serverOpts = {
                                backend: microservice ? MicroServRouterModule.getToken(transport as Transport) : HybridRouter,
                                ...defaultOpts,
                                ...opts,
                                routes: {
                                    ...defaultOpts?.routes,
                                    ...opts?.routes
                                },
                                providers: [...defaultOpts?.providers || EMPTY, ...opts?.providers || EMPTY]
                            };

                            modulesOpts.serverOpts = serverOpts as any;

                            if (microservice) {
                                if (serverOpts.transportOpts) {
                                    serverOpts.transportOpts.microservice = microservice;
                                } else {
                                    serverOpts.transportOpts = { microservice };
                                }
                            }

                            if (serverOpts.sessionFactory) {
                                serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory))
                            }

                            if (serverOpts.detailError) {
                                serverOpts.providers.push({
                                    provide: SHOW_DETAIL_ERROR,
                                    useValue: true
                                });
                            }

                            if (serverOpts.responder) {
                                serverOpts.providers.push(toProvider(Responder, serverOpts.responder))
                            }

                            return serverOpts as ServerOpts;
                        }
                    }),
                    ...microservice ? createMicroRouteProviders(transport as Transport, (injector) => injector.get(servOptsToken).routes || EMPTY_OBJ)
                        : createRouteProviders(injector => injector.get(servOptsToken).routes || EMPTY_OBJ)
                );

                injector.inject(providers);

            }
        }),
        { provide: REGISTER_SERVICES, useExisting: moduleOptsToken, multi: true }
    ];

    return providers
}


