"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERV_OPTIONS = exports.SERVICE_CONFIGS = exports.FeatureKind = void 0;
exports.provideService = provideService;
exports.provideServiceFromDi = provideServiceFromDi;
exports.makeFeature = makeFeature;
exports.withFeatures = withFeatures;
exports.withGuards = withGuards;
exports.withLogger = withLogger;
exports.withExceptionFilter = withExceptionFilter;
exports.withFilters = withFilters;
exports.withJson = withJson;
exports.withSession = withSession;
exports.withContent = withContent;
exports.withBodyparser = withBodyparser;
exports.withRouter = withRouter;
exports.withRequestVaildate = withRequestVaildate;
exports.withResponseVaildate = withResponseVaildate;
exports.withGlobalInterceptors = withGlobalInterceptors;
exports.withInterceptors = withInterceptors;
exports.withMiddlewares = withMiddlewares;
exports.withControllers = withControllers;
exports.withTransfers = withTransfers;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const interceptors_1 = require("./interceptors");
const router_providers_1 = require("./router/router.providers");
const typed_respond_1 = require("./typed.respond");
const SetupServices_1 = require("./SetupServices");
const tokens_1 = require("./tokens");
const mime_module_1 = require("./mime.module");
const exception_handlers_1 = require("./filters/exception.handlers");
const middleware_1 = require("./middleware/middleware");
const rxjs_1 = require("rxjs");
const finallize_fitler_1 = require("./filters/finallize.fitler");
/**
 * Identifies a particular kind of `Feature`.
 *
 * @publicApi
 */
var FeatureKind;
(function (FeatureKind) {
    FeatureKind[FeatureKind["Configure"] = 0] = "Configure";
    FeatureKind[FeatureKind["Transfer"] = 1] = "Transfer";
    // Context,
    FeatureKind[FeatureKind["Logger"] = 2] = "Logger";
    FeatureKind[FeatureKind["Exception"] = 3] = "Exception";
    FeatureKind[FeatureKind["Filters"] = 4] = "Filters";
    FeatureKind[FeatureKind["GlobalInterceptors"] = 5] = "GlobalInterceptors";
    FeatureKind[FeatureKind["Guards"] = 6] = "Guards";
    FeatureKind[FeatureKind["Csrf"] = 7] = "Csrf";
    FeatureKind[FeatureKind["Helmet"] = 8] = "Helmet";
    FeatureKind[FeatureKind["Cors"] = 9] = "Cors";
    FeatureKind[FeatureKind["Session"] = 10] = "Session";
    FeatureKind[FeatureKind["Authenticate"] = 11] = "Authenticate";
    FeatureKind[FeatureKind["Content"] = 12] = "Content";
    FeatureKind[FeatureKind["Json"] = 13] = "Json";
    FeatureKind[FeatureKind["Bodyparser"] = 14] = "Bodyparser";
    FeatureKind[FeatureKind["Vaildate"] = 15] = "Vaildate";
    FeatureKind[FeatureKind["Interceptors"] = 16] = "Interceptors";
    FeatureKind[FeatureKind["Middlewares"] = 17] = "Middlewares";
    FeatureKind[FeatureKind["Router"] = 18] = "Router";
    FeatureKind[FeatureKind["Controller"] = 19] = "Controller";
    FeatureKind[FeatureKind["Transport"] = 20] = "Transport";
})(FeatureKind || (exports.FeatureKind = FeatureKind = {}));
/**
 * provide service with optioos.
 * @param options
 * @param autoBootstrap default true
 */
