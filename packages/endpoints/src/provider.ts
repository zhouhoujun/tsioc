import { ArgumentException, ProvdierOf, Provider, StaticProvider, Type, isArray, isBoolean, isFunction, toPromise, toProvider, toProviders, token } from '@tsdi/ioc';
import { GuardLike, VaildatorLike, ValidateResult } from '@tsdi/core';
import {
    matchTransport, RequestInterceptorLike, TransferInterceptorFactory,
    useSimpleJson, LoggerInterceptor, LoggerOptions, ResponseStatusFormater,
    provideIncomings, provideOutgoings, TransportConfig, RequestFilterLike,
    RequestExceptionFilter, RequestExceptionHandlerFilter, RequestInterceptorFn,
    Incoming, RequestContext, BadRequestException, InternalServerException, Outgoing
} from '@tsdi/common';
import {
    BodyparserInterceptor, ContentInterceptor, ContentOptions, JsonInterceptor, JsonOptions, BodyparserOptions, SessionInterceptor
} from './interceptors';
import { createRouteProviders, RouteOpts } from './router/router.providers';
import { EndpointTypedRespond } from './typed.respond';
import { SetupServices } from './SetupServices';
import { getFiltersToken, getGuardsToken, getInterceptorsToken, getMiddlewaresToken, getRequestVaildatorsToken, getResponseVaildatorsToken, getRouterToken, getTransfersToken } from './tokens';
import { MimeModule } from './mime.module';
import { SessionOptions } from './sessions/Session';
import { FeatureOptions, ServiceConfig } from './server.options';
import { DefaultExceptionHandlers } from './filters/exception.handlers';
import { composeMiddleware, convertToInterceptor, MiddlewareLike } from './middleware/middleware';
import { defer, mergeMap, of, throwError } from 'rxjs';
import { FinallizeFilter } from './filters/finallize.fitler';


/**
 * Identifies a particular kind of `Feature`.
 *
 * @publicApi
 */
export enum FeatureKind {
    Configure,
    Transfer,
    // Context,
    Logger,
    Exception,
    Filters,
    GlobalInterceptors,
    Guards,
    Csrf,
    Helmet,
    Cors,
    Session,
    Authenticate,
    Content,
    Json,
    Bodyparser,
    Vaildate,
    Interceptors,
    Middlewares,
    Router,
    Controller,
    Transport
}


export interface Feature<Kind extends FeatureKind = FeatureKind> {
    kind: Kind;
    config?: ServiceConfig;
    providers: Provider[];
}


export interface TransportFeature {
    kind: FeatureKind.Transport;
    config: ServiceConfig;
    providers: Provider[];
}

export type FeatureFn<Kind extends Exclude<FeatureKind, FeatureKind.Transport>> = (config: ServiceConfig) => Feature<Kind> | Feature<Kind>[];


export type FeatureLike<Kind extends FeatureKind> = Feature<Kind> | Feature<Kind>[] | FeatureFn<Exclude<Kind, FeatureKind.Transport>> | FeatureFn<Exclude<Kind, FeatureKind.Transport>>[];


/**
 * provide service with optioos.
 * @param options 
 * @param autoBootstrap default true 
 */
