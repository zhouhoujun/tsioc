import { ProvdierOf, Provider, Type } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import { RequestInterceptorLike, TransferInterceptorFactory, LoggerOptions, TransportConfig, RequestFilterLike, RequestExceptionFilter, Incoming, RequestContext, Outgoing } from '@tsdi/common';
import { ContentOptions, JsonOptions, BodyparserOptions } from './interceptors';
import { RouteOpts } from './router/router.providers';
import { SessionOptions } from './sessions/Session';
import { FeatureOptions, ServiceConfig } from './server.options';
import { MiddlewareLike } from './middleware/middleware';
/**
 * Identifies a particular kind of `Feature`.
 *
 * @publicApi
 */
export declare enum FeatureKind {
    Configure = 0,
    Transfer = 1,
    Logger = 2,
    Exception = 3,
    Filters = 4,
    GlobalInterceptors = 5,
    Guards = 6,
    Csrf = 7,
    Helmet = 8,
    Cors = 9,
    Session = 10,
    Authenticate = 11,
    Content = 12,
    Json = 13,
    Bodyparser = 14,
    Vaildate = 15,
    Interceptors = 16,
    Middlewares = 17,
    Router = 18,
    Controller = 19,
    Transport = 20
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
export declare function provideService(...features: FeatureLike<FeatureKind>[]): Provider[];
export interface ServiceOptions<TSerOpts = any> extends ServiceConfig<TSerOpts> {
    features?: FeatureOptions;
    transportFeature?: (options: ServiceOptions<TSerOpts>, asDefault?: boolean) => TransportFeature;
}
export declare const SERVICE_CONFIGS: import("@tsdi/ioc").InjectToken<ServiceOptions<any>[]>;
export declare const SERV_OPTIONS: import("@tsdi/ioc").InjectToken<ServiceOptions<any>>;
export declare function provideServiceFromDi(options: TransportConfig): Provider[];
export declare function makeFeature<T extends FeatureKind>(kind: T, providers: Provider[], config?: ServiceConfig): Feature<T>;
export declare function withFeatures(options?: FeatureOptions): FeatureFn<Exclude<FeatureKind, FeatureKind.Transport>>;
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
export declare function withGuards(...guards: ProvdierOf<GuardLike>[]): FeatureFn<FeatureKind.Guards>;
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
export declare function withLogger(options?: LoggerOptions): FeatureFn<FeatureKind.Logger>;
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
export declare function withExceptionFilter(options?: {
    filter?: ProvdierOf<RequestExceptionFilter>;
    finallize?: ProvdierOf<RequestExceptionFilter>;
    handlers?: Type[];
}): FeatureFn<FeatureKind.Exception>;
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
export declare function withFilters(...filters: ProvdierOf<RequestFilterLike>[]): FeatureFn<FeatureKind.Filters>;
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
export declare function withJson(options?: JsonOptions): FeatureFn<FeatureKind.Json>;
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
export declare function withSession(options?: SessionOptions): FeatureFn<FeatureKind.Session>;
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
export declare function withContent(options?: ContentOptions): FeatureFn<FeatureKind.Content>;
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
export declare function withBodyparser(options?: BodyparserOptions): FeatureFn<FeatureKind.Bodyparser>;
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
export declare function withRouter(options?: RouteOpts): FeatureFn<FeatureKind.Router>;
/**
 * Adds one or more service interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export declare function withRequestVaildate(...vaildators: ProvdierOf<VaildatorLike<Incoming, RequestContext>>[]): FeatureFn<FeatureKind.Vaildate>;
/**
 * Adds one or more service interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export declare function withResponseVaildate(...vaildators: ProvdierOf<VaildatorLike<Outgoing, RequestContext>>[]): FeatureFn<FeatureKind.Vaildate>;
/**
 * Adds one or more interceptors after `Filters`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export declare function withGlobalInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.GlobalInterceptors>;
/**
 * Adds one or more service interceptors after `Vaildate`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export declare function withInterceptors(...interceptors: ProvdierOf<RequestInterceptorLike>[]): FeatureFn<FeatureKind.Interceptors>;
/**
 * use middlewares
 * @param middlewares
 * @returns
 */
export declare function withMiddlewares(...middlewares: ProvdierOf<MiddlewareLike>[]): FeatureFn<FeatureKind.Middlewares>;
/**
 * Adds one or more service controllers to the configuration of the `Service`
 * instance.
 *
 * @see {@link provideService}
 * @publicApi
 */
export declare function withControllers(controllers: Type[]): FeatureFn<FeatureKind.Controller>;
/**
 * Adds one or more service transfers interceptors to the configuration of the `Service`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideService}
 * @publicApi
 */
export declare function withTransfers(...selectors: TransferInterceptorFactory[]): FeatureFn<FeatureKind.Transfer>;
