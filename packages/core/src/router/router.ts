import { Abstract, EMPTY, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { Observable, from, throwError } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { RequestBase, RequestMethod, ResponseBase, promisify } from '../transport/packet';
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
     * routes.
     */
    abstract get routes(): Map<string, Middleware>;
    /**
     * intercept handle.
     *
     * @param {TransportContext} req request with context.
     * @param {Endpoint<T>} next
     * @returns {Observable<T>}
     */
    abstract intercept(req: RequestBase, next: Endpoint): Observable<ResponseBase>;
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
    constructor(private route: Route) {

    }

    get path() {
        return this.route.path;
    }

    intercept(req: RequestBase, next: Endpoint): Observable<ResponseBase> {
        return from(this.canActive(req))
            .pipe(
                mergeMap(can => {
                    if (can) {
                        return this.navigate(this.route, req, next);
                    } else {
                        return this.throwError(req, next, 403);
                    }
                })
            );
    }

    protected canActive(req: RequestBase) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(token => req.context.resolve(token)) ?? EMPTY;
        }
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(req))), vaild => vaild === false);
    }

    protected navigate(route: Route & { router?: Router }, req: RequestBase, next: Endpoint): Promise<any> | Observable<any> {
        if (route.middleware) {
            return route.middleware.intercept(req, next);
        } else if (route.redirectTo) {
            return next.handle(req).pipe(map(resp => this.redirect(resp, route.redirectTo as string)));
        } else if (route.controller) {
            return this.routeController(req, route.controller, next);
        } else if (route.children) {
            if (!this.router) {
                this.router = new MappingRouter(route.path);
            }
            return this.router.intercept(req, next);
        } else if (route.loadChildren) {
            return from(this.loadChildren(req, route.loadChildren, route.path))
                .pipe(
                    mergeMap(router => {
                        if (router) {
                            return router.intercept(req, next);
                        } else {
                            return this.throwError(req, next, 404);;
                        }
                    }));
        } else {
            return this.throwError(req, next, 404);
        }
    }

    protected throwError(req: RequestBase, next: Endpoint, status: number): Observable<ResponseBase> {
        if(req.context.response) {
            return throwError(() => req.context.response.throwError(status));
        }
        return next.handle(req).pipe(mergeMap(resp => throwError(() => resp.throwError(status))));
    }

    protected redirect(resp: ResponseBase, url: string, alt?: string): ResponseBase {
        resp.redirect(url, alt);
        return resp;
    }

    protected routeController(req: RequestBase, controller: Type, next: Endpoint): Observable<ResponseBase> {
        const route = req.context.resolve(RouteFactoryResolver).resolve(controller).last();
        if (route) {
            return route.intercept(req, next);
        } else {
            return this.throwError(req, next, 404);
        }
    }

    protected async loadChildren(req: RequestBase, loadChildren: () => any, prefix?: string): Promise<Router | undefined> {
        if (!this.router) {
            const module = await loadChildren();
            const platform = req.context.injector.platform();
            if (!platform.modules.has(module)) {
                req.context.injector.get(ModuleRef).import(module);
            }
            this.router = platform.modules.get(module)?.injector.get(RouterResolver).resolve(prefix);
        }
        return this.router;
    }

}


const endColon = /:$/;

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, Middleware>;

    constructor(readonly prefix = '') {
        super();
        this.routes = new Map<string, Middleware>();
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
            this.routes.set(route.path, new MappingRoute(route));
        }

        return this;
    }

    unuse(route: string) {
        this.routes.delete(route);
        return this;
    }

    intercept(ctx: RequestBase, next: Endpoint): Observable<any> {
        const route = this.getRoute(ctx);
        if (route) {
            return route.intercept(ctx, next);
        } else {
            return next.handle(ctx);
        }
    }

    protected getRoute(req: RequestBase): Middleware | undefined {
        if (req.context.response?.status && req.context.response.status !== 404) return;
        if (!req.url.startsWith(this.prefix)) return;
        const url = req.url.replace(this.prefix, '') || '/';
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

    resolve(prefix: string = ''): Router {
        let router = this.routers.get(prefix);
        if (!router) {
            router = new MappingRouter(prefix);
            this.routers.set(prefix, router);
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


