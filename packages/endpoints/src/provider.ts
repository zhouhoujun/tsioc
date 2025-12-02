import {
    ArgumentException, Injector, ModuleRef,
    Provider, isString, lang, toProvider, token
} from '@tsdi/ioc';
import { ConfigMissingException, TypedRespond } from '@tsdi/core';
import { isMicroTransport, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { ServiceConfig } from './server.options';
// import { ServerTransportFactory } from './transport';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, ContentInterceptor, JsonInterceptor, LoggerInterceptor } from './interceptors';
import { createRouteProviders, getRouterToken } from './router/router.providers';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
// import { ExceptionFinalizeFilter } from './exception.filter';
// import { FinalizeFilter } from './finalize.filter';
import { DefaultExceptionHandlers } from './exception.handlers';
// import { createRequestHandler } from './impl/request.handler';
// import { DefaultServerTransferFactory } from './impl/transfer';
import { ServiceModuleOpts, ServiceOptions } from './endpoint.options';
import { HttpStatusAdapter } from './impl/status';
import { createRequestHandler, NotImplementedException } from '@tsdi/common';


/**
 * Identifies a particular kind of `ServiceFeature`.
 *
 * @publicApi
 */
export enum ServFeatureKind {
    Configure,
    Interceptors,
    LegacyInterceptors,
    Logger,
    Csrf,
    Helmet,
    Cors,
    Session,
    Authenticate,
    Content,
    Json,
    Body,
    JsonpSupport,
    Router,
    Controller,
    Transport,
}


export interface ServiceFeature<Kind extends ServFeatureKind> {
    kind: Kind;
    providers: Provider[];
}

/**
 * provide service with optioos.
 * @param service alias name
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(name: string, ...features: ServiceFeature<ServFeatureKind>[]): Provider[];
/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(...features: ServiceFeature<ServFeatureKind>[]): Provider[];
/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(nameOrFeature: string | ServiceFeature<ServFeatureKind>, ...features: ServiceFeature<ServFeatureKind>[]): Provider[] {
    let name: string;
    if (isString(nameOrFeature)) {
        name = nameOrFeature;
    } else {
        name = 'default';
        features.unshift(nameOrFeature);
    }

    const kinds = new Map(features.map(f => [f.kind, f.providers]));
    if (!kinds.has(ServFeatureKind.Configure)) {
        throw new ArgumentException('messings service configure');
    }

    const providers: Provider[] = [
        ...kinds.get(ServFeatureKind.Configure)!,
        {
            provide: name,
            useFactory: (injector: Injector) => {
                // createRequestHandler(injector)
            },
            deps: [
                Injector
            ]
        }
    ];


    return providers;
}

// /**
//  * provide service.
//  * @param options
//  * @param autoBootstrap default true 
//  */
// export function provideService(options: Array<ServiceOptions>): ModuleWithProviders<EndpointModule>;
// export function provideService(options: Arrayify<ServiceOptions>): ModuleWithProviders<EndpointModule> {

//     const providers: Provider[] = [];
//     if (isArray(options)) {
//         options.forEach((op, idx) => {
//             providers.push(createServiceProviders(op, idx));
//         })
//     } else {
//         providers.push(createServiceProviders(options, 0));
//     }

//     return {
//         providers,
//         module: EndpointModule
//     }
// }

/**
 * global registered server modules
 */
export const SERVER_MODULES = token<ServiceModuleOpts[]>('SERVER_MODULES');


function createServiceProviders(options: ServiceOptions, idx: number) {

    const microservice = isMicroTransport(options);
    return [
        options.providers ?? [],
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

                        throw new NotImplementedException(`${options.transport} ${microservice ? 'microservice' : 'server'} ${err.message ?? 'has not implemented'}`);
                    }

                }

                const moduleOpts = { ...mdopts, ...options, asDefault: null } as ServiceModuleOpts & ServiceOptions;

                const cloneOpts = lang.deepClone(moduleOpts.config, moduleOpts.defaultConfig, (n, value, deft) => {
                    if (n == 'providers' || n === 'routes') {
                        return [value, deft];
                    }
                    return value;
                });

                const serverOpts = {
                    backend: getRouterToken(moduleOpts.transport, microservice),
                    enableTypeChain: true,
                    ...cloneOpts
                } as ServiceConfig & { providers: Provider[] };

                if (!serverOpts.providers) {
                    serverOpts.providers = [];
                }

                if (!serverOpts.handlerType) throw new ConfigMissingException(`Config Missing handlerType`);
                // if (!serverOpts.transportFactory || serverOpts.transportFactory === ServerTransportFactory) throw new ConfigMissingException(`Config Missing transportFactory`);

                if (microservice) {
                    serverOpts.microservice = microservice;
                }
                if (!serverOpts.protocol) {
                    serverOpts.protocol = options.transport
                }


                if (moduleOpts.imports) {
                    serverOpts.providers.push({
                        provider: async (injector) => {
                            await injector.getInject().useAsync(moduleOpts.imports!)
                        }
                    })
                }

                // serverOpts.providers.push(toProvider(ServerTransportFactory, serverOpts.transportFactory));

                if (!serverOpts.execptionHandlers) {
                    serverOpts.execptionHandlers = [DefaultExceptionHandlers]
                }


                const providers: Provider[] = [];

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
                    moduleOpts.providers ?? [],
                    createRouteProviders(moduleOpts.transport, microservice, serverOpts.routes),
                    { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
                ];
            }
        }

    ] as Provider[];

}


