import { ArgumentException, ProvdierOf, Provider, StaticProvider, Type, isArray, isBoolean, isFunction, toProvider, toProviders, token, isPlainObject } from '@tsdi/ioc';
import { GuardLike, MessageValueReader } from '@tsdi/core';
import {
    matchTransport, TransportConfig, RequestInterceptorLike, TransferInterceptorFactory,
    LoggerInterceptor, LoggerOptions, ResponseStatusFormater,
    RequestFilter, RequestFilterLike
} from '@tsdi/common';
import {
    getServiceFiltersToken, getServiceGuardsToken, getServiceInterceptorsToken,
    getServiceMiddlewaresToken, getServiceTransfersToken, getServiceRouterToken
} from './tokens';

import { AuthOptions, CookieOptions, CorsOptions, FeatureInterceptorOptions, ServiceFeatureKind, ServiceFeature, ServiceTransportFeature, ServiceConfig, ServiceFeatureOptions, ServiceOptions } from './options';
import { RegistrationOptions, HealthOptions, GracefulShutdownOptions } from './features';
import { AuthInterceptor, BodyParserInterceptor, ContentInterceptor, CookieInterceptor, CorsInterceptor, JsonInterceptor, SessionInterceptor, SenderFilter } from './interceptors';
import { SetupServices } from './SetupMicroServices';
import { ServiceMessageValueReader } from './message-value-reader';



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
        SetupServices,
        LoggerInterceptor,
        { provide: MessageValueReader, useClass: ServiceMessageValueReader }
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

        if (!kinds.has(ServiceFeatureKind.Transfer)) {
            const transferFeature = useTransfers()(config);
            const transfers = Array.isArray(transferFeature) ? transferFeature : [transferFeature];
            transfers.forEach(feature => {
                const pdrs = kinds.get(feature.kind);
                if (pdrs) {
                    pdrs.push(...feature.providers);
                } else {
                    kinds.set(feature.kind, feature.providers.slice(0));
                }
            });
        }

        Array.from(kinds.keys()).sort((a, b) => a - b).forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            { provide: SERV_OPTIONS, useValue: config },
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

function resolveFeatureOptions<T extends FeatureInterceptorOptions>(options?: T): { featureOptions: Omit<T, 'interceptor' | 'multiOrder'>; interceptor?: ProvdierOf<RequestInterceptorLike>; multiOrder?: number } {
    if (!isPlainObject(options)) {
        return { featureOptions: (options ?? {}) as Omit<T, 'interceptor' | 'multiOrder'> };
    }
    const { interceptor, multiOrder, ...featureOptions } = options as T;
    return { featureOptions, interceptor, multiOrder };
}

