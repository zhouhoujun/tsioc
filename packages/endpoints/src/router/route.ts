import { Handler, HandlerFn, HandlerLike, Invocation, Token, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { InvocationHandlerOptions } from '@tsdi/core';
import { Pattern, Protocols, RequestMethod } from '@tsdi/common';
import { Observable } from 'rxjs';

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
     * route path regExp.
     */
    regExp?: RegExp;
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
    controller?: Type | Invocation;
    /**
     * load controller.
     */
    loadController?: LoadController;

    /**
     * handler.
     */
    handler?: TypeOf<Handler>;

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

export type LoadChildren = () => Type | Routes | Promise<Type | Routes> | Observable<Type | Routes>;

export type LoadController = () => Type | Promise<Type> | Observable<Type>;

export type Routes = Route[];

/**
 * ROUTES
 */
export const ROUTES = tokenId<Routes>('ROUTES');

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
    protocol?: Protocols;

    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMappingMetadata
     */
    contentType?: string;
}

