import { ArgumentException, ProvdierOf, Provider, StaticProvider, Type, isArray, isBoolean, isFunction, toProvider, toProviders, token } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory,
    useSimpleJson, LoggerInterceptor, LoggerOptions, ResponseStatusFormater,
    provideIncomings, provideOutgoings, RequestFilterLike
} from '@tsdi/common';
import {
    getServiceFiltersToken, getServiceGuardsToken, getServiceInterceptorsToken,
    getServiceMiddlewaresToken, getServiceTransfersToken, getServiceRouterToken
} from './tokens';
export * from './options';
import { ServiceConfig, ServiceFeatureOptions, ServiceOptions } from './options';
import { RegistrationOptions, HealthOptions, GracefulShutdownOptions } from './features';
import { SetupMicroServices } from './SetupMicroServices';


/**
 * Identifies a particular kind of `ServiceFeature`.
 * @publicApi
 */
export enum ServiceFeatureKind {
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


export interface ServiceFeature<Kind extends ServiceFeatureKind = ServiceFeatureKind> {
    kind: Kind;
    config?: ServiceConfig;
    providers: Provider[];
}


export interface ServiceTransportFeature {
    kind: ServiceFeatureKind.Transport;
    config: ServiceConfig;
    providers: Provider[];
}


export type ServiceFeatureFn<Kind extends Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>> = (config: ServiceConfig) => ServiceFeature<Kind> | ServiceFeature<Kind>[];

export type ServiceFeatureLike<Kind extends ServiceFeatureKind> = ServiceFeature<Kind> | ServiceFeature<Kind>[] | ServiceFeatureFn<Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>> | ServiceFeatureFn<Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>>[];


/**
 * Provide microservice service with features, like Spring Cloud.
 * @publicApi
 */
export function provideService(...features: ServiceFeatureLike<ServiceFeatureKind>[]): Provider[] {
    const allFeatures = features.flatMap(f => f as (ServiceFeature<ServiceFeatureKind> | ServiceFeatureFn<Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>>));
    const transports = allFeatures.filter(f => !isFunction(f) && f.kind === ServiceFeatureKind.Transport) as ServiceTransportFeature[];
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
        const kinds = new Map<ServiceFeatureKind, Provider[]>();
        const config = ts.config;
        allFeatures.forEach(f => {
            if ((f as ServiceTransportFeature).kind === ServiceFeatureKind.Transport) {
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


export function makeServiceFeature<T extends ServiceFeatureKind>(kind: T, providers: Provider[], config?: ServiceConfig): ServiceFeature<T> {
    return {
        kind,
        config,
        providers
    };
}


const defaultServiceOptions: Partial<ServiceFeatureOptions> = {
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
export function withServiceFeatures(options?: ServiceFeatureOptions): ServiceFeatureFn<Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>> {
    return (config) => {
        const features: any[] = [];
        const opts = { ...defaultServiceOptions, ...options };

        if (opts.filters) {
            features.push(withServiceFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withServiceInterceptors(...opts.interceptors)(config));
        }
        if (opts.middlewares) {
            features.push(withServiceMiddlewares(...opts.middlewares)(config));
        }
        if (opts.guards) {
            features.push(withServiceGuards(...opts.guards)(config));
        }
        if (opts.logger) {
            features.push(withServiceLogger(isBoolean(opts.logger) ? undefined : opts.logger)(config));
        }
        if (opts.router) {
            features.push(withServiceRouter(isBoolean(opts.router) ? undefined : opts.router)(config));
        }

        features.push(withServiceTransfers(...opts.transfers ?? [])(config));

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
    };
}


/**
 * Adds service registration, like Spring Cloud Eureka/Consul.
 * @publicApi
 */
export function withRegistration(options?: boolean | RegistrationOptions): ServiceFeatureFn<ServiceFeatureKind.Registration> {
    return (config) => {
        return makeServiceFeature(
            ServiceFeatureKind.Registration,
            [
                { provide: SERVICE_REGISTRATION_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    };
}

/**
 * Adds health check, like Spring Cloud Health Actuator.
 * @publicApi
 */
export function withHealth(options?: boolean | HealthOptions): ServiceFeatureFn<ServiceFeatureKind.Health> {
    return (config) => {
        return makeServiceFeature(
            ServiceFeatureKind.Health,
            [
                { provide: SERVICE_HEALTH_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    };
}

/**
 * Adds graceful shutdown, like Spring Cloud graceful shutdown.
 * @publicApi
 */
export function withGracefulShutdown(options?: boolean | GracefulShutdownOptions): ServiceFeatureFn<ServiceFeatureKind.GracefulShutdown> {
    return (config) => {
        return makeServiceFeature(
            ServiceFeatureKind.GracefulShutdown,
            [
                { provide: SERVICE_GRACEFUL_SHUTDOWN_OPTIONS, useValue: isBoolean(options) ? {} : (options ?? {}) }
            ],
            config
        );
    };
}

/**
 * Adds interceptors to micro service.
 * @publicApi
 */
export function withServiceInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const tk = getServiceInterceptorsToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Interceptors,
            interceptors.map((u) => toProvider(tk, u, true)),
            config
        );
    };
}

/**
 * Adds guards to micro service.
 * @publicApi
 */
export function withServiceGuards(...guards: ProvdierOf<GuardLike>[]): ServiceFeatureFn<ServiceFeatureKind.Guards> {
    return (config) => {
        const tk = getServiceGuardsToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Guards,
            guards.map((f) => toProvider(tk, f, true)),
            config
        );
    };
}

/**
 * Adds filters to micro service.
 * @publicApi
 */
export function withServiceFilters(...filters: ProvdierOf<RequestFilterLike>[]): ServiceFeatureFn<ServiceFeatureKind.Filters> {
    return (config) => {
        const tk = getServiceFiltersToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Filters,
            filters.map((f) => toProvider(tk, f, true)),
            config
        );
    };
}

import { composeMiddleware, convertToInterceptor, MiddlewareLike } from './middleware';

/**
 * Adds middlewares to micro service.
 * @publicApi
 */
export function withServiceMiddlewares(...middlewares: ProvdierOf<MiddlewareLike>[]): ServiceFeatureFn<ServiceFeatureKind.Middlewares> {
    return (config) => {
        const tk = getServiceMiddlewaresToken(config);
        const providers = middlewares.map((u) => toProvider(tk, u, true)) as Provider[];

        const interToken = getServiceInterceptorsToken(config);
        providers.push({
            provide: interToken,
            useFactory: (middlewares: any[]) => {
                return convertToInterceptor(composeMiddleware(middlewares));
            },
            multi: true,
            deps: [tk]
        });
        return makeServiceFeature(
            ServiceFeatureKind.Middlewares,
            providers,
            config
        );
    };
}

/**
 * Adds transfer interceptors to micro service.
 * @publicApi
 */
export function withServiceTransfers(...selectors: TransferInterceptorFactory[]): ServiceFeatureFn<ServiceFeatureKind.Transfer> {
    return (config) => {
        const tk = getServiceTransfersToken(config);
        const providers: Provider[] = [];
        if (!selectors.length && config.features.defaultTransfer) {
            selectors.push(config.features.defaultTransfer);
        }
        selectors.forEach((fac) => {
            const itps = fac(config);
            if (isArray(itps)) {
                providers.push(...toProviders(tk, itps, true));
            } else {
                providers.push(toProvider(tk, itps, true));
            }
        });
        return makeServiceFeature(
            ServiceFeatureKind.Transfer,
            providers,
            config
        );
    };
}

/**
 * Adds logger to micro service.
 * @publicApi
 */
export function withServiceLogger(options?: LoggerOptions): ServiceFeatureFn<ServiceFeatureKind.Logger> {
    return (config) => {
        const tk = getServiceFiltersToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Logger,
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
    };
}

import { createRouteProviders } from './router/router.providers';

/**
 * Adds router to micro service.
 * @publicApi
 */
export function withServiceRouter(options?: any): ServiceFeatureFn<ServiceFeatureKind.Router> {
    return (config) => {
        const tk = getServiceInterceptorsToken(config);
        const routerToken = getServiceRouterToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Router,
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
    };
}

/**
 * Adds controllers to micro service.
 * @publicApi
 */
export function withServiceControllers(controllers: Type[]): ServiceFeatureFn<ServiceFeatureKind.Controller> {
    return (config) => {
        return makeServiceFeature(
            ServiceFeatureKind.Controller,
            controllers,
            config
        );
    };
}


export const SERVICE_REGISTRATION_OPTIONS = token<RegistrationOptions>('SERVICE_REGISTRATION_OPTIONS');
export const SERVICE_HEALTH_OPTIONS = token<HealthOptions>('SERVICE_HEALTH_OPTIONS');
export const SERVICE_GRACEFUL_SHUTDOWN_OPTIONS = token<GracefulShutdownOptions>('SERVICE_GRACEFUL_SHUTDOWN_OPTIONS');

export const SERVICE_CONFIGS = token<ServiceOptions[]>('SERVICE_CONFIGS');
export const SERV_OPTIONS = token<ServiceOptions>('SERV_OPTIONS');


/**
 * Provide micro service from DI.
 * 从依赖注入提供微服务服务
 */
export function provideServiceFromDi(options: TransportConfig): Provider[] {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(SERVICE_CONFIGS, []).filter(c => matchTransport(options, c));
                if (!configs.length) throw new ArgumentException(`missing ${options.transport} microservice service configuration` + (options.name ? `, alias with name ${options.name}` : ''));
                const features: ServiceFeatureLike<ServiceFeatureKind>[] = [];
                const transports: ServiceTransportFeature[] = [];
                configs.forEach(config => {
                    if (!config.transportFeature) throw new ArgumentException(`missing transportFeature ${options.transport} microservice service configuration` + (options.name ? `, alias with name ${options.name}` : ''));
                    features.push(withServiceFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault));
                });

                return provideService(
                    ...features,
                    transports
                ) as StaticProvider[];
            }
        }
    ];
}
