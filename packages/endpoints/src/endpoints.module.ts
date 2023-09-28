import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, isArray, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, PatternFormatter, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { TransportEndpoint, createTransportEndpoint } from './TransportEndpoint';
import { Server, ServerOpts } from './Server';
import { MicroServRouterModule, ROUTER_PREFIX, RouterModule, createMicroRouteProviders } from './router/router.module';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { Responder } from './Responder';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';
import { Session } from './Session';
import { DuplexTransportSessionFactory } from './impl/duplex.session';
import { MiddlewareOpts, createMiddlewareEndpoint } from './middleware/middleware.endpoint';
import { ROUTES } from './router/route';
import { RouteMatcher } from './router/router';
import { HybridRouter } from './router/router.hybrid';




export interface MicroServiceModuleConfig {
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * micro service endpoint provider
     */
    endpoint?: ProvdierOf<TransportEndpoint>;
    /**
     * micro service options
     */
    serverOpts?: ServerOpts;
    /**
     * micro service default options.
     */
    defaultOpts?: ServerOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface MicroServiceModuleOpts extends MicroServiceModuleConfig {
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * micro service options token.
     */
    serverOptsToken: Token<ServerOpts>;
    /**
     * micro service endpoint type
     */
    endpointType: Type<TransportEndpoint>;
}

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
    serverOpts?: ServerOpts & MiddlewareOpts;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface ServerModuleOpts extends ServerModuleConfig {
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
}



const servs: Record<string, ServerModuleOpts> = {};

const micros: Record<string, MicroServiceModuleOpts> = {};


/**
 * server endpoints.
 */
export interface Endpoints {
    /**
     * set Server client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setServer(transport: Transport, options: ServerModuleOpts): Endpoints;
    /**
     * set microservice client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setMicroservice(transport: Transport, options: MicroServiceModuleOpts): Endpoints;
}

export const ENDPOINTS: Endpoints = {
    setServer(transport: Transport, options: ServerModuleOpts): Endpoints {
        servs[transport] = options;
        return ENDPOINTS;
    },
    setMicroservice(transport: Transport, options: MicroServiceModuleOpts): Endpoints {
        micros[transport] = options;
        return ENDPOINTS;
    }
}


@Module({
    imports: [
        TransformModule,
        MicroServRouterModule,
        RouterModule
    ],
    providers: [
        DuplexTransportSessionFactory,

        LogInterceptor,
        TransportExecptionHandlers,
        FinalizeFilter,
        ExecptionFinalizeFilter,
        Session
    ]
})
export class EndpintsModule {

    /**
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: MicroServiceModuleConfig & TransportRequired): ModuleWithProviders<EndpintsModule>;
    /**
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: Array<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<EndpintsModule>;
    static forMicroservice(options: Arrayify<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<EndpintsModule> {

        let providers: ProviderType[];
        if (isArray(options)) {
            providers = []
            options.forEach(op => {
                const opts = micros[op.transport];
                if (!opts) throw new NotImplementedExecption(op.transport + ' microservice has not implemented');
                providers.push(...createServiceProviders({ ...opts, ...op }));
            })
        } else {
            const opts = micros[options.transport];
            if (!opts) throw new NotImplementedExecption(options.transport + ' microservice has not implemented');
            providers = createServiceProviders({ ...opts, ...options });
        }

        return {
            providers,
            module: EndpintsModule
        }
    }

    /**
     * main server.
     * @param options 
     * @returns 
     */
    static forServer(options: ServerModuleConfig & TransportRequired): ModuleWithProviders<EndpintsModule> {

        const opts = micros[options.transport];
        if (!opts) throw new NotImplementedExecption(options.transport + ' Server has not implemented');
        const providers = createServProviders({ ...opts, ...options });

        return {
            providers,
            module: EndpintsModule
        }
    }
}


function createServiceProviders(options: MicroServiceModuleOpts & TransportRequired) {
    const { transport, serverType, endpointType, serverOptsToken, defaultOpts } = options;
    const serverOpts = {
        backend: MicroServRouterModule.getToken(transport),
        ...defaultOpts,
        ...options.serverOpts,
        providers: [...defaultOpts?.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
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

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        {
            provide: serverOptsToken,
            useValue: serverOpts
        },
        ...createMicroRouteProviders(transport, serverOpts.routes)
    ];

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
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, serverOptsToken]
        })
    }

    return providers
}



function createServProviders(options: ServerModuleOpts & TransportRequired) {
    const { serverType, endpointType, serverOptsToken, defaultOpts } = options;
    const serverOpts = {
        backend: HybridRouter,
        ...defaultOpts,
        ...options.serverOpts,
        providers: [...defaultOpts?.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
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

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        {
            provide: serverOptsToken,
            useValue: serverOpts
        }
    ];

    if (serverOpts.routes?.routes) {
        providers.push({
            provide: ROUTES,
            useValue: serverOpts.routes?.routes ?? []
        })
    }

    if (serverOpts.routes?.prefix) {
        providers.push({
            provide: ROUTER_PREFIX,
            useValue: serverOpts.routes?.prefix
        })
    }

    if (serverOpts.routes?.formatter) {
        providers.push(toProvider(PatternFormatter, serverOpts.routes?.formatter))
    }

    if (serverOpts.routes?.matcher) {
        providers.push(toProvider(RouteMatcher, serverOpts.routes?.matcher))
    }


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
            useFactory: (injector: Injector, opts: ServerOpts & MiddlewareOpts) => {
                if (opts.middlewares?.length || opts.middlewaresToken) {
                    return createMiddlewareEndpoint(injector, options);
                }
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, serverOptsToken]
        })
    }

    return providers
}
