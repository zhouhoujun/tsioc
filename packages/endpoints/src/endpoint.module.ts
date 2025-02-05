import {
    Arrayify, Injector, Module, ModuleRef, ModuleWithProviders,
    ProviderType, isArray, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { ConfigMissingExecption, TypedRespond } from '@tsdi/core';
import { CommonProtocols } from '@tsdi/common';
import { isMicroTransport, NotImplementedExecption, TransportPacketModule } from '@tsdi/common/transport';
import { ServerOpts } from './server.options';
import { Session } from './Session';
import { ServerTransportFactory } from './transport';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, ContentInterceptor, JsonInterceptor, LoggerInterceptor } from './interceptors';
import { MicroServRouterModule, RouteEndpointModule, RouterModule, createMicroRouteProviders, createRouteProviders } from './router/router.module';
import { MiddlewareOpts } from './middleware/middleware.endpoint';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
import { ExecptionFinalizeFilter } from './execption.filter';
import { DefaultExecptionHandlers } from './execption.handlers';
import { FinalizeFilter } from './finalize.filter';
import { createRequestHandler } from './impl/request.handler';
import { createMiddlewareEndpoint } from './impl/middleware';
import { DefaultServerTransferFactory } from './impl/transfer';
import { ServiceModuleOpts, ServiceOpts } from './endpoint.options';


/**
 * Endpoint services module.
 */
@Module({
    imports: [
        TransportPacketModule,
        RouteEndpointModule,
        MicroServRouterModule,
        RouterModule
    ],
    providers: [
        SetupServices,
        DefaultServerTransferFactory,

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
        return provideService(options as any);
    }
}

/**
 * provide service.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(options: ServiceOpts): ModuleWithProviders<EndpointModule>;
/**
 * provide service.
 * @param options
 * @param autoBootstrap default true 
 */
export function provideService(options: Array<ServiceOpts>): ModuleWithProviders<EndpointModule>;
export function provideService(options: Arrayify<ServiceOpts>): ModuleWithProviders<EndpointModule> {

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

/**
 * global registered server modules
 */
export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');


function createServiceProviders(options: ServiceOpts, idx: number) {

    const microservice = isMicroTransport(options);
    return [
        ...options.providers ?? [],
        {
            provider: async (injector) => {
                let mdopts = injector.get(SERVER_MODULES, null)?.find(r => r.transport === options.transport && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));

                if (!mdopts) {
                    try {
                        const m = await import(`@tsdi/${options.transport}`);

                        const transportModuleName = options.transport.charAt(0).toUpperCase() + options.transport.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            mdopts = injector.get(SERVER_MODULES, []).find(r => r.transport === options.transport && ((microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r)))));
                        }
                        if (!mdopts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found this transport module!')
                        }
                    } catch (err: any) {

                        throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice' : 'server'} ${err.message ?? 'has not implemented'}`);
                    }

                }

                const moduleOpts = { ...mdopts, ...options, asDefault: null } as ServiceModuleOpts & ServiceOpts;

                const transportOptions = {
                    ...moduleOpts.defaultOpts?.transportOptions,
                    ...moduleOpts.serverOpts?.transportOptions
                };

                const serverOpts = {
                    backend: microservice ? MicroServRouterModule.getToken(moduleOpts.transport) : RouterModule.getToken(moduleOpts.transport as CommonProtocols),
                    enableTypeChain: true,
                    ...moduleOpts.defaultOpts,
                    ...moduleOpts.serverOpts,
                    transportOptions,
                    routes: {
                        ...moduleOpts.defaultOpts?.routes,
                        ...moduleOpts.serverOpts?.routes
                    },
                    providers: [
                        ...moduleOpts.defaultOpts?.providers || [],
                        ...moduleOpts.serverOpts?.providers || []
                    ]
                } as ServerOpts & { providers: ProviderType[] };


                if (!serverOpts.handlerType) throw new ConfigMissingExecption(`Config Missing handlerType`);
                if (!serverOpts.transportFactory || serverOpts.transportFactory === ServerTransportFactory) throw new ConfigMissingExecption(`Config Missing transportFactory`);

                if (microservice) {
                    serverOpts.microservice = microservice;
                }


                if (moduleOpts.imports) {
                    serverOpts.providers.push({
                        provider: async (injector) => {
                            await injector.useAsync(moduleOpts.imports!)
                        }
                    })
                }

                serverOpts.providers.push(toProvider(ServerTransportFactory, serverOpts.transportFactory));

                if (!serverOpts.execptionHandlers) {
                    serverOpts.execptionHandlers = [DefaultExecptionHandlers]
                }


                const providers: ProviderType[] = [];

                if (moduleOpts.server) {
                    providers.push(toProvider(moduleOpts.serverType, moduleOpts.server));
                }

                providers.push({
                    provide: serverOpts.handlerType,
                    useFactory: (injector: Injector) => {
                        const opts = lang.deepClone(serverOpts) as ServerOpts & MiddlewareOpts;
                        return (!microservice && opts.middlewaresToken && opts.middlewares) ? createMiddlewareEndpoint(injector, opts) : createRequestHandler(injector, opts)
                    },
                    deps: [Injector]
                });

                return [
                    ...moduleOpts.providers ?? [],
                    ...microservice ? createMicroRouteProviders(moduleOpts.transport, serverOpts.routes ?? {}) : createRouteProviders(moduleOpts.transport as CommonProtocols, serverOpts.routes ?? {}),
                    { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
                ];
            }
        }

    ] as ProviderType[];

}


