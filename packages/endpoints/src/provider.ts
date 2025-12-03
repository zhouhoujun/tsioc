import {
    ArgumentException, Injector, ModuleRef,
    ProvdierOf,
    Provider, isFunction, isString, lang, toProvider, token
} from '@tsdi/ioc';
import { ConfigMissingException, TypedRespond } from '@tsdi/core';
import { isMicroTransport, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { ServiceConfig } from './server.options';
// import { ServerTransportFactory } from './transport';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, contentInterceptor, ContentInterceptor, ContentOptions, JsonInterceptor, JsonOptions, LoggerInterceptor, LoggerOptions, PayloadOptions } from './interceptors';
import { createRouteProviders, RouteOpts } from './router/router.providers';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
// import { ExceptionFinalizeFilter } from './exception.filter';
// import { FinalizeFilter } from './finalize.filter';
import { DefaultExceptionHandlers } from './exception.handlers';
// import { createRequestHandler } from './impl/request.handler';
// import { DefaultServerTransferFactory } from './impl/transfer';
import { ServiceModuleOpts, ServiceOptions } from './endpoint.options';
import { HttpStatusAdapter } from './impl/status';
import { createRequestHandler, NotImplementedException, ProtocolConfig, Protocols, RequestInterceptorLike } from '@tsdi/common';
import { getFiltersToken, getInterceptorsToken, getRouterToken, getTransfersToken } from './tokens';


/**
 * Identifies a particular kind of `Feature`.
 *
 * @publicApi
 */
export enum FeatureKind {
    Configure,
    Interceptors,
    // LegacyInterceptors,
    Logger,
    Csrf,
    Helmet,
    Cors,
    Session,
    Authenticate,
    Content,
    Json,
    Bodyparser,
    Router,
    Controller,
    Transport,
    Transfer
}


export interface Feature<Kind extends FeatureKind> {
    kind: Kind;
    providers: Provider[];
}


export type FeatureLike<Kind extends FeatureKind> = Feature<Kind> | ((config: ProtocolConfig) => Feature<Kind>);


/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(protocolOrConfig: Protocols | ProtocolConfig, ...features: FeatureLike<FeatureKind>[]): Provider[] {
    let config: ProtocolConfig;
    if (isString(protocolOrConfig)) {
        config = {
            protocol: protocolOrConfig as Protocols
        };
    } else {
        config = protocolOrConfig;
    }
    const kinds = new Map<FeatureKind, Provider[]>();
    features.forEach(f => {
        const feature = isFunction(f) ? f(config) : f;
        const pdrs = kinds.get(feature.kind);
        if (pdrs) {
            pdrs.push(...feature.providers);
        } else {
            kinds.set(feature.kind, feature.providers.slice(0));
        }
    });

    if (!kinds.has(FeatureKind.Configure)) {
        throw new ArgumentException(`messings ${config.protocol}${config.microservice ? ' microservice' : ''} service configure` + (config.name ? `, ailas with name ${config.name}` : ''));
    }


    if (!kinds.has(FeatureKind.Transport)) {
        throw new ArgumentException(`messings ${config.protocol}${config.microservice ? ' microservice' : ''} service transport` + (config.name ? `, ailas with name ${config.name}` : ''));
    }

    const providers: Provider[] = [
        BodyparserInterceptor,
        ContentInterceptor,
        JsonInterceptor,
        LoggerInterceptor
    ];
    Array.from(kinds.keys()).sort().forEach(k => {
        providers.push(...kinds.get(k)!);
    });


    return providers;
}


export function makeFeature<T extends FeatureKind>(kind: T, providers: Provider[]): Feature<T> {
    return {
        kind,
        providers
    }
}


export function withLogger(options?: LoggerOptions, filter?: boolean): FeatureLike<FeatureKind.Logger> {
    return (config) => {
        const token = filter ? getFiltersToken(config.protocol, config.name, config.microservice)
            : getInterceptorsToken(config.protocol, config.name, config.microservice)
        return makeFeature(
            FeatureKind.Logger,
            [
                {
                    provide: token,
                    useExisting: LoggerInterceptor,
                    // deps: [
                    //     { provide: LoggerOptions, useValue: options }
                    // ],
                    multi: true
                }
            ]
        );
    }
}


export function withJson(options?: JsonOptions): FeatureLike<FeatureKind.Json> {
    return (config) => {
        const token = getInterceptorsToken(config.protocol, config.name, config.microservice)
        return makeFeature(
            FeatureKind.Json,
            [
                {
                    provide: token,
                    useClass: JsonInterceptor,
                    deps: [
                        { provide: JsonOptions, useValue: options }
                    ],
                    multi: true
                }
            ]
        );
    }
}


export function withContent(options?: ContentOptions): FeatureLike<FeatureKind.Content> {
    return (config) => {
        const token = getInterceptorsToken(config.protocol, config.name, config.microservice)
        return makeFeature(
            FeatureKind.Content,
            [
                {
                    provide: token,
                    useValue: contentInterceptor(options),
                    multi: true
                }
            ]
        );
    }
}


export function withBodyparser(options?: PayloadOptions): FeatureLike<FeatureKind.Bodyparser> {
    return (config) => {
        const token = getInterceptorsToken(config.protocol, config.name, config.microservice)
        return makeFeature(
            FeatureKind.Bodyparser,
            [
                {
                    provide: token,
                    useExisting: BodyparserInterceptor,
                    // deps: [
                    //     { provide: LoggerOptions, useValue: options }
                    // ],
                    multi: true
                }
            ]
        );
    }
}


export function withRouter(options?: RouteOpts): FeatureLike<FeatureKind.Router> {
    return (config) => {
        const { protocol, name, microservice } = config;
        const token = getInterceptorsToken(protocol, name, microservice ?? options?.microservice);
        const routerToken = getRouterToken(protocol, name, microservice ?? options?.microservice);
        return makeFeature(
            FeatureKind.Router,
            [
                ...createRouteProviders(protocol, microservice, name, routerToken, options),
                {
                    provide: token,
                    useExisting: routerToken,
                    multi: true
                }
            ]
        );
    }
}


/**
 * Adds one or more functional-style client interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorFn}
 * @see {@link provideClient}
 * @publicApi
 */
export function withInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureLike<FeatureKind.Interceptors> {
    return (config) => {
        const token = getInterceptorsToken(config.protocol, config.name)
        return makeFeature(
            FeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true))
        );
    }
}


/**
 * Adds one or more functional-style client transfers interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorFn}
 * @see {@link provideClient}
 * @publicApi
 */
export function withTransfers(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureLike<FeatureKind.Transfer> {
    return (config) => {
        const token = getTransfersToken(config.protocol, config.name, config.microservice)
        return makeFeature(
            FeatureKind.Transfer,
            interceptors.map((u) => toProvider(token, u, true))
        );
    }
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
                    backend: getRouterToken(moduleOpts.transport, '', microservice),
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
                    createRouteProviders(moduleOpts.transport, microservice, undefined, undefined, serverOpts.routes),
                    { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
                ];
            }
        }

    ] as Provider[];

}


