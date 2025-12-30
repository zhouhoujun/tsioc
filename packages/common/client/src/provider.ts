import { ArgumentException, ProvdierOf, Provider, StaticProvider, isArray, isFunction, toProvider, toProviders, token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory, useSimpleJson,
    UrlClientIncomingFactory, TopicClientIncomingFactory, AbstractRequest, ResponseEvent, RequestFilterLike,
    ResponseFactory, DefaultResponseFactory, RequestInterceptorFn
} from '@tsdi/common';
import { getClientFiltersToken, getClientGuardsToken, getClientInterceptorsToken, getClientTransfersToken } from './tokens';
import { bodyServializeInterceptor } from './interceptors/body';
import { requestTimeoutInterceptor } from './interceptors/timeout';
import { ClientConfig } from './options';
import { map } from 'rxjs';



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
    ResponseEvent,
    Transfer,
    Transport
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

export const responseInterceptor: RequestInterceptorFn = (req, next, context) => {
    return next(req, context)
        .pipe(
            map(r => {
                const factory = context.get(ResponseFactory);
                if (factory) return factory.create(r);
                return r;
            })
        )
}

export function withResponseEvent(options?: {
    responseFactory?: ProvdierOf<ResponseFactory>;
    interceptors?: ProvdierOf<RequestInterceptorLike>[]
}): ClientFeatureFn<ClientFeatureKind.ResponseEvent> {
    return (config) => {
        const token = getClientInterceptorsToken(config);
        const responseFactory = options?.responseFactory ?? DefaultResponseFactory;

        if (!config.providers) {
            config.providers = [];
        }
        config.providers.push(toProvider(ResponseFactory, responseFactory))


        return makeClientFeature(
            ClientFeatureKind.ResponseEvent,
            [
                { provide: token, useValue: responseInterceptor, multi: true },
                options?.interceptors?.map((u) => toProvider(token, u, true)) ?? [],
            ],
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
export function withClientFilters(...filters: ProvdierOf<RequestFilterLike>[]): ClientFeatureFn<ClientFeatureKind.Filters> {
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
    filters?: ProvdierOf<RequestFilterLike>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    guards?: ProvdierOf<GuardLike>[];
    timeout?: number;
    bodySerialize?: boolean;
    transfers?: TransferInterceptorFactory[];
    responseOptions?: {
        responseFactory?: ProvdierOf<ResponseFactory>;
        interceptors?: ProvdierOf<RequestInterceptorLike>[]
    }
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

        if (opts.responseOptions) {
            features.push(withResponseEvent(opts.responseOptions)(config))
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

