import { ArgumentException, ProvdierOf, Provider, StaticProvider, isArray, isFunction, toProvider, toProviders, token } from '@tsdi/ioc';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory, TransferSide, useSimpleJson,
    UrlClientIncomingFactory, TopicClientIncomingFactory,
    AbstractRequest,
    ResponseEvent
} from '@tsdi/common';
import { getClientFiltersToken, getClientGuardsToken, getClientInterceptorsToken, getClientTransfersToken } from './tokens';
import { bodyServializeInterceptor } from './interceptors/body';
import { requestTimeoutInterceptor } from './interceptors/timeout';
import { ClientConfig } from './options';
import { FilterLike, GuardLike } from '@tsdi/core';
import { config } from 'rxjs';



/**
 * Identifies a particular kind of `ClientFeature`.
 *
 * @publicApi
 */
export enum ClientFeatureKind {
    Configure,
    Guards,
    Filters,
    Interceptors,
    // LegacyInterceptors,
    CustomXsrfConfiguration,
    NoXsrfProtection,
    JsonpSupport,
    RequestsMadeViaParent,
    Redirector,
    BodySerialize,
    Fetch,
    Transport,
    Transfer
}



export interface ClientFeature<Kind extends ClientFeatureKind = ClientFeatureKind> {
    kind: Kind;
    config?: ClientConfig;
    providers: Provider[];
}

export interface ClientTransportFeature {
    kind: ClientFeatureKind.Transport;
    config: ClientConfig;
    providers: Provider[];
}


export type ClientFeatureFn<Kind extends Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> = (config: ClientConfig) => ClientFeature<Kind> | ClientFeature<Kind>[];


export type ClientFeatureLike<Kind extends ClientFeatureKind> = ClientFeature<Kind> | ClientFeature<Kind>[] | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>>[];



