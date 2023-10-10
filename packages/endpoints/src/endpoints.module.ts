import { Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, toFactory, toProvider, tokenId } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { HeybirdRequired, NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
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



export interface ServerModuleConfig {
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TransportEndpoint>;
    /**
     * server options
     */
    serverOpts?: ProvdierOf<ServerOpts & MiddlewareOpts>;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface ServerModuleOpts extends ServerModuleConfig, TransportRequired {
    /**
     * microservice or not.
     */
    microservice?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server options token.
     */
    serverOptsToken: Token<ServerOpts & MiddlewareOpts>;
    /**
     * server endpoint type
     */
    endpointType: Type<TransportEndpoint>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts & MiddlewareOpts;
}


export const SERVER_MODULES = tokenId<ServerModuleOpts[]>('SERVER_MODULES');


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
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: ServerModuleConfig & TransportRequired): ModuleWithProviders<EndpointsModule>;
    /**
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: Array<ServerModuleConfig & TransportRequired>): ModuleWithProviders<EndpointsModule>;
    static forMicroservice(options: Arrayify<ServerModuleConfig & TransportRequired>): ModuleWithProviders<EndpointsModule> {

        let providers: ProviderType[];
        if (isArray(options)) {
            providers = []
            options.forEach(op => {
                providers.push(...createServiceProviders(op, true));
            })
        } else {
            providers = createServiceProviders(options, true);
        }

        return {
            providers,
            module: EndpointsModule
        }
    }

    /**
     * main server.
     * @param options 
     * @returns 
     */
    static forServer(options: ServerModuleConfig & HeybirdRequired): ModuleWithProviders<EndpointsModule> {
        const providers = createServiceProviders(options);
        return {
            providers,
            module: EndpointsModule
        }
    }
}


function createServiceProviders(options: ServerModuleConfig & { transport: string }, microservice?: boolean) {
    const { transport } = options;

    const moduleOptsToken: Token<ServerModuleOpts> = getToken<any>(transport, 'server_module');


    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        toFactory(moduleOptsToken, options, {
            init: (options, injector) => {
                const opts = injector.get(SERVER_MODULES).find(r => r.transport === transport && r.microservice === microservice);
                if (!opts) throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice' : 'server'} has not implemented`);
                return { ...opts, ...options } as ServerModuleOpts;
            },
            onRegistered: (injector) => {
                const { serverType, endpointType, serverOptsToken, microservice } = injector.get(moduleOptsToken);
                const providers = [];
                if (options.server) {
                    providers.push(toProvider(serverType, options.server));
                } else if (serverType) {
                    providers.push(serverType);
                }

                if (options.endpoint) {
                    providers.push(toProvider(endpointType, options.endpoint))
                } else {
                    providers.push({
                        provide: endpointType,
                        useFactory: (injector: Injector, opts: ServerOpts) => {
                            return microservice ? createTransportEndpoint(injector, opts) : createMiddlewareEndpoint(injector, options);
                        },
                        asDefault: true,
                        deps: [Injector, serverOptsToken]
                    })
                }

                providers.push(
                    toFactory(serverOptsToken, options.serverOpts!, {
                        init: (opts: ServerOpts, injector: Injector) => {

                            const { defaultOpts, microservice } = injector.get(moduleOptsToken);
                            const serverOpts = {
                                backend: microservice ? MicroServRouterModule.getToken(transport as Transport) : HybridRouter,
                                ...defaultOpts,
                                ...opts,
                                providers: [...defaultOpts?.providers || EMPTY, ...opts?.providers || EMPTY]
                            };

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
                    ...microservice ? createMicroRouteProviders(transport as Transport, (injector) => injector.get(serverOptsToken).routes || EMPTY_OBJ)
                        : createRouteProviders(injector => injector.get(serverOptsToken).routes || EMPTY_OBJ)
                );

                injector.inject(providers);

            }
        })
    ];

    return providers
}


