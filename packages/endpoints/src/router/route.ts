import { Handler, HandlerFn, Invocation, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { InvocationHandlerOptions } from '@tsdi/core';
import { Observable } from 'rxjs';

/**
 * Route.
 */
export interface Route<TArg = any> extends InvocationHandlerOptions<TArg> {
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     */
    path: string;
    /**
     * request method.
     */
    method?: string | string[];
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
     * The handle fn to instantiate when the path matches.
     * Can be empty if child routes specify handle.
     */
    handle?: HandlerFn;

    loaded?: boolean;

}

export type LoadChildren = () => Type | Routes | Promise<Type | Routes> | Observable<Type | Routes>;

export type LoadController= () => Type | Promise<Type> | Observable<Type>;

export type Routes<T = any> = Route<T>[];

/**
 * ROUTES
 */
export const ROUTES = tokenId<Routes>('ROUTES');