/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(...features: ClientFeatureLike<ClientFeatureKind>[]): Provider[] {

    const allFeatures = features.flatMap(f => f as (ClientFeature<ClientFeatureKind> | ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>>));
    const transports = allFeatures.filter(f => !isFunction(f) && f.kind === ClientFeatureKind.Transport) as ClientTransportFeature[];

    if (!transports.length) {
        throw new ArgumentException('client transport feature is required.');
    }

    const providers: Provider[] = [];

    transports.forEach(ts => {
        const kinds = new Map<ClientFeatureKind, Provider[]>();
        const config = ts.config as ClientConfig & TransportConfig;

        allFeatures.forEach(f => {
            if ((f as ClientTransportFeature).kind === ClientFeatureKind.Transport) {
                return;
            }
            const fs = isFunction(f) ? f(config) : f;
            (isArray(fs) ? fs : [fs]).forEach(feature => {
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
        });

        // if (!kinds.has(FeatureKind.Configure)) {
        //     throw new ArgumentException(`messings ${protocol} client configure` + (name ? `, ailas with name ${name}` : ''));
        // }

        // if (!kinds.has(ClientFeatureKind.Transport)) {
        //     throw new ArgumentException(`messings ${config.protocol}${config.microservice ? ' microservice' : ''} client transport` + (config.name ? `, ailas with name ${config.name}` : ''));
        // }

        Array.from(kinds.keys()).sort((a, b) => a - b).forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            ...ts.providers
        );

    });

    return providers;

}

export function makeClientFeature<T extends ClientFeatureKind, TConfig extends ClientConfig>(kind: T, providers: Provider[], config?: TConfig): ClientFeature<T> {
    return {
        kind,
        config,
        providers
    }
}


/**
 * Adds one or more  client interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientInterceptors(
    ...interceptors: ProvdierOf<RequestInterceptorLike>[]
): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const token = getClientInterceptorsToken(config);
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}


/**
 * Adds one or more client transfers interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientTransfers(
    ...selectors: TransferInterceptorFactory[]
): ClientFeatureFn<ClientFeatureKind.Transfer> {
    return (config) => {
        const token = getClientTransfersToken(config);
        const providers: Provider[] = [
            UrlClientIncomingFactory,
            TopicClientIncomingFactory,
        ];
        if (!selectors.length) {
            selectors.push(useSimpleJson());
        }
        selectors.forEach((fac) => {
            const itps = fac(config);
            if (isArray(itps)) {
                providers.push(...toProviders(token, itps, true));
            } else {
                providers.push(toProvider(token, itps, true));
            }
        });
        return makeClientFeature(
            ClientFeatureKind.Transfer,
            providers,
            config
        );
    }
}


/**
 * Adds timeout client interceptor to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientTimeout(timeout?: number): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const token = getClientInterceptorsToken(config)
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            [{
                provide: token,
                useValue: requestTimeoutInterceptor(timeout ?? 15000),
                multi: true
            }],
            config
        );
    }
}


/**
 * Adds body serialize client interceptor to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withBodySerialize(): ClientFeatureFn<ClientFeatureKind.BodySerialize> {
    return (config) => {
        const token = getClientInterceptorsToken(config)
        return makeClientFeature(
            ClientFeatureKind.BodySerialize,
            [{
                provide: token,
                useValue: bodyServializeInterceptor,
                multi: true
            }],
            config
        );
    }
}


/**
 * 
 * Add guards to the configuration of the `Client`
 * instance.
 *
 * @see {@link FilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param guards 
 * @returns
 */
export function withClientGuards(...guards: ProvdierOf<GuardLike>[]): ClientFeatureFn<ClientFeatureKind.Guards> {
    return (config) => {
        const token = getClientGuardsToken(config);
        return makeClientFeature(
            ClientFeatureKind.Guards,
            guards.map((f) => toProvider(token, f, true)),
            config
        );
    }
}

/**
 * 
 * Add filters to the configuration of the `Client`
 * instance.
 *
 * @see {@link FilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param filters 
 * @returns
 */
export function withClientFilters(...filters: ProvdierOf<FilterLike>[]): ClientFeatureFn<ClientFeatureKind.Filters> {
    return (config) => {
        const token = getClientFiltersToken(config);
        return makeClientFeature(
            ClientFeatureKind.Filters,
            filters.map((f) => toProvider(token, f, true)),
            config
        );
    }
}



const defaultOptions = {
    bodySerialize: true
}

export interface ClientFeatureOptions {
    filters?: ProvdierOf<FilterLike>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    guards?: ProvdierOf<GuardLike>[];
    timeout?: number;
    bodySerialize?: boolean;
    transfers?: TransferInterceptorFactory[];
}

export function withClientFeatures(options?: ClientFeatureOptions): ClientFeatureFn<Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> {
    const opts = { ...defaultOptions, ...options };
    return (config) => {
        const features: any[] = [];
        if (opts.filters) {
            features.push(withClientFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withClientInterceptors(...opts.interceptors)(config));
        }
        if (opts.guards) {
            features.push(withClientGuards(...opts.guards)(config));
        }

        if (opts.timeout) {
            features.push(withClientTimeout(opts.timeout)(config));
        }
        if (opts.bodySerialize) {
            features.push(withBodySerialize()(config));
        }
        if (opts.transfers) {
            features.push(withClientTransfers(...opts.transfers)(config))
        }

        return features;
    }

}


export interface ClientOptions<
    TReq extends AbstractRequest<any> = AbstractRequest<any>,
    TRes extends ResponseEvent<any> = ResponseEvent<any>,
> extends ClientConfig<TReq, TRes> {
    features?: ClientFeatureOptions;
    transportFeature?: (options: ClientOptions, asDefault?: boolean) => ClientTransportFeature;
}


export const CLIENT_CONFIGS = token<ClientOptions[]>('CLIENT_CONFIGS');

export function provideClientFromDi(options: TransportConfig): Provider[] {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(CLIENT_CONFIGS, []).filter(c => matchTransport(options, c));
                if (!configs.length) throw new ArgumentException(`messings ${options.transport}${options.microservice ? ' microservice' : ''} client configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                const features: ClientFeatureLike<ClientFeatureKind>[] = [];
                const transports: ClientTransportFeature[] = [];
                configs.forEach(config => {
                    // if (!config.features) throw new ArgumentException(`messings featires ${options.transport}${options.microservice ? ' microservice' : ''} client configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    if (!config.transportFeature) throw new ArgumentException(`messings transportFeature ${options.transport}${options.microservice ? ' microservice' : ''} client configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    features.push(withClientFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault));
                })

                return provideClient(
                    ...features,
                    transports
                ) as StaticProvider[];
            }
        }
    ]
}



// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: ClientOptions): Provider[];
// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: Array<ClientOptions>): Provider[];
// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: Arrayify<ClientOptions>): ModuleWithProviders<ClientModule> {
//     let providers: Provider[];
//     if (isArray(options)) {
//         providers = [];
//         options.forEach((op, idx) => {
//             providers.push(clientProviders(op, idx));
//         })
//     } else {
//         providers = clientProviders(options);
//     }

//     return {
//         providers,
//         module: ClientModule
//     }
// }


// /**
//  * global register client modules.
//  */
// export const CLIENT_MODULES = token<ClientModuleOpts[]>('CLIENT_MODULES');


// function clientProviders(options: ClientOptions, idx?: number) {
//     const microservice = isMicroTransport(options);
//     return [
//         options.providers ?? [],
//         {
//             provider: async (injector) => {
//                 const transportName = toTransportModuleName(options.transport);
//                 let defts = injector.get(CLIENT_MODULES, null)?.find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
//                 if (!defts) {
//                     try {
//                         const m = await import(`@tsdi/${transportName}`);
//                         const transportModuleName = transportName.charAt(0).toUpperCase() + transportName.slice(1) + 'Module';
//                         if (m[transportModuleName]) {
//                             await injector.get(ModuleRef).import(m[transportModuleName]);
//                             defts = injector.get(CLIENT_MODULES, []).find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
//                         }
//                         if (!defts) {
//                             throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found transport module!')
//                         }
//                     } catch (err: any) {
//                         throw new NotImplementedException(`${options.transport} ${microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
//                     }
//                 }
//                 const opts = { ...defts, ...options, asDefault: null } as ClientModuleOpts & ClientOptions;


//                 const cloneOpts = lang.deepClone(opts.config, opts.defaultConfig, (n, value, deft) => {
//                     if (n == 'providers') {
//                         return [value, deft];
//                     }
//                     return value;
//                 });
//                 const clientOpts = {
//                     backend: opts.backend ?? RequestBackend,
//                     enableTypeChain: true,
//                     ...cloneOpts
//                 } as ClientConfig & { providers: Provider[] };

//                 if (!clientOpts.providers) {
//                     clientOpts.providers = [];
//                 }

//                 if (microservice) {
//                     clientOpts.microservice = microservice;
//                 }
//                 if (!clientOpts.protocol) {
//                     clientOpts.protocol = options.transport
//                 }


//                 // if (!opts.backend) {
//                 //     clientOpts.providers.push({ provide: RequestBackend, useClass: RequestTransportBackend });
//                 // }

//                 if (!clientOpts.handlerType) throw new ConfigMissingException(`Config Missing handlerType`);
//                 // if (!clientOpts.transportFactory || clientOpts.transportFactory == ClientTransportFactory) throw new ConfigMissingException(`Config Missing transportFactory`);

//                 if (opts.imports) {
//                     clientOpts.providers.push({
//                         provider: async (injector) => {
//                             await injector.getInject().useAsync(opts.imports!)
//                         }
//                     })
//                 }

//                 // clientOpts.providers.push(toProvider(ClientTransportFactory, clientOpts.transportFactory));

//                 // if (!clientOpts.execptionHandlers) {
//                 //     clientOpts.execptionHandlers = [DefaultExceptionHandlers]
//                 // }


//                 const providers: Provider[] = [];

//                 if (opts.clientProvider) {
//                     providers.push(toProvider(opts.clientType, opts.clientProvider));
//                 }
//                 providers.push({
//                     provide: clientOpts.handlerType,
//                     useFactory: (injector: Injector) => {
//                         return createHandler(injector, lang.deepClone(clientOpts));
//                     },
//                     deps: [Injector]
//                 });

//                 return opts.client ? [
//                     {
//                         provide: opts.client,
//                         useFactory: (injector: Injector) => {
//                             return injector.getInject().resolve(opts.clientType, providers);
//                         },
//                         deps: [Injector]

//                     }
//                 ] : providers;
//             }
//         }
//     ] as Provider[];
// }
