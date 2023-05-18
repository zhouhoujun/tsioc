import { tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Handler } from '../Handler';
import { Middleware, MiddlewareFn } from './middleware';
import { EndpointOptions } from '../endpoints/endpoint.service';

/**
 * Route.
 */
export interface Route<TArg = any> extends EndpointOptions<TArg> {
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     */
    path: string;
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
    controller?: Type;

    /**
     * ednpoint.
     */
    endpoint?: TypeOf<Handler>;
    /**
     * The middlewarable to instantiate when the path matches.
     * Can be empty if child routes specify middlewarable.
     */
    middleware?: TypeOf<Middleware>;
    /**
     * The middlewarable to instantiate when the path matches.
     * Can be empty if child routes specify middlewarable.
     */
    invoke?: MiddlewareFn;
    /**
     * The middlewarable to instantiate when the path matches.
     * Can be empty if child routes specify middlewarable.
     */
    middlewareFn?: MiddlewareFn;

}

export type LoadChildren = () => any;
export type Routes<T = any> = Route<T>[];

/**
 * ROUTES
 */
export const ROUTES = tokenId<Routes>('ROUTES');


const staExp = /^\//;
const endExp = /\/$/;

export function joinprefix(...paths: (string | undefined)[]) {
    const joined = paths
        .map(p => {
            if (!p) return '';
            p = p.trim();
            const start = staExp.test(p) ? 1 : 0;
            const end = endExp.test(p) ? p.length - 1 : p.length;
            return p.slice(start, end)
        })
        .filter(p => p)
        .join('/');

    return '/' + joined
}

/**
 * normalize route path.
 * @param route 
 * @returns 
 */
export function normalize(route: string): string {
    if (!route) return '/';
    if (route === '/') return route;

    let path = route.trim();
    if (endExp.test(route)) {
        path = path.substring(0, path.length - 1)
    }
    return staExp.test(path) ? path : `/${path}`
}