function provideService(...features) {
    const allFeatures = features.flatMap(f => f);
    const transports = allFeatures.filter(f => !(0, ioc_1.isFunction)(f) && f.kind === FeatureKind.Transport);
    if (!transports.length) {
        throw new ioc_1.ArgumentException('endpoint transport feature is required.');
    }
    const providers = [
        (0, common_1.provideIncomings)(),
        (0, common_1.provideOutgoings)(),
        finallize_fitler_1.FinallizeFilter,
        common_1.RequestExceptionHandlerFilter,
        SetupServices_1.SetupServices,
        mime_module_1.MimeModule,
        typed_respond_1.EndpointTypedRespond,
        interceptors_1.BodyparserInterceptor,
        interceptors_1.ContentInterceptor,
        interceptors_1.JsonInterceptor,
        interceptors_1.SessionInterceptor,
        common_1.LoggerInterceptor
    ];
    transports.forEach(ts => {
        const kinds = new Map();
        const config = ts.config;
        allFeatures.forEach(f => {
            if (f.kind === FeatureKind.Transport) {
                return;
            }
            const fs = (0, ioc_1.isFunction)(f) ? f(config) : f;
            ((0, ioc_1.isArray)(fs) ? fs : [fs]).forEach(feature => {
                if (feature.config && !(0, common_1.matchTransport)(feature.config, config)) {
                    return;
                }
                const pdrs = kinds.get(feature.kind);
                if (pdrs) {
                    pdrs.push(...feature.providers);
                }
                else {
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
            providers.push(...kinds.get(k));
        });
        providers.push(...ts.providers);
    });
    return providers;
}
exports.SERVICE_CONFIGS = (0, ioc_1.token)('SEARVICES_CONFIGS');
exports.SERV_OPTIONS = (0, ioc_1.token)('SERV_OPTIONS');
function provideServiceFromDi(options) {
    return [
        {
            provider: (injector) => {
                const configs = injector.get(exports.SERVICE_CONFIGS, []).filter(c => (0, common_1.matchTransport)(options, c));
                if (!configs?.length)
                    throw new ioc_1.ArgumentException(`messings ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                const featires = [];
                const transports = [];
                configs.forEach(config => {
                    // if (!config.features) throw new ArgumentException(`messings featires ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    if (!config.transportFeature)
                        throw new ioc_1.ArgumentException(`messings transportFeature ${options.transport}${options.microservice ? ' microservice' : ''} service configure` + (options.name ? `, ailas with name ${options.name}` : ''));
                    featires.push(withFeatures(config.features));
                    transports.push(config.transportFeature(config, configs.length == 1 && config.asDefault));
                });
                return provideService(...featires, transports);
            }
        }
    ];
}
function makeFeature(kind, providers, config) {
    return {
        kind,
        config,
        providers
    };
}
const defaultOptions = {
    logger: true,
    bodyparser: true,
    content: false,
    json: false,
    router: true
};
function withFeatures(options) {
    return (config) => {
        const features = [];
        const opts = { ...defaultOptions, ...options };
        if (opts.filters) {
            features.push(withFilters(...opts.filters)(config));
        }
        if (opts.interceptors) {
            features.push(withInterceptors(...opts.interceptors)(config));
        }
        if (opts.middlewares) {
            features.push(withMiddlewares(...opts.middlewares)(config));
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
            features.push(withLogger((0, ioc_1.isBoolean)(opts.logger) ? undefined : opts.logger)(config));
        }
        features.push(withExceptionFilter({
            filter: opts.exceptionFilter,
            handlers: opts.exceptionHandlers
        })(config));
        // features.push(withContextFactory(opts.contextFactory)(config));
        if (opts.session) {
            features.push(withSession((0, ioc_1.isBoolean)(opts.session) ? undefined : opts.session)(config));
        }
        if (opts.content) {
            features.push(withContent((0, ioc_1.isBoolean)(opts.content) ? undefined : opts.content)(config));
        }
        if (opts.bodyparser) {
            features.push(withBodyparser((0, ioc_1.isBoolean)(opts.bodyparser) ? undefined : opts.bodyparser)(config));
        }
        if (opts.router) {
            features.push(withRouter((0, ioc_1.isBoolean)(opts.router) ? undefined : opts.router)(config));
        }
        if (opts.transfers) {
            features.push(withTransfers(...opts.transfers)(config));
        }
        return features.flatMap(r => r);
    };
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
function withGuards(...guards) {
    return (config) => {
        const token = (0, tokens_1.getGuardsToken)(config);
        return makeFeature(FeatureKind.Guards, guards.map((f) => (0, ioc_1.toProvider)(token, f, true)), config);
    };
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
function withLogger(options) {
    return (config) => {
        const token = (0, tokens_1.getFiltersToken)(config);
        return makeFeature(FeatureKind.Logger, [
            {
                provide: token,
                useClass: common_1.LoggerInterceptor,
                deps: [
                    common_1.ResponseStatusFormater,
                    { value: options }
                ],
                multi: true
            }
        ], config);
    };
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
function withExceptionFilter(options) {
    return (config) => {
        const token = (0, tokens_1.getFiltersToken)(config);
        const providers = [
            options?.finallize ? (0, ioc_1.toProvider)(token, options.finallize, true) : { provide: token, useExisting: finallize_fitler_1.FinallizeFilter, multi: true }
        ];
        if (options?.filter) {
            providers.push((0, ioc_1.toProvider)(token, options.filter, true));
        }
        else {
            providers.push({ provide: token, useExisting: common_1.RequestExceptionHandlerFilter, multi: true });
        }
        if (options?.handlers?.length) {
            providers.push(...options.handlers);
        }
        else {
            providers.push(exception_handlers_1.DefaultExceptionHandlers);
        }
        return makeFeature(FeatureKind.Exception, providers, config);
    };
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
function withFilters(...filters) {
    return (config) => {
        const token = (0, tokens_1.getFiltersToken)(config);
        return makeFeature(FeatureKind.Filters, filters.map((f) => (0, ioc_1.toProvider)(token, f, true)), config);
    };
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
function withJson(options) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Json, [
            {
                provide: token,
                useClass: interceptors_1.JsonInterceptor,
                deps: [
                    { value: options }
                ],
                multi: true
            }
        ], config);
    };
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
function withSession(options) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Session, [
            {
                provide: token,
                useClass: interceptors_1.SessionInterceptor,
                deps: [
                    { value: options }
                ],
                multi: true
            }
        ], config);
    };
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
function withContent(options) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Content, [
            {
                provide: token,
                useClass: interceptors_1.ContentInterceptor,
                deps: [
                    { value: options }
                ],
                multi: true
            }
        ], config);
    };
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
function withBodyparser(options) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Bodyparser, [
            {
                provide: token,
                useClass: interceptors_1.BodyparserInterceptor,
                deps: [
                    { value: options }
                ],
                multi: true
            }
        ], config);
    };
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
function withRouter(options) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        const routerToken = (0, tokens_1.getRouterToken)(config);
        const providers = [
            ...(0, router_providers_1.createRouteProviders)(config, routerToken, options),
            {
                provide: token,
                useExisting: routerToken,
                multi: true
            }
        ];
        if ((0, ioc_1.isBoolean)(options?.microservice) && config.microservice !== options.microservice) {
            const cfg = { ...config, routerToken: undefined, microservice: options.microservice };
            providers.push((0, router_providers_1.createRouteProviders)(cfg, routerToken, options));
        }
        return makeFeature(FeatureKind.Router, providers, config);
    };
}
/**
 * Adds one or more service interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
function withRequestVaildate(...vaildators) {
    return (config) => {
        const token = (0, tokens_1.getRequestVaildatorsToken)(config);
        const intToken = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Vaildate, [
            ...vaildators.map(v => (0, ioc_1.toProvider)(token, v, true)),
            {
                provide: intToken,
                useValue: ((req, next, context) => {
                    const vaildators = context.get(token);
                    if (vaildators?.length) {
                        return (0, rxjs_1.defer)(async () => {
                            for (const vaildator of vaildators) {
                                const vaild = await (0, ioc_1.toPromise)((0, ioc_1.isFunction)(vaildator) ? vaildator(req, context) : vaildator.vaild(req, context));
                                if (!vaild.status)
                                    return vaild;
                            }
                            return null;
                        })
                            .pipe((0, rxjs_1.mergeMap)((r => {
                            if (r)
                                return (0, rxjs_1.throwError)(() => new common_1.BadRequestException(r.message));
                            return next(req, context);
                        })));
                    }
                    return next(req, context);
                }),
                multi: true
            }
        ], config);
    };
}
/**
 * Adds one or more service interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
function withResponseVaildate(...vaildators) {
    return (config) => {
        const token = (0, tokens_1.getResponseVaildatorsToken)(config);
        const intToken = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Vaildate, [
            ...vaildators.map(v => (0, ioc_1.toProvider)(token, v, true)),
            {
                provide: intToken,
                useValue: ((req, next, context) => {
                    const vaildators = context.get(token);
                    if (vaildators?.length) {
                        return next(req, context)
                            .pipe((0, rxjs_1.mergeMap)(async (res) => {
                            for (const vaildator of vaildators) {
                                const vaild = await (0, ioc_1.toPromise)((0, ioc_1.isFunction)(vaildator) ? vaildator(req, context) : vaildator.vaild(req, context));
                                if (!vaild.status) {
                                    throw new common_1.InternalServerException(vaild.message);
                                }
                            }
                            return res;
                        }));
                    }
                    return next(req, context);
                }),
                multi: true
            }
        ], config);
    };
}
/**
 * Adds one or more interceptors after `Filters`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
function withGlobalInterceptors(...interceptors) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.GlobalInterceptors, interceptors.map((u) => (0, ioc_1.toProvider)(token, u, true)), config);
    };
}
/**
 * Adds one or more service interceptors after `Vaildate`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
function withInterceptors(...interceptors) {
    return (config) => {
        const token = (0, tokens_1.getInterceptorsToken)(config);
        return makeFeature(FeatureKind.Interceptors, interceptors.map((u) => (0, ioc_1.toProvider)(token, u, true)), config);
    };
}
/**
 * use middlewares
 * @param middlewares
 * @returns
 */