function createFeatureInterceptorProvider(config: ServiceConfig, fallback: any, interceptor: ProvdierOf<RequestInterceptorLike> | undefined, multiOrder: number): Provider {
    if (!interceptor) {
        return {
            provide: getServiceInterceptorsToken(config),
            useExisting: fallback,
            multi: true,
            multiOrder
        } as any;
    }
    const provider = toProvider(getServiceInterceptorsToken(config), interceptor, true) as Provider & { multiOrder?: number };
    provider.multiOrder = multiOrder;
    return provider;
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
export function useFeatures(options?: ServiceFeatureOptions): ServiceFeatureFn<Exclude<ServiceFeatureKind, ServiceFeatureKind.Transport>> {
    return (config) => {
        const features: any[] = [];
        const opts = { ...defaultServiceOptions, ...options };

        if (opts.filters) {
            features.push(useFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(useInterceptors(...opts.interceptors)(config));
        }
        if (opts.middlewares) {
            features.push(useMiddlewares(...opts.middlewares)(config));
        }
        if (opts.guards) {
            features.push(useGuards(...opts.guards)(config));
        }
        if (opts.logger) {
            features.push(useLogger(isBoolean(opts.logger) ? undefined : opts.logger)(config));
        }
        if (opts.sender) {
            if (isBoolean(opts.sender)) {
                features.push(useSender()(config));
            } else {
                features.push(useSender(opts.sender as any)(config));
            }
        }
        if (opts.router) {
            features.push(useRouter(isBoolean(opts.router) ? undefined : opts.router)(config));
        }

        features.push(useTransfers(...(opts.transfers ?? []))(config));

        if (opts.bodyparser) {
            features.push(useBodyParser(isBoolean(opts.bodyparser) ? undefined : opts.bodyparser)(config));
        }
        if (opts.bodySerializer) {
            features.push(useBodySerializer(isBoolean(opts.bodySerializer) ? undefined : opts.bodySerializer)(config));
        }
        if (opts.content) {
            features.push(useStatics(isBoolean(opts.content) ? undefined : opts.content)(config));
        }
        if (opts.json) {
            features.push(useJson(isBoolean(opts.json) ? undefined : opts.json)(config));
        }
        if (opts.session) {
            features.push(useSession(isBoolean(opts.session) ? undefined : opts.session)(config));
        }
        if (opts.cookie) {
            features.push(useCookie(isBoolean(opts.cookie) ? undefined : opts.cookie)(config));
        }
        if (opts.cors) {
            features.push(useCors(isBoolean(opts.cors) ? undefined : opts.cors)(config));
        }
        if (opts.auth) {
            features.push(useAuth(isBoolean(opts.auth) ? undefined : opts.auth)(config));
        }

        if (opts.registration) {
            features.push(useRegistration(opts.registration)(config));
        }
        if (opts.health) {
            features.push(useHealth(opts.health)(config));
        }
        if (opts.gracefulShutdown) {
            features.push(useGracefulShutdown(opts.gracefulShutdown)(config));
        }

        return features.flatMap(r => r);
    };
}


/**
 * Adds service registration, like Spring Cloud Eureka/Consul.
 * @publicApi
 */
export function useRegistration(options?: boolean | RegistrationOptions): ServiceFeatureFn<ServiceFeatureKind.Registration> {
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
export function useHealth(options?: boolean | HealthOptions): ServiceFeatureFn<ServiceFeatureKind.Health> {
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
export function useGracefulShutdown(options?: boolean | GracefulShutdownOptions): ServiceFeatureFn<ServiceFeatureKind.GracefulShutdown> {
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
export function useInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
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
export function useGuards(...guards: ProvdierOf<GuardLike>[]): ServiceFeatureFn<ServiceFeatureKind.Guards> {
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
export function useFilters(...filters: ProvdierOf<RequestFilterLike>[]): ServiceFeatureFn<ServiceFeatureKind.Filters> {
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
export function useMiddlewares(...middlewares: ProvdierOf<MiddlewareLike>[]): ServiceFeatureFn<ServiceFeatureKind.Middlewares> {
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
export function useTransfers(...selectors: TransferInterceptorFactory[]): ServiceFeatureFn<ServiceFeatureKind.Transfer> {
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
export function useLogger(options?: LoggerOptions): ServiceFeatureFn<ServiceFeatureKind.Logger> {
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

/**
 * Adds Sender filter to transport.
 * The sender filter wraps the handler chain so *every* result (success or
 * error) is written to the native response via the request's
 * MessageAdapter, and errors are re-thrown for upstream filters
 * (e.g. Logger) to observe.
 *
 * @param sender  Optional concrete filter class for this transport.
 *                When omitted the DI-resolved SenderFilter is used.
 */
export function useSender(sender?: Type<RequestFilter>): ServiceFeatureFn<ServiceFeatureKind.Sender> {
    return (config) => {
        const tk = getServiceFiltersToken(config);
        return makeServiceFeature(
            ServiceFeatureKind.Sender,
            [
                sender
                    ? { provide: tk, useClass: sender, multi: true }
                    : { provide: tk, useExisting: SenderFilter, multi: true },
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
export function useRouter(options?: any): ServiceFeatureFn<ServiceFeatureKind.Router> {
    return (config) => {
        const tk = getServiceInterceptorsToken(config);
        const routerToken = getServiceRouterToken(config);
        const routerOptions = options ?? (isBoolean(config.features.router) ? undefined : config.features.router);
        const providers: Provider[] = [
            ...createRouteProviders(config, routerToken, routerOptions),
            {
                provide: tk,
                useExisting: routerToken,
                multi: true
            }
        ];
        if (isBoolean(options?.microservice) && config.microservice !== options.microservice) {
            const cfg = {
                ...config,
                microservice: options.microservice,
                features: { ...config.features, routerToken: undefined }
            };
            providers.push(...createRouteProviders(cfg, undefined, routerOptions));
        }
        return makeServiceFeature(
            ServiceFeatureKind.Router,
            providers,
            config
        );
    };
}


/**
 * Adds body parser to micro service.
 * Protocol implementations handle the actual parsing.
 * @publicApi
 */
export function useBodyParser(options?: any): ServiceFeatureFn<ServiceFeatureKind.BodyParser> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.BodyParser,
            [
                { provide: SERVICE_BODY_PARSER_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, BodyParserInterceptor, resolved.interceptor, resolved.multiOrder ?? -1000)
            ],
            config
        );
    };
}

/**
 * Adds body serializer to micro service.
 * @publicApi
 */
export function useBodySerializer(options?: any): ServiceFeatureFn<ServiceFeatureKind.BodySerializer> {
    return (config) => {
        return makeServiceFeature(
            ServiceFeatureKind.BodySerializer,
            [
                { provide: SERVICE_BODY_SERIALIZER_OPTIONS, useValue: options ?? {} }
            ],
            config
        );
    };
}

/**
 * Adds static file serving to micro service.
 * @publicApi
 */
export function useStatics(options?: any): ServiceFeatureFn<ServiceFeatureKind.Content> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Content,
            [
                { provide: SERVICE_STATICS_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, ContentInterceptor, resolved.interceptor, resolved.multiOrder ?? 0)
            ],
            config
        );
    };
}

/** @deprecated use useStatics */
export const useContent = useStatics;

/**
 * Adds JSON serialization to micro service.
 * @publicApi
 */
export function useJson(options?: any): ServiceFeatureFn<ServiceFeatureKind.Json> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Json,
            [
                { provide: SERVICE_JSON_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, JsonInterceptor, resolved.interceptor, resolved.multiOrder ?? 1000)
            ],
            config
        );
    };
}

/**
 * Adds session management to micro service.
 * @publicApi
 */
export function useSession(options?: any): ServiceFeatureFn<ServiceFeatureKind.Session> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Session,
            [
                { provide: SERVICE_SESSION_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, SessionInterceptor, resolved.interceptor, resolved.multiOrder ?? -500)
            ],
            config
        );
    };
}

/**
 * Adds cookie handling to micro service.
 * @publicApi
 */
export function useCookie(options?: CookieOptions): ServiceFeatureFn<ServiceFeatureKind.Cookie> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Cookie,
            [
                { provide: SERVICE_COOKIE_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, CookieInterceptor, resolved.interceptor, resolved.multiOrder ?? -400)
            ],
            config
        );
    };
}