export function provideService(...features: FeatureLike<FeatureKind>[]): Provider[] {
    const allFeatures = features.flatMap(f => f as (Feature<FeatureKind> | FeatureFn<Exclude<FeatureKind, FeatureKind.Transport>>));
    const transports = allFeatures.filter(f => !isFunction(f) && f.kind === FeatureKind.Transport) as TransportFeature[];
    if (!transports.length) {
        throw new ArgumentException('endpoint transport feature is required.');
    }

    const providers: Provider[] = [
        provideIncomings(),
        provideOutgoings(),
        FinallizeFilter,
        RequestExceptionHandlerFilter,
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
        allFeatures.forEach(f => {
            if ((f as TransportFeature).kind === FeatureKind.Transport) {
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
        //     throw new ArgumentException(`messings ${config.transport}${config.microservice ? ' microservice' : ''} service configure` + (config.name ? `, ailas with name ${config.name}` : ''));
        // }


        // if (!kinds.has(FeatureKind.Transport)) {
        //     throw new ArgumentException(`messings ${config.transport}${config.microservice ? ' microservice' : ''} service transport` + (config.name ? `, ailas with name ${config.name}` : ''));
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


export interface ServiceOptions<TSerOpts = any> extends ServiceConfig<TSerOpts> {
    features?: FeatureOptions;
    transportFeature?: (options: ServiceOptions<TSerOpts>, asDefault?: boolean) => TransportFeature;
}

export const SERVICE_CONFIGS = token<ServiceOptions[]>('SEARVICES_CONFIGS');
export const SERV_OPTIONS = token<ServiceOptions>('SERV_OPTIONS')

export function provideServiceFromDi(options: TransportConfig): Provider[] {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(SERVICE_CONFIGS, []).filter(c => matchTransport(options, c));
                if (!configs?.length) throw new ArgumentException(`messings ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                const featires: FeatureLike<FeatureKind>[] = [];
                const transports: TransportFeature[] = [];
                configs.forEach(config => {
                    // if (!config.features) throw new ArgumentException(`messings featires ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    if (!config.transportFeature) throw new ArgumentException(`messings transportFeature ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));

                    featires.push(withFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault))
                });

                return provideService(
                    ...featires,
                    transports
                ) as StaticProvider[];
            }
        }
    ]
}



export function makeFeature<T extends FeatureKind>(kind: T, providers: Provider[], config?: ServiceConfig): Feature<T> {
    return {
        kind,
        config,
        providers
    }
}

const defaultOptions: FeatureOptions = {
    logger: true,
    bodyparser: true,
    content: false,
    json: false,
    router: true
};



export function withFeatures(options?: FeatureOptions): FeatureFn<Exclude<FeatureKind, FeatureKind.Transport>> {

    return (config) => {
        const features: any[] = [];
        const opts = { ...defaultOptions, ...options };

        if (opts.filters) {
            features.push(withFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withInterceptors(...opts.interceptors)(config));
        }

        if (opts.middlewares) {
            features.push(withMiddlewares(...opts.middlewares)(config))
        }
        if (opts.guards) {
            features.push(withGuards(...opts.guards)(config));
        }

        if (opts.requestVaildators) {
            features.push(withRequestVaildate(...opts.requestVaildators)(config));
        }
        if (opts.responseVaildators) {
            features.push(withResponseVaildate(...opts.responseVaildators)(config));
        }

        if (opts.logger) {
            features.push(withLogger(isBoolean(opts.logger) ? undefined : opts.logger)(config))
        }

        features.push(withExceptionFilter({
            filter: opts.exceptionFilter,
            handlers: opts.exceptionHandlers
        })(config));

        // features.push(withContextFactory(opts.contextFactory)(config));

        if (opts.session) {
            features.push(withSession(isBoolean(opts.session) ? undefined : opts.session)(config));
        }

        if (opts.content) {
            features.push(withContent(isBoolean(opts.content) ? undefined : opts.content)(config));
        }
        if (opts.bodyparser) {
            features.push(withBodyparser(isBoolean(opts.bodyparser) ? undefined : opts.bodyparser)(config))
        }

        if (opts.router) {
            features.push(withRouter(isBoolean(opts.router) ? undefined : opts.router)(config))
        }

        if (opts.transfers) {
            features.push(withTransfers(...opts.transfers)(config));
        }

        return features.flatMap(r => r);
    }
}

/**
 * 
 * Add guards to the configuration of the `Service`
 * instance.
 *
 * @see {@link FilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param guards 
 * @returns
 */
export function withGuards(...guards: ProvdierOf<GuardLike>[]): FeatureFn<FeatureKind.Guards> {
    return (config) => {
        const token = getGuardsToken(config);
        return makeFeature(
            FeatureKind.Guards,
            guards.map((f) => toProvider(token, f, true)),
            config
        );
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
export function withLogger(options?: LoggerOptions): FeatureFn<FeatureKind.Logger> {
    return (config) => {
        const token = getFiltersToken(config)

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
 * Adds execption filter to the configuration of the `Service`
 * instance.
 *
 * @see {@link FilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param options 
 * @returns 
 */
export function withExceptionFilter(options?: {
    filter?: ProvdierOf<RequestExceptionFilter>;
    finallize?: ProvdierOf<RequestExceptionFilter>;
    handlers?: Type[];
}): FeatureFn<FeatureKind.Exception> {
    return (config) => {
        const token = getFiltersToken(config);

        const providers: Provider[] = [
            options?.finallize ? toProvider(token, options.finallize, true) : { provide: token, useExisting: FinallizeFilter, multi: true }
        ];
        if (options?.filter) {
            providers.push(toProvider(token, options.filter, true))
        } else {
            providers.push({ provide: token, useExisting: RequestExceptionHandlerFilter, multi: true });
        }
        if (options?.handlers?.length) {
            providers.push(...options.handlers);
        } else {
            providers.push(DefaultExceptionHandlers)
        }

        return makeFeature(
            FeatureKind.Exception,
            providers,
            config
        );
    }
}
/**
 * 
 * Add filters to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestFilterLike}
 * @see {@link provideService}
 * @publicApi
 * 
 * @param filters 
 * @returns
 */
export function withFilters(...filters: ProvdierOf<RequestFilterLike>[]): FeatureFn<FeatureKind.Filters> {
    return (config) => {
        const token = getFiltersToken(config);
        return makeFeature(
            FeatureKind.Filters,
            filters.map((f) => toProvider(token, f, true)),
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
        const token = getInterceptorsToken(config);
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
        const token = getInterceptorsToken(config);
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
        const token = getInterceptorsToken(config);
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
export function withBodyparser(options?: BodyparserOptions): FeatureFn<FeatureKind.Bodyparser> {
    return (config) => {
        const token = getInterceptorsToken(config);
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

        const token = getInterceptorsToken(config);
        const routerToken = getRouterToken(config);
        const providers: Provider[] = [
            ...createRouteProviders(config, routerToken, options),
            {
                provide: token,
                useExisting: routerToken,
                multi: true
            }
        ];
        if (isBoolean(options?.microservice) && config.microservice !== options.microservice) {
            const cfg = { ...config, routerToken: undefined, microservice: options.microservice }
            providers.push(createRouteProviders(cfg, routerToken, options))
        }
        return makeFeature(
            FeatureKind.Router,
            providers,
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
export function withRequestVaildate(...vaildators: ProvdierOf<VaildatorLike<Incoming, RequestContext>>[]): FeatureFn<FeatureKind.Vaildate> {
    return (config) => {
        const token = getRequestVaildatorsToken(config);
        const intToken = getInterceptorsToken(config);
        return makeFeature(
            FeatureKind.Vaildate,
            [
                ...vaildators.map(v => toProvider(token, v, true)),
                {
                    provide: intToken,
                    useValue: ((req, next, context) => {
                        const vaildators = context.get(token);
                        if (vaildators?.length) {
                            return defer(async () => {
                                for (const vaildator of vaildators) {
                                    const vaild = await toPromise<ValidateResult>(isFunction(vaildator) ? vaildator(req, context) : vaildator.vaild(req, context));
                                    if (!vaild.status) return vaild;
                                }
                                return null;
                            })
                                .pipe(
                                    mergeMap((r => {
                                        if (r) return throwError(() => new BadRequestException((r as ValidateResult).message));
                                        return next(req, context)
                                    })
                                    ));

                        }

                        return next(req, context);
                    }) as RequestInterceptorFn,
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
export function withResponseVaildate(...vaildators: ProvdierOf<VaildatorLike<Outgoing, RequestContext>>[]): FeatureFn<FeatureKind.Vaildate> {
    return (config) => {
        const token = getResponseVaildatorsToken(config);
        const intToken = getInterceptorsToken(config);
        return makeFeature(
            FeatureKind.Vaildate,
            [
                ...vaildators.map(v => toProvider(token, v, true)),
                {
                    provide: intToken,
                    useValue: ((req, next, context) => {
                        const vaildators = context.get(token);
                        if (vaildators?.length) {
                            return next(req, context)
                                .pipe(
                                    mergeMap(async res => {
                                        for (const vaildator of vaildators) {
                                            const vaild = await toPromise<ValidateResult>(isFunction(vaildator) ? vaildator(req, context) : vaildator.vaild(req, context));
                                            if (!vaild.status) {
                                                throw new InternalServerException(vaild.message);
                                            }
                                        }
                                        return res;
                                    })
                                );
                        }

                        return next(req, context);

                    }) as RequestInterceptorFn,
                    multi: true
                }
            ],
            config
        );
    }
}

/**
 * Adds one or more interceptors after `Filters`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export function withGlobalInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.GlobalInterceptors> {
    return (config) => {
        const token = getInterceptorsToken(config);
        return makeFeature(
            FeatureKind.GlobalInterceptors,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}

/**
 * Adds one or more service interceptors after `Vaildate`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export function withInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.Interceptors> {
    return (config) => {
        const token = getInterceptorsToken(config);
        return makeFeature(
            FeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}

/**
 * use middlewares
 * @param middlewares 
 * @returns 
 */
export function withMiddlewares(...middlewares: ProvdierOf<MiddlewareLike>[]): FeatureFn<FeatureKind.Middlewares> {
    return (config) => {
        const token = getMiddlewaresToken(config);
        const providers = middlewares.map((u) => toProvider(token, u, true)) as Provider[];

        const interToken = getInterceptorsToken(config);
        providers.push({
            provide: interToken,
            useFactory: (middlewares: MiddlewareLike[]) => convertToInterceptor(composeMiddleware(middlewares)),
            multi: true,
            deps: [token]
        })
        return makeFeature(
            FeatureKind.Middlewares,
            providers,
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
export function withTransfers(...selectors: TransferInterceptorFactory[]): FeatureFn<FeatureKind.Transfer> {
    return (config) => {
        const token = getTransfersToken(config);
        const providers: Provider[] = [];
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
        return makeFeature(
            FeatureKind.Transfer,
            providers,
            config
        );
    }
}


