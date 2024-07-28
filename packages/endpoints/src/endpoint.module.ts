import {
    Arrayify, EMPTY, EMPTY_OBJ, Injector, Module, ModuleRef, ModuleType, ModuleWithProviders,
    ProvdierOf, ProviderType, Type, isArray, isNil, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { InvocationOptions, TransformModule, TypedRespond } from '@tsdi/core';
import { HybirdTransport, MessageFactory, Transport } from '@tsdi/common';
import {
    IncomingFactory, MessageReader, MessageWriter, NotImplementedExecption, OutgoingFactory,
    SocketMessageReader, SocketMessageWriter, StatusAdapter, TransportPacketModule
} from '@tsdi/common/transport';
import { RequestContextFactory } from './RequestContext';
import { Server, ServerOpts } from './Server';
import { Session } from './Session';
import { TransportSessionFactory } from './transport.session';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, ContentInterceptor, JsonInterceptor, LoggerInterceptor } from './interceptors';
import { MicroServRouterModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { MiddlewareOpts } from './middleware/middleware.endpoint';
import { HybridRouter } from './router/router.hybrid';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
import { ServerEndpointCodingsHanlders } from './codings/codings.handlers';
import { ExecptionFinalizeFilter } from './execption.filter';
import { DefaultExecptionHandlers } from './execption.handlers';
import { FinalizeFilter } from './finalize.filter';
import { createRequestHandler } from './impl/request.handler';
import { DefaultTransportSessionFactory } from './impl/default.session';
import { RequestContextFactoryImpl } from './impl/request.context';
import { createMiddlewareEndpoint } from './impl/middleware';
import { RequestHandler } from './RequestHandler';


/**
 * Endpoint services module.
 */
@Module({
    imports: [
        TransformModule,
        TransportPacketModule,
        MicroServRouterModule,
        RouterModule
    ],
    providers: [
        SetupServices,
        DefaultTransportSessionFactory,
        ServerEndpointCodingsHanlders,

        { provide: TypedRespond, useClass: EndpointTypedRespond, asDefault: true },
        { provide: RequestContextFactory, useClass: RequestContextFactoryImpl, asDefault: true },

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
     * imports modules
     */
    imports?: ModuleType[];
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
    serverOpts?: ServerOpts & HeybirdOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface HeybirdServiceOpts {
    /**
     * microservice or not.
     */
    microservice?: false;
    transport: HybirdTransport;
    /**
     * server options
     */
    serverOpts?: ServerOpts & MiddlewareOpts;
    /**
     * imports modules
     */
    imports?: ModuleType[];
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
     * custom provider with module.
     */
    providers?: ProviderType[];

}

export type ServiceOpts = HeybirdServiceOpts | MicroServiceOpts;


export interface ServerModuleOpts extends HeybirdServiceOpts {
    /**
     * as default service.
     */
    asDefault?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server request handler type
     */
    handlerType: Type<RequestHandler>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts & MiddlewareOpts;
}

export interface MicroServerModuleOpts extends MicroServiceOpts {
    /**
     * as default service.
     */
    asDefault?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server request handler type
     */
    handlerType: Type<RequestHandler>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
}



export type ServiceModuleOpts = MicroServerModuleOpts | ServerModuleOpts;

/**
 * global registered server modules
 */
export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');


function createServiceProviders(options: ServiceOpts, idx: number) {


    return [
        ...options.providers ?? EMPTY,
        {
            provider: async (injector) => {
                let mdopts = injector.get(SERVER_MODULES, EMPTY).find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));

                if (!mdopts) {
                    try {
                        const m = await import(`@tsdi/${options.transport}`);

                        const transportModuleName = options.transport.charAt(0).toUpperCase() + options.transport.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            mdopts = injector.get(SERVER_MODULES, EMPTY).find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));
                        }
                        if (!mdopts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found this transport module!')
                        }
                    } catch (err: any) {

                        throw new NotImplementedExecption(`${options.transport} ${options.microservice ? 'microservice' : 'server'} ${err.message ?? 'has not implemented'}`);
                    }

                }

                const moduleOpts = { ...mdopts, ...options, asDefault: null } as ServiceModuleOpts & ServiceOpts;

                const serverOpts = {
                    backend: moduleOpts.microservice ? MicroServRouterModule.getToken(moduleOpts.transport as Transport) : HybridRouter,
                    ...moduleOpts.defaultOpts,
                    ...moduleOpts.serverOpts,
                    routes: {
                        ...moduleOpts.defaultOpts?.routes,
                        ...moduleOpts.serverOpts?.routes
                    },
                    providers: [
                        ...moduleOpts.defaultOpts?.providers || EMPTY,
                        ...moduleOpts.serverOpts?.providers || EMPTY
                    ]
                } as ServerOpts & { providers: ProviderType[] };

                if (moduleOpts.microservice) {
                    serverOpts.microservice = moduleOpts.microservice;
                }

                serverOpts.transportOpts = {
                    name: `${serverOpts.microservice ? ' microservice' : ''}`,
                    subfix: serverOpts.microservice ? '_micro' : '',
                    transport: moduleOpts.transport,
                    timeout: serverOpts.timeout,
                    microservice: serverOpts.microservice,
                    ...moduleOpts.defaultOpts?.transportOpts,
                    ...moduleOpts.serverOpts?.transportOpts,
                    client: false
                };




                if (moduleOpts.imports) {
                    serverOpts.providers.push({
                        provider: async (injector) => {
                            await injector.useAsync(moduleOpts.imports!)
                        }
                    })
                }

                if (serverOpts.statusAdapter) {
                    serverOpts.providers.push(toProvider(StatusAdapter, serverOpts.statusAdapter))
                }

                if (!serverOpts.execptionHandlers) {
                    serverOpts.execptionHandlers = [DefaultExecptionHandlers]
                }

                if (serverOpts.incomingFactory) {
                    serverOpts.providers.push(toProvider(IncomingFactory, serverOpts.incomingFactory));
                }
                if (serverOpts.outgoingFactory) {
                    serverOpts.providers.push(toProvider(OutgoingFactory, serverOpts.outgoingFactory));
                }

                if (serverOpts.messageFactory) {
                    serverOpts.providers.push(toProvider(MessageFactory, serverOpts.messageFactory));
                }
                serverOpts.providers.push(toProvider(MessageReader, serverOpts.messageReader ?? SocketMessageReader));
                serverOpts.providers.push(toProvider(MessageWriter, serverOpts.messageWriter ?? SocketMessageWriter));


                if (serverOpts.sessionFactory !== TransportSessionFactory) {
                    serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory ?? DefaultTransportSessionFactory))
                }


                const providers: ProviderType[] = [];

                if (moduleOpts.server) {
                    providers.push(toProvider(moduleOpts.serverType, moduleOpts.server));
                }

                providers.push({
                    provide: moduleOpts.handlerType,
                    useFactory: (injector: Injector) => {
                        const opts = lang.deepClone(serverOpts) as ServerOpts & MiddlewareOpts;
                        return (!moduleOpts.microservice && opts.middlewaresToken && opts.middlewares) ? createMiddlewareEndpoint(injector, opts) : createRequestHandler(injector, opts)
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


