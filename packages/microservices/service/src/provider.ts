import { ArgumentException, ProvdierOf, Provider, StaticProvider, Type, isArray, isBoolean, isFunction, toProvider, toProviders, token, Token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory,
    useSimpleJson, LoggerInterceptor, LoggerOptions, ResponseStatusFormater,
    provideIncomings, provideOutgoings, RequestFilterLike
} from '@tsdi/common';
import { createRouteProviders, RouteOpts } from '@tsdi/endpoints/router';
import { MiddlewareLike } from '@tsdi/endpoints/middleware';
import {
    getMicroServiceFiltersToken, getMicroServiceGuardsToken, getMicroServiceInterceptorsToken,
    getMicroServiceMiddlewaresToken, getMicroServiceTransfersToken, getMicroServiceRouterToken
} from './tokens';
import { MicroServiceConfig, MicroServiceFeatureOptions, RegistrationOptions, HealthOptions, GracefulShutdownOptions } from './options';
import { SetupMicroServices } from './SetupMicroServices';


/**
 * Identifies a particular kind of `MicroServiceFeature`.
 * @publicApi
 */
export enum MicroServiceFeatureKind {
    Configure,
    Transfer,
    Logger,
    Exception,
    Filters,
    Guards,
    Interceptors,
    Middlewares,
    Router,
    Controller,
    Transport,
    Registration,
    Health,
    GracefulShutdown
}


export interface MicroServiceFeature<Kind extends MicroServiceFeatureKind = MicroServiceFeatureKind> {
    kind: Kind;
    config?: MicroServiceConfig;
    providers: Provider[];
}


export interface MicroServiceTransportFeature {
    kind: MicroServiceFeatureKind.Transport;
    config: MicroServiceConfig;
    providers: Provider[];
}


export type MicroServiceFeatureFn<Kind extends Exclude<MicroServiceFeatureKind, MicroServiceFeatureKind.Transport>> = (config: MicroServiceConfig) => MicroServiceFeature<Kind> | MicroServiceFeature<Kind>[];


export type MicroServiceFeatureLike<Kind extends MicroServiceFeatureKind> = MicroServiceFeature<Kind> | MicroServiceFeature<Kind>[] | MicroServiceFeatureFn<Exclude<MicroServiceFeatureKind, MicroServiceFeatureKind.Transport>> | MicroServiceFeatureFn<Exclude<MicroServiceFeatureKind, MicroServiceFeatureKind.Transport>>[];


/**
 * Provide microservice service with features, like Spring Cloud.
 * @publicApi
 */
