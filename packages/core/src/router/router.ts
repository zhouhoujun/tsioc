import { Abstract, EMPTY, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { from, mergeMap, Observable, of, throwError } from 'rxjs';
import { RequestMethod } from '../transport/packet';
import { promisify, TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';
import { Endpoint, Middleware } from '../transport/endpoint';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver } from './route';
import { ModuleRef } from '../module.ref';




/**
 * abstract router.
 */
@Abstract()
export abstract class Router implements Middleware {
    /**
     * route prefix.
     */
    abstract get prefix(): string;
    /**
     * can hold protocols.
     */
    abstract get protocols(): string[];
    /**
     * routes.
     */
    abstract get routes(): Map<string, Middleware>;
    /**
     * intercept handle.
     *
     * @param {TransportContext} ctx request with context.
     * @param {Endpoint<T>} next
     * @returns {Observable<T>}
     */
    abstract intercept(ctx: TransportContext, next: Endpoint): Observable<any>;
    /**
     * has route or not.
     * @param route route
     */
    abstract has(route: string): boolean;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: Route): this;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: string, middleware: Middleware): this;
    /**
     * unuse route.
     * @param route 
     */
    abstract unuse(route: string): this;
}

/**
 * router resolver
 */
@Abstract()
export abstract class RouterResolver {
    /**
     * resolve router.
     * @param protocol the router protocal. 
     * @param prefix route prefix.
     */
    abstract resolve(protocol?: string, prefix?: string): Router;
}


export class MappingRoute implements Middleware {

    private _guards!: CanActivate[];
    private router?: Router;
    constructor(private route: Route, private protocols: string | string[]) {

    }

    get path() {
        return this.route.path;
    }

    intercept(ctx: TransportContext, next: Endpoint): Observable<any> {
        return from(this.canActive(ctx))
            .pipe(
                mergeMap(can => {
                    if (can) {
                        return this.navigate(this.route, ctx, next);
                    } else {
                        return throwError(() => ctx.throwError(403));
                    }
                })
            );
    }

    protected canActive(ctx: TransportContext) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(token => ctx.resolve(token)) ?? EMPTY;
        }
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(ctx))), vaild => vaild === false);
    }

    protected navigate(route: Route & { router?: Router }, ctx: TransportContext, next: Endpoint): Promise<any> | Observable<any> {
        if (route.middleware) {
            return route.middleware.intercept(ctx, next);
        } else if (route.redirectTo) {
            return this.redirect(ctx, route.redirectTo);
        } else if (route.controller) {
            return this.routeController(ctx, route.controller, next);
        } else if (route.children) {
            if (!this.router) {
                this.router = new MappingRouter(this.protocols, route.path);
            }
            return this.router.intercept(ctx, next);
        } else if (route.loadChildren) {
            return from(this.loadChildren(ctx, route.loadChildren, route.path))
                .pipe(
                    mergeMap(router => {
                        if (router) {
                            return router.intercept(ctx, next);
                        } else {
                            return throwError(() => ctx.throwError(404));
                        }
                    }));
        } else {
            return throwError(() => ctx.throwError(404));
        }
    }

    protected redirect(ctx: TransportContext, url: string, alt?: string): Observable<any> {
        ctx.redirect(url, alt);
        return of(ctx.response);
    }

    protected routeController(ctx: TransportContext, controller: Type, next: Endpoint): Observable<any> {
        const route = ctx.injector.get(RouteFactoryResolver).resolve(controller).last();
        if (route) {
            return route.intercept(ctx, next);
        } else {
            return throwError(() => ctx.throwError(404));
        }
    }

    protected async loadChildren(ctx: TransportContext, loadChildren: () => any, prefix?: string): Promise<Router | undefined> {
        if (!this.router) {
            const module = await loadChildren();
            const platform = ctx.injector.platform();
            if (!platform.modules.has(module)) {
                ctx.injector.get(ModuleRef).import(module);
            }
            this.router = platform.modules.get(module)?.injector.get(RouterResolver).resolve(ctx.protocol, prefix);
        }
        return this.router;
    }

}


const endColon = /:$/;

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, Middleware>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, Middleware>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    has(route: string | Route): boolean {
        return this.routes.has(isString(route) ? route : route.path);
    }

    /**
     * use route.
     * @param route 
     */
    use(route: Route): this;
    /**
     * use route.
     * @param route 
     */
    use(route: string, middleware: Middleware): this;
    use(route: Route | string, middleware?: Middleware): this {
        if (isString(route)) {
            if (!middleware || this.has(route)) return this;
            this.routes.set(route, middleware);
        } else {
            if (this.has(route.path)) return this;
            this.routes.set(route.path, new MappingRoute(route, this.protocols));
        }

        return this;
    }

    unuse(route: string) {
        this.routes.delete(route);
        return this;
    }

    intercept(ctx: TransportContext, next: Endpoint): Observable<any> {
        const route = this.getRoute(ctx);
        if (route) {
            return route.intercept(ctx, next);
        } else {
            return next.handle(ctx);
        }
    }

    protected getRoute(ctx: TransportContext): Middleware | undefined {
        if (this.protocols.indexOf(ctx.protocol) < 0) return;
        if (ctx.status && ctx.status !== 404) return;
        if (!ctx.url.startsWith(this.prefix)) return;
        const url = ctx.url.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): Middleware | undefined {
        let route = this.routes.get(url);
        while (!route && url.lastIndexOf('/') > 1) {
            route = this.getRouteByUrl(url.slice(0, url.lastIndexOf('/')));
        }
        return route;
    }

    onDestroy(): void {
        this.routes.clear();
    }
}


export class MappingRouterResolver implements RouterResolver {

    readonly routers: Map<string, Router>;
    constructor() {
        this.routers = new Map();
    }

    resolve(protocol?: string, prefix?: string): Router {
        if (!protocol) {
            protocol = 'msg:';
        } else if (!endColon.test(protocol)) {
            protocol = protocol + ':';
        }
        let router = this.routers.get(protocol);
        if (!router) {
            router = new MappingRouter(protocol, prefix);
            this.routers.set(protocol, router);
        }
        return router;
    }
}


/**
 * route mapping metadata.
 */
export interface RouteMappingMetadata {
    /**
     * route.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    route?: string;
    /**
     * parent router.
     */
    parent?: Type<Router>;
    /**
     * request method.
     */
    method?: RequestMethod;
    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    contentType?: string;
    /**
     * middlewares for the route.
     *
     * @type {Middleware[]}
     * @memberof RouteMetadata
     */
    middlewares?: Middleware[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];
}

/**
 * protocol route mapping metadata.
 */
export interface ProtocolRouteMappingMetadata extends RouteMappingMetadata {
    /**
     * protocol type.
     */
    protocol?: string;
    /**
     * version of api.
     */
    version?: string;
}

/**
 * mapping type reflect.
 */
export interface MappingReflect<T = any> extends TypeReflect<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;
}


