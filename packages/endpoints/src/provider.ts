import { ArgumentException, ProvdierOf, Provider, Type, isArray, isFunction, toProvider } from '@tsdi/ioc';
import { EndpointTypedRespond } from './typed.respond';
import { BodyparserInterceptor, ContentInterceptor, ContentOptions, JsonInterceptor, JsonOptions, LoggerInterceptor, LoggerOptions, PayloadOptions, ResponseStatusFormater, SessionInterceptor } from './interceptors';
import { createRouteProviders, RouteOpts } from './router/router.providers';
import { REGISTER_SERVICES, SetupServices } from './SetupServices';
import { matchTransport, TransportConfig, RequestInterceptorLike } from '@tsdi/common';
import { getFiltersToken, getInterceptorsToken, getRouterToken, getTransfersToken } from './tokens';
import { MimeModule } from './mime.module';
import { SessionOptions } from './sessions/Session';


/**
 * Identifies a particular kind of `Feature`.
 *
 * @publicApi
 */
export enum FeatureKind {
    Configure,
    Interceptors,
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
    config?: TransportConfig;
    providers: Provider[];
}


export interface TransportFeature {
    kind: FeatureKind.Transport;
    config: TransportConfig;
    providers: Provider[];
}

export type FeatureFn<Kind extends Exclude<FeatureKind, FeatureKind.Transport>> = (config: TransportConfig) => Feature<Kind>;


export type FeatureLike<Kind extends FeatureKind> = Feature<Exclude<Kind, FeatureKind.Transport>> | TransportFeature[] | FeatureFn<Exclude<Kind, FeatureKind.Transport>>;


/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(...features: FeatureLike<FeatureKind>[]): Provider[] {

    const transports = features.filter(f => isArray(f)).flatMap(f => f as TransportFeature[]);
    if (!transports.length) {
        throw new ArgumentException('endpoint transport feature is required.');
    }

    const providers: Provider[] = [
        SetupServices,
        MimeModule,
        EndpointTypedRespond,
        BodyparserInterceptor,
        ContentInterceptor,
        JsonInterceptor,
        SessionInterceptor,
        LoggerInterceptor
    ];
    transports.forEach(ts => {
        const kinds = new Map<FeatureKind, Provider[]>();
        const config = ts.config;
        features.forEach(f => {
            if (isArray(f)) {
                return;
            }

            const feature = isFunction(f) ? f(config) : f;
            if (feature.config && !matchTransport(feature.config, config)) {
                return;
            }
            const pdrs = kinds.get(feature.kind);
            if (pdrs) {
                pdrs.push(...feature.providers);
            } else {
                kinds.set(feature.kind, feature.providers.slice(0));
            }

        });

        // if (!kinds.has(FeatureKind.Configure)) {
        //     throw new ArgumentException(`messings ${config.transport}${config.microservice ? ' microservice' : ''} service configure` + (config.name ? `, ailas with name ${config.name}` : ''));
        // }


        // if (!kinds.has(FeatureKind.Transport)) {
        //     throw new ArgumentException(`messings ${config.transport}${config.microservice ? ' microservice' : ''} service transport` + (config.name ? `, ailas with name ${config.name}` : ''));
        // }


        Array.from(kinds.keys()).sort().forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            ...ts.providers
        );

    });

    return providers;
}


export function makeFeature<T extends FeatureKind>(kind: T, providers: Provider[], config?: TransportConfig): Feature<T> {
    return {
        kind,
        config,
        providers
    }
}

/**
 * 
 * Adds logger filter to the configuration of the `Service`
 * instance.
 *
 * @see {@link FilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withLogger(options?: LoggerOptions, filter?: boolean): FeatureFn<FeatureKind.Logger> {
    return (config) => {
        const token = filter ? getFiltersToken(config.transport, config.microservice)
            : getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Logger,
            [
                {
                    provide: token,
                    useClass: LoggerInterceptor,
                    deps: [
                        ResponseStatusFormater,
                        { value: options }
                    ],
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * 
 * Adds json interceptor to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withJson(options?: JsonOptions): FeatureFn<FeatureKind.Json> {
    return (config) => {
        const token = getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Json,
            [
                {
                    provide: token,
                    useClass: JsonInterceptor,
                    deps: [
                        { value: options }
                    ],
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * 
 * Adds json interceptor to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withSession(options?: SessionOptions): FeatureFn<FeatureKind.Session> {
    return (config) => {
        const token = getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Session,
            [
                {
                    provide: token,
                    useClass: SessionInterceptor,
                    deps: [
                        { value: options }
                    ],
                    multi: true
                }
            ],
            config
        );
    }
}


/**
 * 
 * Adds content interceptor to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withContent(options?: ContentOptions): FeatureFn<FeatureKind.Content> {
    return (config) => {
        const token = getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Content,
            [
                {
                    provide: token,
                    useClass: ContentInterceptor,
                    deps: [
                        { value: options }
                    ],
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * 
 * Adds bodyparser interceptor to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withBodyparser(options?: PayloadOptions): FeatureFn<FeatureKind.Bodyparser> {
    return (config) => {
        const token = getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Bodyparser,
            [
                {
                    provide: token,
                    useClass: BodyparserInterceptor,
                    deps: [
                        { value: options }
                    ],
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * Adds router interceptors to the configuration of the `Service`
 * instance.
 * 
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withRouter(options?: RouteOpts): FeatureFn<FeatureKind.Router> {
    return (config) => {
        const { transport, name, microservice } = config;
        const token = getInterceptorsToken(transport, microservice ?? options?.microservice);
        const routerToken = getRouterToken(transport, microservice ?? options?.microservice);
        return makeFeature(
            FeatureKind.Router,
            [
                ...createRouteProviders(transport, microservice, routerToken, options),
                {
                    provide: token,
                    useExisting: routerToken,
                    multi: true
                }
            ],
            config
        );
    }
}


/**
 * Adds one or more service interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export function withInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.Interceptors> {
    return (config) => {
        const token = getInterceptorsToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}


/**
 * Adds one or more service controllers to the configuration of the `Service`
 * instance.
 *
 * @see {@link provideService}
 * @publicApi
 */