export function provideService(...features: MicroServiceFeatureLike<MicroServiceFeatureKind>[]): Provider[] {
    const allFeatures = features.flatMap(f => f as (MicroServiceFeature<MicroServiceFeatureKind> | MicroServiceFeatureFn<Exclude<MicroServiceFeatureKind, MicroServiceFeatureKind.Transport>>));
    const transports = allFeatures.filter(f => !isFunction(f) && f.kind === MicroServiceFeatureKind.Transport) as MicroServiceTransportFeature[];
    if (!transports.length) {
        throw new ArgumentException('microservice transport feature is required.');
    }

    const providers: Provider[] = [
        provideIncomings(),
        provideOutgoings(),
        SetupMicroServices,
        LoggerInterceptor
    ];

    transports.forEach(ts => {
        const kinds = new Map<MicroServiceFeatureKind, Provider[]>();
        const config = ts.config;
        allFeatures.forEach(f => {
            if ((f as MicroServiceTransportFeature).kind === MicroServiceFeatureKind.Transport) {
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

        Array.from(kinds.keys()).sort((a, b) => a - b).forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            ...ts.providers
        );
    });

    return providers;
}


export function makeMicroServiceFeature<T extends MicroServiceFeatureKind>(kind: T, providers: Provider[], config?: MicroServiceConfig): MicroServiceFeature<T> {
    return {
        kind,
        config,
        providers
    }
}


const defaultMicroServiceOptions: Partial<MicroServiceFeatureOptions> = {
    logger: true,
    router: true,
    registration: true,
    health: true,
    gracefulShutdown: true
};


/**
 * Combined feature builder for micro service, like Spring Cloud EnableEurekaClient.
 * @publicApi
 */
export function withMicroServiceFeatures(options?: MicroServiceFeatureOptions): MicroServiceFeatureFn<Exclude<MicroServiceFeatureKind, MicroServiceFeatureKind.Transport>> {
    return (config) => {
        const features: any[] = [];
        const opts = { ...defaultMicroServiceOptions, ...options };

        if (opts.filters) {
            features.push(withMicroServiceFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withMicroServiceInterceptors(...opts.interceptors)(config));
        }
        if (opts.middlewares) {
            features.push(withMicroServiceMiddlewares(...opts.middlewares)(config));
        }
        if (opts.guards) {
            features.push(withMicroServiceGuards(...opts.guards)(config));
        }
        if (opts.logger) {
            features.push(withMicroServiceLogger(isBoolean(opts.logger) ? undefined : opts.logger)(config));
        }
        if (opts.router) {
            features.push(withMicroServiceRouter(isBoolean(opts.router) ? undefined : opts.router)(config));
        }
        if (opts.transfers) {
            features.push(withMicroServiceTransfers(...(isArray(opts.transfers) ? opts.transfers : []))(config));
        }
        if (opts.registration) {
            features.push(withRegistration(opts.registration)(config));
        }
        if (opts.health) {
            features.push(withHealth(opts.health)(config));
        }
        if (opts.gracefulShutdown) {
            features.push(withGracefulShutdown(opts.gracefulShutdown)(config));
        }

        return features.flatMap(r => r);
    }
}


/**
 * Adds service registration, like Spring Cloud Eureka/Consul.
 * @publicApi
 */
export function withRegistration(options?: boolean | RegistrationOptions): MicroServiceFeatureFn<MicroServiceFeatureKind.Registration> {
    return (config) => {
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Registration,
            [
                { provide: MICRO_SERVICE_REGISTRATION_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    }
}

/**
 * Adds health check, like Spring Cloud Health Actuator.
 * @publicApi
 */
export function withHealth(options?: boolean | HealthOptions): MicroServiceFeatureFn<MicroServiceFeatureKind.Health> {
    return (config) => {
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Health,
            [
                { provide: MICRO_SERVICE_HEALTH_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    }
}

/**
 * Adds graceful shutdown, like Spring Cloud graceful shutdown.
 * @publicApi
 */
export function withGracefulShutdown(options?: boolean | GracefulShutdownOptions): MicroServiceFeatureFn<MicroServiceFeatureKind.GracefulShutdown> {
    return (config) => {
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.GracefulShutdown,
            [
                { provide: MICRO_SERVICE_GRACEFUL_SHUTDOWN_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    }
}

/**
 * Adds interceptors to micro service.
 * @publicApi
 */
export function withMicroServiceInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Interceptors> {
    return (config) => {
        const tk = getMicroServiceInterceptorsToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Interceptors,
            interceptors.map((u) => toProvider(tk, u, true)),
            config
        );
    }
}

/**
 * Adds guards to micro service.
 * @publicApi
 */
export function withMicroServiceGuards(...guards: ProvdierOf<GuardLike>[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Guards> {
    return (config) => {
        const tk = getMicroServiceGuardsToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Guards,
            guards.map((f) => toProvider(tk, f, true)),
            config
        );
    }
}

/**
 * Adds filters to micro service.
 * @publicApi
 */
export function withMicroServiceFilters(...filters: ProvdierOf<RequestFilterLike>[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Filters> {
    return (config) => {
        const tk = getMicroServiceFiltersToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Filters,
            filters.map((f) => toProvider(tk, f, true)),
            config
        );
    }
}

/**
 * Adds middlewares to micro service.
 * @publicApi
 */
export function withMicroServiceMiddlewares(...middlewares: ProvdierOf<MiddlewareLike>[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Middlewares> {
    return (config) => {
        const tk = getMicroServiceMiddlewaresToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Middlewares,
            middlewares.map((u) => toProvider(tk, u, true)),
            config
        );
    }
}

/**
 * Adds transfer interceptors to micro service.
 * @publicApi
 */
export function withMicroServiceTransfers(...selectors: TransferInterceptorFactory[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Transfer> {
    return (config) => {
        const tk = getMicroServiceTransfersToken(config);
        const providers: Provider[] = [];
        if (!selectors.length) {
            selectors.push(useSimpleJson());
        }
        selectors.forEach((fac) => {
            const itps = fac(config);
            if (isArray(itps)) {
                providers.push(...toProviders(tk, itps, true));
            } else {
                providers.push(toProvider(tk, itps, true));
            }
        });
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Transfer,
            providers,
            config
        );
    }
}

/**
 * Adds logger to micro service.
 * @publicApi
 */
export function withMicroServiceLogger(options?: LoggerOptions): MicroServiceFeatureFn<MicroServiceFeatureKind.Logger> {
    return (config) => {
        const tk = getMicroServiceFiltersToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Logger,
            [
                {
                    provide: tk,
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
 * Adds router to micro service.
 * @publicApi
 */
export function withMicroServiceRouter(options?: RouteOpts): MicroServiceFeatureFn<MicroServiceFeatureKind.Router> {
    return (config) => {
        const tk = getMicroServiceInterceptorsToken(config);
        const routerToken = getMicroServiceRouterToken(config);
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Router,
            [
                ...createRouteProviders(config, routerToken, options),
                {
                    provide: tk,
                    useExisting: routerToken,
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * Adds controllers to micro service.
 * @publicApi
 */
export function withMicroServiceControllers(controllers: Type[]): MicroServiceFeatureFn<MicroServiceFeatureKind.Controller> {
    return (config) => {
        return makeMicroServiceFeature(
            MicroServiceFeatureKind.Controller,
            controllers,
            config
        );
    }
}


export const MICRO_SERVICE_REGISTRATION_OPTIONS = token<RegistrationOptions>('MICRO_SERVICE_REGISTRATION_OPTIONS');
export const MICRO_SERVICE_HEALTH_OPTIONS = token<HealthOptions>('MICRO_SERVICE_HEALTH_OPTIONS');
export const MICRO_SERVICE_GRACEFUL_SHUTDOWN_OPTIONS = token<GracefulShutdownOptions>('MICRO_SERVICE_GRACEFUL_SHUTDOWN_OPTIONS');


export interface MicroServiceOptions<TSerOpts = any> extends MicroServiceConfig<TSerOpts> {
    features?: MicroServiceFeatureOptions;
    transportFeature?: (options: MicroServiceOptions<TSerOpts>, asDefault?: boolean) => MicroServiceTransportFeature;
}

export const SERVICE_CONFIGS = token<MicroServiceOptions[]>('MICRO_SERVICE_CONFIGS');
export const SERV_OPTIONS = token<MicroServiceOptions>('MICRO_SERV_OPTIONS');


/**
 * Provide micro service from DI.
 */
export function provideServiceFromDi(options: TransportConfig): Provider[] {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(SERVICE_CONFIGS, []).filter(c => matchTransport(options, c));
                if (!configs?.length) throw new ArgumentException(`messings ${options.transport} microservice service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                const featires: MicroServiceFeatureLike<MicroServiceFeatureKind>[] = [];
                const transports: MicroServiceTransportFeature[] = [];
                configs.forEach(config => {
                    if (!config.transportFeature) throw new ArgumentException(`messings transportFeature ${options.transport} microservice service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    featires.push(withMicroServiceFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault));
                });

                return provideService(
                    ...featires,
                    transports
                ) as StaticProvider[];
            }
        }
    ]
}
