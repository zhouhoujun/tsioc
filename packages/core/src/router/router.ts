import { Abstract, EMPTY, isFunction, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { RequestMethod } from '../transport/packet';
import { CanActivate } from './guard';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver } from './route';
import { ModuleRef } from '../module.ref';
import { Middleware, MiddlewareFn } from '../transport/endpoint';
import { promisify, TransportContext } from '../transport';




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
    abstract get routes(): Map<string, MiddlewareFn>;
    /**
     * intercept handle.
     *
     * @param {TransportContext} req request with context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: TransportContext<any, any>, next: () => Promise<void>): Promise<void>;
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
    abstract use(route: string, middleware: Middleware | MiddlewareFn): this;
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
    abstract resolve(prefix?: string): Router;
}


export class MappingRoute implements Middleware {

    private _guards?: CanActivate[];
    private router?: Router;
    private _loaded?: boolean;
    private _middleware?: Middleware;
    constructor(private route: Route) {

    }

    get path() {
        return this.route.path;
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {

        if (await this.canActive(ctx)) {
            return this.navigate(this.route, ctx, next);
        } else {
            throw ctx.throwError(403);
        }
    }

    protected canActive(ctx: TransportContext) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(token => ctx.resolve(token)) ?? EMPTY;
        }
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(ctx))), vaild => vaild === false);
    }

    protected navigate(route: Route & { router?: Router }, ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (route.middleware) {
            if (!this._middleware) {
                this._middleware = ctx.get(route.middleware);
            }
            return this._middleware.invoke(ctx, next);
        } else if (route.redirectTo) {
            return this.redirect(ctx, route.redirectTo);
        } else if (route.controller) {
            return this.routeController(ctx, route.controller, next);
        } else if (route.children) {
            if (!this.router) {
                this.router = new MappingRouter(route.path);
            }
            return this.router.invoke(ctx, next);
        } else if (route.loadChildren) {
            return this.routeLoadChildren(ctx, next, route.loadChildren, route.path)
        } else {
            throw ctx.throwError(404);
        }
    }

    protected async redirect(ctx: TransportContext, url: string, alt?: string): Promise<void> {
        ctx.redirect(url, alt);
    }

    protected async routeController(ctx: TransportContext, controller: Type, next: () => Promise<void>): Promise<void> {
        const route = ctx.resolve(RouteFactoryResolver).resolve(controller).last();
        if (route) {
            return route.invoke(ctx, next);
        } else {
            throw ctx.throwError(404);
        }
    }

    protected async routeLoadChildren(ctx: TransportContext, next: () => Promise<void>, loadChildren: () => any, prefix?: string): Promise<void> {
        if (!this.router && !this._loaded) {
            const module = await loadChildren();
            const platform = ctx.injector.platform();
            if (!platform.modules.has(module)) {
                ctx.injector.get(ModuleRef).import(module);
            }
            this.router = platform.modules.get(module)?.injector.get(RouterResolver).resolve(prefix);
        }
        if (this.router) {
            return await this.router.invoke(ctx, next);
        } else {
            throw ctx.throwError(404);
        }
    }

}


const endColon = /:$/;

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, MiddlewareFn>;

    constructor(readonly prefix = '') {
        super();
        this.routes = new Map<string, MiddlewareFn>();
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
    use(route: string, middleware: Middleware | MiddlewareFn): this;
    use(route: Route | string, middleware?: Middleware | MiddlewareFn): this {
        if (isString(route)) {
            if (!middleware || this.has(route)) return this;
            this.routes.set(route, isFunction(middleware) ? middleware : this.parse(middleware));
        } else {
            if (this.has(route.path)) return this;
            this.routes.set(route.path, this.parse(new MappingRoute(route)));
        }
        return this;
    }

    parse(middleware: Middleware): MiddlewareFn {
        return (ctx, next) => middleware.invoke(ctx, next);
    }

    unuse(route: string) {
        this.routes.delete(route);
        return this;
    }

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return route(ctx, next);
        } else {
            return next();
        }
    }

    protected getRoute(ctx: TransportContext): MiddlewareFn | undefined {
        if (ctx.status && ctx.status !== 404) return;
        if (!ctx.url.startsWith(this.prefix)) return;
        const url = ctx.url.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): MiddlewareFn | undefined {
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
     * @type {(MiddlewareFn| Type<Middleware>)[]}
     * @memberof RouteMetadata
     */
    middlewares?: (MiddlewareFn | Type<Middleware>)[];
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