export function withControllers(controllers: Type[]): FeatureFn<FeatureKind.Controller> {
    return (config) => {
        return makeFeature(
            FeatureKind.Controller,
            controllers,
            config
        );
    }
}



/**
 * Adds one or more service transfers interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export function withTransfers(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.Transfer> {
    return (config) => {
        const token = getTransfersToken(config.transport, config.microservice)
        return makeFeature(
            FeatureKind.Transfer,
            interceptors.map((u) => toProvider(token, u, true)),
            config
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

// /**
//  * global registered server modules
//  */
// export const SERVER_MODULES = token<ServiceModuleOpts[]>('SERVER_MODULES');


// function createServiceProviders(options: ServiceOptions, idx: number) {

//     const microservice = isMicroTransport(options);
//     return [
//         options.providers ?? [],
//         {
//             provider: async (injector) => {
//                 const transportName = toTransportModuleName(options.transport);
//                 let mdopts = injector.get(SERVER_MODULES, null)?.find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));

//                 if (!mdopts) {
//                     try {
//                         const m = await import(`@tsdi/${transportName}`);

//                         const transportModuleName = transportName.charAt(0).toUpperCase() + transportName.slice(1) + 'Module';
//                         if (m[transportModuleName]) {
//                             await injector.get(ModuleRef).import(m[transportModuleName]);
//                             mdopts = injector.get(SERVER_MODULES, []).find(r => (r.transport === options.transport || r.transport == transportName) && ((microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r)))));
//                         }
//                         if (!mdopts) {
//                             throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found this transport module!')
//                         }
//                     } catch (err: any) {

//                         throw new NotImplementedException(`${options.transport} ${microservice ? 'microservice' : 'server'} ${err.message ?? 'has not implemented'}`);
//                     }

//                 }

//                 const moduleOpts = { ...mdopts, ...options, asDefault: null } as ServiceModuleOpts & ServiceOptions;

//                 const cloneOpts = lang.deepClone(moduleOpts.config, moduleOpts.defaultConfig, (n, value, deft) => {
//                     if (n == 'providers' || n === 'routes') {
//                         return [value, deft];
//                     }
//                     return value;
//                 });

//                 const serverOpts = {
//                     backend: getRouterToken(moduleOpts.transport, '', microservice),
//                     enableTypeChain: true,
//                     ...cloneOpts
//                 } as ServiceConfig & { providers: Provider[] };

//                 if (!serverOpts.providers) {
//                     serverOpts.providers = [];
//                 }

//                 if (!serverOpts.handlerType) throw new ConfigMissingException(`Config Missing handlerType`);
//                 // if (!serverOpts.transportFactory || serverOpts.transportFactory === ServerTransportFactory) throw new ConfigMissingException(`Config Missing transportFactory`);

//                 if (microservice) {
//                     serverOpts.microservice = microservice;
//                 }
//                 if (!serverOpts.transport) {
//                     serverOpts.transport = options.transport
//                 }


//                 if (moduleOpts.imports) {
//                     serverOpts.providers.push({
//                         provider: async (injector) => {
//                             await injector.getInject().useAsync(moduleOpts.imports!)
//                         }
//                     })
//                 }

//                 // serverOpts.providers.push(toProvider(ServerTransportFactory, serverOpts.transportFactory));

//                 if (!serverOpts.execptionHandlers) {
//                     serverOpts.execptionHandlers = [DefaultExceptionHandlers]
//                 }


//                 const providers: Provider[] = [];

//                 if (moduleOpts.server) {
//                     providers.push(toProvider(moduleOpts.serverType, moduleOpts.server));
//                 }

//                 providers.push({
//                     provide: serverOpts.handlerType,
//                     useFactory: (injector: Injector) => {
//                         const opts = lang.deepClone(serverOpts) as ServiceConfig;
//                         return createRequestHandler(injector, opts)
//                     },
//                     deps: [Injector]
//                 });

//                 return [
//                     moduleOpts.providers ?? [],
//                     createRouteProviders(moduleOpts.transport, microservice, undefined, undefined, serverOpts.routes),
//                     { provide: REGISTER_SERVICES, useValue: { service: moduleOpts.serverType, bootstrap: serverOpts.bootstrap, microservice: serverOpts.microservice, providers }, multi: true }
//                 ];
//             }
//         }

//     ] as Provider[];

// }


