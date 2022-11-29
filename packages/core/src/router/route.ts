import {
    Abstract, Destroyable, DestroyCallback, Injector, InvokeArguments,
    OnDestroy, Class, tokenId, Type, TypeDef
} from '@tsdi/ioc';
import { Protocols } from '../transport/packet';
import { InterceptorLike } from '../transport/endpoint';
import { ServerEndpointContext } from '../transport/context';
import { Middleware, MiddlewareFn } from '../transport/middleware';
import { CanActivate } from '../transport/guard';
import { Pattern } from '../transport/request';

/**
 * Route.
 */
export interface Route extends InvokeArguments {
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
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     */
    guards?: (CanActivate | Type<CanActivate>)[];
    /**
     * interceptors of route.
     */
    interceptors?: InterceptorLike[];
    /**
     * transport protocol
     */
    protocol?: Protocols;

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
     * The middlewarable to instantiate when the path matches.
     * Can be empty if child routes specify middlewarable.
     */
    middleware?: Type<Middleware> | Middleware;
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
export type Routes = Route[];


@Abstract()
export abstract class PatternFormatter {
    abstract format(route: Pattern, method?: string, prefix?: string, version?: string): string;
}

/**
 * ROUTES
 */
export const ROUTES = tokenId<Routes>('ROUTES');

/**
 * middleware ref.
 */
@Abstract()
export abstract class RouteRef<T = any> implements Middleware, Destroyable, OnDestroy {
    /**
     * controller type.
     */
    abstract get type(): Type<T>;
    /**
     * controller type reflective.
     */
    abstract get typeRef(): Class<T>;
    /**
     * controller injector. the controller registered in.
     */
    abstract get injector(): Injector;
    /**
     * controller instance.
     */
    abstract get instance(): T;
    /**
     * route path.
     */
    abstract get path(): string;
    /**
     * route guards.
     */
    abstract get guards(): CanActivate[];
    /**
     * interceptors of route.
     */
    abstract get interceptors(): InterceptorLike[];
    /**
     * route handle.
     *
     * @abstract
     * @param {ServerEndpointContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract invoke(ctx: ServerEndpointContext, next: () => Promise<void>): Promise<void>;
    /**
     * is destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    abstract onDestroy(callback?: DestroyCallback): void | Promise<void>;
}



/**
 * route factory.
 */
@Abstract()
export abstract class RouteFactory<T = any> {
    /**
     * type reflective.
     */
    abstract get typeRef(): Class<T>;
    /**
     * create {@link RouteRef}
     * @param injector injector.
     * @param option invoke arguments. type of {@link InvokeArguments}.
     * @returns instance of {@link RouteRef}
     */
    abstract create(injector: Injector, option?: InvokeArguments): RouteRef<T>;
    /**
     * get the last route ref instance.
     */
    abstract last(): RouteRef<T> | undefined;
}

/**
 * routeRef factory resovler.
 */
@Abstract()
export abstract class RouteFactoryResolver {
    /**
     * resolve {@link RouteFactory}
     * @param type route class type.
     * @returns instance of {@link RouteFactory}.
     */
    abstract resolve<T>(type: Type<T> | Class<T>): RouteFactory<T>;
}

const staExp = /^\//;
const endExp = /\/$/;

export function joinprefix(...paths: (string | undefined)[]) {
    const joined = paths.filter(p => p)
        .map(p => {
            if (!p) return '';
            p = p.trim();
            const start = staExp.test(p) ? 1 : 0;
            const end = endExp.test(p) ? p.length - 1 : p.length;
            return p.slice(start, end)
        })
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
