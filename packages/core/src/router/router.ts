import { Abstract, EMPTY, Inject, Injectable, InjectFlags, isClass, isFunction, isString, lang, Nullable, OnDestroy, Type, TypeDef } from '@tsdi/ioc';
import { CanActivate } from './guard';
import { promisify } from './promisify';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver, ROUTES, Routes } from './route';
import { ModuleRef } from '../module.ref';
import { NotFoundStatus } from '../transport/status';
import { InterceptorType } from '../transport/endpoint';
import { Protocols, RequestMethod } from '../transport/packet';
import { AssetContext, ServerEndpointContext } from '../transport/context';
import { Middleware, MiddlewareFn, createMiddleware, InterceptorMiddleware } from '../transport/middleware';
import { BadRequestExecption, ForbiddenExecption, NotFoundExecption } from '../transport/execptions';





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
     * invoke middleware.
     *
     * @param {ServerEndpointContext} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: ServerEndpointContext<any, any>, next: () => Promise<void>): Promise<void>;
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
 * Mapping route.
 */
export class MappingRoute implements Middleware {

    private _middleware?: Middleware;
    private _guards?: CanActivate[];
    constructor(private route: Route) {

    }

    get path() {
        return this.route.path
    }

    async invoke(ctx: ServerEndpointContext, next: () => Promise<void>): Promise<void> {
        if (this.route.protocol && !ctx.match(this.route.protocol)) return next();
        if (await this.canActive(ctx)) {
            if (!this._middleware) {
                this._middleware = await this.parse(this.route, ctx);
                if (this.route.interceptors?.length) {
                    this._middleware = new InterceptorMiddleware(this._middleware, this.route.interceptors.map(i => isClass(i) ? ctx.resolve(i) : i));
                }
            }
            return this._middleware.invoke(ctx, next);
        } else {
            throw new ForbiddenExecption();
        }
    }

    protected canActive(ctx: ServerEndpointContext) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(g => isFunction(g) ? ctx.resolve(g) : g) ?? EMPTY
        }
        if (!this._guards.length) return true;
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(ctx))), vaild => vaild === false)
    }

    protected async parse(route: Route & { router?: Router }, ctx: ServerEndpointContext): Promise<Middleware> {
        if (route.invoke) {
            return route as Middleware;
        } else if (route.middleware) {
            return isFunction(route.middleware) ? ctx.get(route.middleware) : route.middleware
        } else if (route.middlewareFn) {
            return createMiddleware(route.middlewareFn);
        } else if (route.redirectTo) {
            const to = route.redirectTo
            return createMiddleware((c, n) => this.redirect(c, to))
        } else if (route.controller) {
            return ctx.resolve(RouteFactoryResolver).resolve(route.controller).last() ?? createMiddleware((c, n) => { throw new NotFoundExecption() })
        } else if (route.children) {
            const router = new MappingRouter(route.path);
            route.children.forEach(route => router.use(route));
            return router
        } else if (route.loadChildren) {
            const module = await route.loadChildren();
            const platform = ctx.injector.platform();
            if (!platform.modules.has(module)) {
                ctx.injector.get(ModuleRef).import(module, true)
            }
            const router = platform.modules.get(module)?.injector.get(Router) as MappingRouter;
            if (router) {
                router.prefix = route.path ?? '';
                return router
            }
            return createMiddleware((c, n) => { throw new NotFoundExecption() })
        } else {
            return createMiddleware((c, n) => { throw new NotFoundExecption() })
        }
    }


    protected async redirect(ctx: ServerEndpointContext, url: string, alt?: string): Promise<void> {
        const hctx = ctx as AssetContext;
        if (!isFunction(hctx.redirect)) {
            throw new BadRequestExecption();
        }
        hctx.redirect(url, alt)
    }

}

/**
 * Mapping router.
 */
@Injectable()
export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, MiddlewareFn>;

    constructor(@Nullable() public prefix: string = '', @Inject(ROUTES, { nullable: true, flags: InjectFlags.Self }) routes?: Routes) {
        super()
        this.routes = new Map<string, MiddlewareFn>();
        if (routes) {
            routes.forEach(r => this.use(r));
        }
    }

    has(route: string | Route): boolean {
        return this.routes.has(isString(route) ? route : route.path)
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
            this.routes.set(route, isFunction(middleware) ? middleware : this.parse(middleware))
        } else {
            if (this.has(route.path)) return this;
            this.routes.set(route.path, this.parse(new MappingRoute(route)))
        }
        return this
    }

    parse(middleware: Middleware): MiddlewareFn {
        return (ctx, next) => middleware.invoke(ctx, next)
    }

    unuse(route: string) {
        this.routes.delete(route);
        return this
    }

    invoke(ctx: ServerEndpointContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return route(ctx, next)
        } else {
            return next()
        }
    }

    protected getRoute(ctx: ServerEndpointContext): MiddlewareFn | undefined {
        if (!(ctx.status instanceof NotFoundStatus)) return;

        let url: string;
        if (this.prefix) {
            if (!ctx.url.startsWith(this.prefix)) return;
            url = ctx.url.slice(this.prefix.length)
        } else {
            url = ctx.url ?? '/'
        }

        const route = this.getRouteByUrl(ctx.url);
        if (route) {
            ctx.url = url
        }
        return route
    }

    getRouteByUrl(url: string): MiddlewareFn | undefined {
        const paths = url.split('/');
        let route: MiddlewareFn | undefined;
        for (let i = paths.length; i > 0; i--) {
            route = this.routes.get(paths.slice(0, i).join('/'));
            if (route) break
        }
        return route
    }

    onDestroy(): void {
        this.routes.clear()
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
     * interceptors of route.
     */
    interceptors?: InterceptorType[];
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
     * protocol.
     */
    protocol?: Protocols;
    /**
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;
}

/**
 * mapping type def.
 */
export interface MappingDef<T = any> extends TypeDef<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;
}


