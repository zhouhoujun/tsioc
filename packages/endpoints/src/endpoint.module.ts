import {
    Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProviderType,
    tokenId, isArray, toProvider, lang, ProvdierOf, Type
} from '@tsdi/ioc';
import { CanActivate, Filter, InvocationOptions, TransformModule, TypedRespond } from '@tsdi/core';
import { HybirdTransport, NotImplementedExecption, Transport } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { Server, ServerOpts } from './Server';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { Session } from './Session';
import { HybridRouter } from './router/router.hybrid';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
import { EndpointTypedRespond } from './typed.respond';
import { LoggerInterceptor, JsonInterceptor, ContentInterceptor, BodyparserInterceptor } from './interceptors';
import { TransportSessionFactory } from './transport.session';
import { DuplexTransportSessionFactory } from './impl/duplex.session';
import { MiddlewareOpts, createMiddlewareEndpoint } from './middleware/middleware.endpoint';
import { EndpointHandler, createEndpoint } from './EndpointHandler';





/**
 * server config.
 */
export interface ServerConfig {
    /**
     * auto bootstrap or not. default true.
     */
    bootstrap?: boolean;
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * start.
     */
    start?: InvocationOptions;
    /**
     * server options
     */
    serverOpts?: ServerOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

/**
 * heybird options.
 */
export interface HeybirdOpts {
    /**
    * heybird or not.
    */
    heybird?: boolean | HybirdTransport;
}

/**
 * microservice options.
 */
export interface MicroServiceOpts {
    /**
     * microservice or not.
     */
    microservice: true;
    /**
     * microservice transport.
     */
    transport: Transport;
    /**
     * server options
     */
    serverOpts?: ServerOpts & HeybirdOpts;
}

export interface HeybirdServiceOpts {
    microservice?: false;
    transport: HybirdTransport;
    /**
     * server options
     */
    serverOpts?: ServerOpts & MiddlewareOpts;

}

export type ServiceOpts = (ServerConfig & HeybirdServiceOpts) | (ServerConfig & MicroServiceOpts);


/**
 * server module options.
 */
export interface ServerModuleOpts extends ServerConfig {
    /**
     * is microservice or not.
     */
    microservice?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server endpoint handler type
     */
    handlerType: Type<EndpointHandler>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
}
export type ServiceModuleOpts = (ServerModuleOpts & HeybirdServiceOpts) | (ServerModuleOpts & MicroServiceOpts);

/**
 * global registered server modules
 */
export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');

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


    return [
        ...options.providers ?? EMPTY,
        {
            provider(injector) {
                const mdopts = injector.get(SERVER_MODULES).find(r => r.transport === options.transport && r.microservice == options.microservice);
                if (!mdopts) throw new NotImplementedExecption(`${options.transport} ${options.microservice ? 'microservice' : 'server'} has not implemented`);
                const moduleOpts = { ...mdopts, ...options } as ServiceModuleOpts & ServiceOpts;

                const serverOpts = {
                    backend: moduleOpts.microservice ? MicroServRouterModule.getToken(moduleOpts.transport as Transport) : HybridRouter,
                    globalFiltersToken: GLOBAL_SERVER_FILTERS,
                    globalGuardsToken: GLOBAL_SERVER_GRAUDS,
                    globalInterceptorsToken: GLOBAL_SERVER_INTERCEPTORS,
                    ...moduleOpts.defaultOpts,
                    ...moduleOpts.serverOpts,
                    routes: {
                        ...moduleOpts.defaultOpts?.routes,
                        ...moduleOpts.serverOpts?.routes
                    },
                    providers: [...moduleOpts.defaultOpts?.providers || EMPTY, ...moduleOpts.serverOpts?.providers || EMPTY]
                } as ServerOpts & { providers: ProviderType[] };

                if (moduleOpts.microservice) {
                    serverOpts.microservice = moduleOpts.microservice;
                }

                if (isArray(serverOpts.execptionHandlers)) {
                    serverOpts.providers.push(...serverOpts.execptionHandlers)
                }

                if (serverOpts.sessionFactory) {
                    serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory))
                }


                const providers: ProviderType[] = [];

                if (moduleOpts.server) {
                    providers.push(toProvider(moduleOpts.serverType, moduleOpts.server));
                }

                providers.push({
                    provide: moduleOpts.handlerType,
                    useFactory: (injector: Injector) => {
                        const opts = lang.deepClone(serverOpts) as ServerOpts & MiddlewareOpts;
                        return (!moduleOpts.microservice && opts.middlewaresToken && opts.middlewares) ? createMiddlewareEndpoint(injector, opts) : createEndpoint(injector, opts)
                    },
                    deps: [Injector]
                });

                return [
                    ...moduleOpts.microservice ? createMicroRouteProviders(moduleOpts.transport as Transport, serverOpts.routes || EMPTY_OBJ) : createRouteProviders(serverOpts.routes || EMPTY_OBJ),
                    { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
                ];
            }
        }

    ] as ProviderType[];

}

