import {
    Arrayify, Injector, Module, ModuleRef, ModuleWithProviders,
    ProviderType, isArray, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { ConfigMissingExecption, TypedRespond } from '@tsdi/core';
import { isMicroTransport, NotImplementedExecption, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { ServiceConfig } from './server.options';
import { Session } from './Session';
import { ServerTransportFactory } from './transport';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, ContentInterceptor, JsonInterceptor, LoggerInterceptor } from './interceptors';
import { RouteEndpointModule, RouterModule, createRouteProviders } from './router/router.module';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
import { ExecptionFinalizeFilter } from './execption.filter';
import { DefaultExecptionHandlers } from './execption.handlers';
import { FinalizeFilter } from './finalize.filter';
import { createRequestHandler } from './impl/request.handler';
import { DefaultServerTransferFactory } from './impl/transfer';
import { ServiceModuleOpts, ServiceOptions } from './endpoint.options';
import { HttpStatusAdapter } from './impl/status';


/**
 * Endpoint services module.
 */
@Module({
    imports: [
        TransportPacketModule,
        RouteEndpointModule,
        RouterModule
    ],
    providers: [
        SetupServices,
        DefaultServerTransferFactory,
        HttpStatusAdapter,

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
    static register(options: ServiceOptions): ModuleWithProviders<EndpointModule>;
    /**
     * register service.
     * @param options
     * @param autoBootstrap default true 
     */
    static register(options: Array<ServiceOptions>): ModuleWithProviders<EndpointModule>;
    static register(options: Arrayify<ServiceOptions>): ModuleWithProviders<EndpointModule> {
        return provideService(options as any);
    }
}

/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(options: ServiceOptions): ModuleWithProviders<EndpointModule>;
/**
 * provide service.
 * @param options
 * @param autoBootstrap default true 
 */
export function provideService(options: Array<ServiceOptions>): ModuleWithProviders<EndpointModule>;
export function provideService(options: Arrayify<ServiceOptions>): ModuleWithProviders<EndpointModule> {

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


function createServiceProviders(options: ServiceOptions, idx: number) {

    const microservice = isMicroTransport(options);
    return [
        ...options.providers ?? [],
        {
            provider: async (injector) => {
                const transportName = toTransportModuleName(options.transport);
                let mdopts = injector.get(SERVER_MODULES, null)?.find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));

                if (!mdopts) {
                    try {
                        const m = await import(`@tsdi/${transportName}`);

                        const transportModuleName = transportName.charAt(0).toUpperCase() + transportName.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            mdopts = injector.get(SERVER_MODULES, []).find(r => (r.transport === options.transport || r.transport == transportName) && ((microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r)))));
                        }
                        if (!mdopts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found this transport module!')
                        }
                    } catch (err: any) {

                        throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice' : 'server'} ${err.message ?? 'has not implemented'}`);
                    }

                }

                const moduleOpts = { ...mdopts, ...options, asDefault: null } as ServiceModuleOpts & ServiceOptions;

                const cloneOpts = lang.deepClone(moduleOpts.config, moduleOpts.defaultConfig, (n, value, deft) => {
                    if (n == 'providers' || n === 'routes') {
                        return [...value, ...deft];
                    }
                    return value;
                });

                const serverOpts = {
                    backend: RouterModule.getToken(moduleOpts.transport, microservice),
                    enableTypeChain: true,
                    ...cloneOpts
                } as ServiceConfig & { providers: ProviderType[] };

                if (!serverOpts.providers) {
                    serverOpts.providers = [];
                }

                if (!serverOpts.handlerType) throw new ConfigMissingExecption(`Config Missing handlerType`);
                if (!serverOpts.transportFactory || serverOpts.transportFactory === ServerTransportFactory) throw new ConfigMissingExecption(`Config Missing transportFactory`);

                if (microservice) {
                    serverOpts.microservice = microservice;
                }
                if (!serverOpts.protocol) {
                    serverOpts.protocol = options.transport
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
                        const opts = lang.deepClone(serverOpts) as ServiceConfig;
                        return createRequestHandler(injector, opts)
                    },
                    deps: [Injector]
                });

                return [
                    ...moduleOpts.providers ?? [],
                    ...createRouteProviders(moduleOpts.transport, microservice, serverOpts.routes ?? {}),
                    { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
                ];
            }
        }

    ] as ProviderType[];

}