function withMiddlewares(...middlewares) {
    return (config) => {
        const token = (0, tokens_1.getMiddlewaresToken)(config);
        const providers = middlewares.map((u) => (0, ioc_1.toProvider)(token, u, true));
        const interToken = (0, tokens_1.getInterceptorsToken)(config);
        providers.push({
            provide: interToken,
            useFactory: (middlewares) => (0, middleware_1.convertToInterceptor)((0, middleware_1.composeMiddleware)(middlewares)),
            multi: true,
            deps: [token]
        });
        return makeFeature(FeatureKind.Middlewares, providers, config);
    };
}
/**
 * Adds one or more service controllers to the configuration of the `Service`
 * instance.
 *
 * @see {@link provideService}
 * @publicApi
 */
function withControllers(controllers) {
    return (config) => {
        return makeFeature(FeatureKind.Controller, controllers, config);
    };
}
/**
 * Adds one or more service transfers interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
function withTransfers(...selectors) {
    return (config) => {
        const token = (0, tokens_1.getTransfersToken)(config);
        const providers = [];
        if (!selectors.length) {
            selectors.push((0, common_1.useSimpleJson)());
        }
        selectors.forEach((fac) => {
            const itps = fac(config);
            if ((0, ioc_1.isArray)(itps)) {
                providers.push(...(0, ioc_1.toProviders)(token, itps, true));
            }
            else {
                providers.push((0, ioc_1.toProvider)(token, itps, true));
            }
        });
        return makeFeature(FeatureKind.Transfer, providers, config);
    };
}
//# sourceMappingURL=provider.js.map