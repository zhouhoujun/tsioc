import { Abstract, EMPTY, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { Observable, from, throwError } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { RequestBase, RequestMethod, promisify, ServerResponse, Redirect } from '../transport/packet';
import { CanActivate } from './guard';
import { PipeTransform } from '../pipes/pipe';
import { RouteEndpoint, RouteMiddleware } from './endpoint';
import { Route, RouteFactoryResolver } from './route';
import { ModuleRef } from '../module.ref';




/**
 * abstract router.
 */
@Abstract()
export abstract class Router implements RouteMiddleware {
    /**
     * route prefix.
     */
    abstract get prefix(): string;
    /**
     * routes.
     */
    abstract get routes(): Map<string, RouteMiddleware>;
    /**
     * intercept handle.
     *
     * @param {TransportContext} req request with context.
     * @param {RouteEndpoint} next
     * @returns {Observable<T>}
     */
    abstract intercept(req: RequestBase, next: RouteEndpoint): Observable<ServerResponse>;
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
    abstract use(route: string, middleware: RouteMiddleware): this;
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


export class MappingRoute implements RouteMiddleware {

    private _guards!: CanActivate[];
    private router?: Router;
    constructor(private route: Route) {

    }

    get path() {
        return this.route.path;
    }

    intercept(req: RequestBase, next: RouteEndpoint): Observable<ServerResponse> {
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

    protected navigate(route: Route & { router?: Router }, req: RequestBase, next: RouteEndpoint): Promise<any> | Observable<any> {
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

    protected throwError(req: RequestBase, next: RouteEndpoint, status: number): Observable<ServerResponse> {
        const resp  = req.context.response;
        if(resp instanceof ServerResponse) {
            return throwError(() => resp.throwError(status));
        }
        return next.handle(req).pipe(mergeMap(resp => throwError(() => resp.throwError(status))));
    }

    protected redirect(resp: ServerResponse, url: string, alt?: string): ServerResponse {
        resp.context.resolve(Redirect).redirect(resp, url, alt);
        return resp;
    }

    protected routeController(req: RequestBase, controller: Type, next: RouteEndpoint): Observable<ServerResponse> {
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

    readonly routes: Map<string, RouteMiddleware>;

    constructor(readonly prefix = '') {
        super();
        this.routes = new Map<string, RouteMiddleware>();
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
    use(route: string, middleware: RouteMiddleware): this;
    use(route: Route | string, middleware?: RouteMiddleware): this {
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

    intercept(ctx: RequestBase, next: RouteEndpoint): Observable<any> {
        const route = this.getRoute(ctx);
        if (route) {
            return route.intercept(ctx, next);
        } else {
            return next.handle(ctx);
        }
    }

    protected getRoute(req: RequestBase): RouteMiddleware | undefined {
        if (req.context.response?.status && req.context.response.status !== 404) return;
        if (!req.url.startsWith(this.prefix)) return;
        const url = req.url.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): RouteMiddleware | undefined {
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
    middlewares?: RouteMiddleware[];
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


