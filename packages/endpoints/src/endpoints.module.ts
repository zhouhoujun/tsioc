import { Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, isArray, toFactory, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
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
    serverOpts?: ProvdierOf<ServerOpts>;
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
    /**
     * micro service default options.
     */
    defaultOpts?: ServerOpts;
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
    serverOpts?: ProvdierOf<ServerOpts & MiddlewareOpts>;
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
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts & MiddlewareOpts;
}



const servs: Record<string, ServerModuleOpts> = {};
const micros: Record<string, MicroServiceModuleOpts> = {};


/**
 * server endpoints.
 */
export interface Endpoints {
    /**
     * register Server implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    registerServer(transport: Transport, options: ServerModuleOpts): Endpoints;
    /**
     * register microservice implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    registerMicroservice(transport: Transport, options: MicroServiceModuleOpts): Endpoints;
}

export const ENDPOINTS: Endpoints = {
    registerServer(transport: Transport, options: ServerModuleOpts): Endpoints {
        servs[transport] = options;
        return ENDPOINTS;
    },
    registerMicroservice(transport: Transport, options: MicroServiceModuleOpts): Endpoints {
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
export class EndpointsModule {

    /**
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: MicroServiceModuleConfig & TransportRequired): ModuleWithProviders<EndpointsModule>;
    /**
     * for microservice endpoint.
     * @param options 
     */
    static forMicroservice(options: Array<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<EndpointsModule>;
    static forMicroservice(options: Arrayify<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<EndpointsModule> {

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
            module: EndpointsModule
        }
    }

    /**
     * main server.
     * @param options 
     * @returns 
     */
    static forServer(options: ServerModuleConfig & TransportRequired): ModuleWithProviders<EndpointsModule> {

        const opts = servs[options.transport];
        if (!opts) throw new NotImplementedExecption(options.transport + ' Server has not implemented');
        const providers = createServProviders({ ...opts, ...options });

        return {
            providers,
            module: EndpointsModule
        }
    }
}


function createServiceProviders(options: MicroServiceModuleOpts & TransportRequired) {
    const { transport, serverType, endpointType, serverOptsToken, defaultOpts } = options;

    const init = (opts: ServerOpts) => {
        const serverOpts = {
            backend: MicroServRouterModule.getToken(transport),
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

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        toFactory(serverOptsToken, options.serverOpts!, init),
        ...createMicroRouteProviders(transport, (injector) => injector.get(serverOptsToken).routes || EMPTY_OBJ)
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
    const init = (opts: ServerOpts) => {
        const serverOpts = {
            backend: HybridRouter,
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

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        toFactory(serverOptsToken, options.serverOpts!, init),
        ...createRouteProviders(injector => injector.get(serverOptsToken).routes || EMPTY_OBJ),
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
