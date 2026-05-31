import { Handler, HandlerFn, HandlerLike, Invocation, Token, token, AbstractType, TokenOf } from '@tsdi/ioc';
import { InvocationHandlerOptions } from '@tsdi/core';
import { Pattern, RequestMethod, Transport } from '@tsdi/common';
import { Observable } from 'rxjs';
import { ApiRateLimitOptions } from '../options';

/**
 * assets route.
 */
export interface AssetRoute {
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     */
    path: string;
    /**
     * route pattern
     */
    pattern?: Pattern|null;
    /**
     * static assets or not.
     */
    assets: boolean;
}

/**
 * Route.
 */
export interface Route {
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     */
    path: string;
    /**
     * route pattern
     */
    pattern?: Pattern|null;
    /**
     * path is wildcard or not.
     */
    isWildcard?: boolean;
    /**
     * request method.
     */
    method?: string | string[];

    /**
     * dynamic tokens for path of topic.
     */
    paths?: Record<string, Token>;
    /**
     * path params.
     */
    pathParams?: Record<string, number>;
    /**
     * A URL to redirect to when the path matches.
     *
     * Absolute if the URL begins with a slash (/), otherwise relative to the path URL.
     * Note that no further redirects are evaluated after an absolute redirect.
     *
     * When not present, router does not redirect.
     */
    redirectTo?: string;
    /**
     * An array of child `Route` objects that specifies a nested route
     * configuration.
     */
    children?: Routes;
    /**
     * An object specifying lazy-loaded child routes.
     */
    loadChildren?: LoadChildren;
    /**
     * The controller to instantiate when the path matches.
     * Can be empty if child routes specify controller.
     */
    controller?: AbstractType | Invocation;
    /**
     * load controller.
     */
    loadController?: LoadController;

    /**
     * handler.
     */
    handler?: TokenOf<Handler>;

    /**
     * handler.
     */
    handlers?: HandlerLike[];
    /**
     * The handle fn to instantiate when the path matches.
     * Can be empty if child routes specify handle.
     */
    handle?: HandlerFn;

    loaded?: boolean;

}

export type LoadChildren = () => AbstractType | Routes | Promise<AbstractType | Routes> | Observable<AbstractType | Routes>;

export type LoadController = () => AbstractType | Promise<AbstractType> | Observable<AbstractType>;

export type Routes = Route[];

/**
 * ROUTES
 */
export const ROUTES = token<Routes>('ROUTES');

/**
 * route options
 */
export interface RouteOptions<T = any> extends InvocationHandlerOptions<T> {
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * route path.
     */
    path?: string;
    /**
     * request method.
     */
    method?: RequestMethod;
    /**
     * pipe extends args.
     */
    args?: any[];
    /**
     * dynamic tokens for path of topic.
     */
    paths?: Record<string, Token>;

    /**
     * route.
     *
     * @type {Pattern}
     * @memberof RouteMappingMetadata
     */
    route?: Pattern;

    /**
     * transport protocol
     */
    transport?: Transport;

    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMappingMetadata
     */
    contentType?: string;

    /**
     * API timeout in milliseconds for this route.
     * Overrides global timeout; set to false to disable global timeout.
     * 路由级 API 超时时间（毫秒），覆盖全局配置；设为 false 禁用全局超时
     */
    timeout?: number | false;

    /**
     * API rate limit options for this route.
     * Overrides global rate limit; set to false to disable global rate limit.
     * 路由级限流配置，覆盖全局配置；设为 false 禁用全局限流
     */
    rateLimit?: ApiRateLimitOptions | false;
}
