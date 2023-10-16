import { Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProviderType, Token, getToken, isArray, toFactory, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, Transport, TransportSessionFactory } from '@tsdi/common';
import { ServerOpts } from './Server';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { Responder } from './Responder';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';
import { Session } from './Session';
import { DuplexTransportSessionFactory } from './impl/duplex.session';
import { HybridRouter } from './router/router.hybrid';
import { TopicTransportSessionFactory } from './impl/topic.session';
import { REGISTER_SERVICES, SERVER_MODULES, ServerModuleOpts, ServerSetupService, ServiceModuleOpts, ServiceOpts } from './SetupService';



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
    static register(options: ServiceOpts, autoBootstrap?: boolean): ModuleWithProviders<EndpointsModule>;
    /**
     * register service.
     * @param options
     * @param autoBootstrap default true 
     */
    static register(options: Array<ServiceOpts>, autoBootstrap?: boolean): ModuleWithProviders<EndpointsModule>;
    static register(options: Arrayify<ServiceOpts>, autoBootstrap = true): ModuleWithProviders<EndpointsModule> {

        const providers: ProviderType[] = autoBootstrap ? [ServerSetupService] : [];
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
                const moduleOpts = { ...mdopts, ...options } as ServiceModuleOpts & ServiceOpts;
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
                                ...defaultOpts,
                                ...opts,
                                routes: {
                                    ...defaultOpts?.routes,
                                    ...opts?.routes
                                },
                                providers: [...defaultOpts?.providers || EMPTY, ...opts?.providers || EMPTY]
                            };

                            moduleOpts.serverOpts = serverOpts as any;

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
                ];

                injector.inject(providers);

            }
        }),
        { provide: REGISTER_SERVICES, useExisting: moduleOptsToken, multi: true }
    ];

    return providers
}


