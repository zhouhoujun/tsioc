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


const sta$ = /^\s*\//;
const trim$ = /(?:^\s*\/)|(?:\/\s+$)/;
/**
 * join path.
 * @param paths 
 * @returns 
 */
export function joinPath(...paths: (string | undefined)[]) {
    const joined = paths
        .filter(p => p)
        .map((p, idx) => {
            if (!p) return undefined;
            p = p.replace(trim$, '');
            if (idx > 0) {
                while (p.startsWith('../')) {
                    let preIdx = idx - 1;
                    let pre = paths[preIdx];
                    if (!pre && preIdx - 1 > 0) {
                        preIdx = preIdx - 1;
                        pre = paths[preIdx];
                    }
                    if (pre) {
                        const lasspt = pre.lastIndexOf('/');
                        paths[preIdx] = lasspt > 0 ? pre.slice(0, pre.lastIndexOf('/')) : undefined;
                        p = p.slice(3)
                    }
                }
                if (p.startsWith('./')) {
                    p = p.slice(2);
                }
            }
            return p;
        })
        .filter(p => p)
        .join('/');

    return joined
}

/**
 * normalize route path.
 * @param route 
 * @returns 
 */
export function normalize(route: string, prefix?: string): string {
    if (!route) return '';

    let path = route.replace(trim$, '');

    if (prefix) {
        prefix = prefix.replace(sta$, '');
        if (path.startsWith(prefix)) {
            path = path.substring(prefix.length).replace(sta$, '')
        }

    }
    return path;
}