/**
 * Adds CORS handling to micro service.
 * @publicApi
 */
export function useCors(options?: CorsOptions): ServiceFeatureFn<ServiceFeatureKind.Cors> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Cors,
            [
                { provide: SERVICE_CORS_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, CorsInterceptor, resolved.interceptor, resolved.multiOrder ?? -900)
            ],
            config
        );
    };
}

export function useAuth(options?: AuthOptions): ServiceFeatureFn<ServiceFeatureKind.Interceptors> {
    return (config) => {
        const resolved = resolveFeatureOptions(options);
        return makeServiceFeature(
            ServiceFeatureKind.Interceptors,
            [
                { provide: SERVICE_AUTH_OPTIONS, useValue: resolved.featureOptions },
                createFeatureInterceptorProvider(config, AuthInterceptor, resolved.interceptor, resolved.multiOrder ?? -300)
            ],
            config
        );
    };
}

export const SERVICE_REGISTRATION_OPTIONS = token<RegistrationOptions>('SERVICE_REGISTRATION_OPTIONS');
export const SERVICE_HEALTH_OPTIONS = token<HealthOptions>('SERVICE_HEALTH_OPTIONS');
export const SERVICE_GRACEFUL_SHUTDOWN_OPTIONS = token<GracefulShutdownOptions>('SERVICE_GRACEFUL_SHUTDOWN_OPTIONS');

export const SERVICE_STATICS_OPTIONS = token<any>('SERVICE_STATICS_OPTIONS');
/** @deprecated use SERVICE_STATICS_OPTIONS */
export const SERVICE_CONTENT_OPTIONS = SERVICE_STATICS_OPTIONS;
export const SERVICE_AUTH_OPTIONS = token<any>('SERVICE_AUTH_OPTIONS');
export const SERVICE_BODY_PARSER_OPTIONS = token<any>('SERVICE_BODY_PARSER_OPTIONS');
export const SERVICE_BODY_SERIALIZER_OPTIONS = token<any>('SERVICE_BODY_SERIALIZER_OPTIONS');
export const SERVICE_JSON_OPTIONS = token<any>('SERVICE_JSON_OPTIONS');
export const SERVICE_SESSION_OPTIONS = token<any>('SERVICE_SESSION_OPTIONS');
export const SERVICE_COOKIE_OPTIONS = token<any>('SERVICE_COOKIE_OPTIONS');
export const SERVICE_CORS_OPTIONS = token<any>('SERVICE_CORS_OPTIONS');
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
                    features.push(useFeatures(config.features));
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
