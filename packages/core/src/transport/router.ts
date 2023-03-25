import { Abstract, EMPTY, Inject, Injectable, InjectFlags, ModuleRef, isFunction, isString, lang, Nullable, OnDestroy, pomiseOf, Type, TypeDef } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Route, ROUTES, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { BadRequestExecption, ForbiddenExecption, NotFoundExecption } from '../execptions';
import { Context } from './middleware';
import { Protocols, RequestMethod } from './protocols';
import { EndpointOptions } from '../EndpointService';
import { InterceptorMiddleware } from './middleware.compose';
import { EndpointContext } from '../endpoints/context';



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
     * @param {MiddlewareContext} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void>;
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

    async invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        const can = await this.canActive(ctx);
        if (can) {
            if (!this._middleware) {
                const middleware = await this.parse(this.route, ctx);
                this._middleware = new InterceptorMiddleware(middleware, this.route.interceptors? this.route.interceptors.map(i => isFunction(i) ? ctx.resolve(i) : i) : EMPTY);
            }
            return this._middleware.invoke(ctx, next);
        } else {
            throw new ForbiddenExecption();
        }
    }

    protected canActive(ctx: EndpointContext<Context>) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(g => isFunction(g) ? ctx.resolve(g) : g) ?? EMPTY
        }
        if (!this._guards.length) return true;
        return lang.some(this._guards.map(guard => () => pomiseOf(guard.canActivate(ctx))), vaild => vaild === false)
    }

    protected async parse(route: Route & { router?: Router }, ctx: EndpointContext<Context>): Promise<MiddlewareLike> {
        if (route.invoke) {
            return route as Middleware;
        } else if (route.middleware) {
            return isFunction(route.middleware) ? ctx.get(route.middleware) : route.middleware
        } else if (route.middlewareFn) {
            return route.middlewareFn;
        } else if (route.redirectTo) {
            const to = route.redirectTo
            return (c, n) => this.redirect(c, to)
        } else if (route.controller) {
            return null!;
            // return ctx.resolve(RouteFactoryResolver).resolve(route.controller).last() ?? createMiddleware((c, n) => { throw new NotFoundExecption() })
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
            return (c, n) => { throw new NotFoundExecption() }
        } else {
            return (c, n) => { throw new NotFoundExecption() }
        }
    }


    protected async redirect(ctx: EndpointContext<Context>, url: string, alt?: string): Promise<void> {
        if (!isFunction(ctx.payload.redirect)) {
            throw new BadRequestExecption();
        }
        ctx.payload.redirect(url, alt)
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

    invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return route(ctx, next)
        } else {
            return next()
        }
    }

    protected getRoute(ctx: EndpointContext<Context>): MiddlewareFn | undefined {
        // if (!(ctx.status instanceof NotFoundStatus)) return;

        let url: string;
        if (this.prefix) {
            if (!ctx.payload.url.startsWith(this.prefix)) return;
            url = ctx.payload.url.slice(this.prefix.length)
        } else {
            url = ctx.payload.url ?? '/'
        }

        const route = this.getRouteByUrl(ctx.payload.url);
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
 * route options
 */
export interface RouteOptions extends EndpointOptions {
    /**
     * protocol
     */
    protocol?: Protocols | string;
    /**
     * pipe extends args.
     */
    args?: any[];
}

/**
 * route mapping metadata.
 */
export interface RouteMappingMetadata extends RouteOptions {
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
}

/**
 * Protocol route mapping options.
 */
export interface ProtocolRouteMappingOptions extends RouteOptions {
    /**
     * parent router.
     * default register in root handle queue.
     */
    router?: Type<Router>;
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
 * protocol route mapping metadata.
 */
export interface ProtocolRouteMappingMetadata extends ProtocolRouteMappingOptions {
    /**
     * route.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    route?: string;

    /**
     * request method.
     */
    method?: RequestMethod;
}

/**
 * mapping type def.
 */
export interface MappingDef<T = any> extends TypeDef<T>, ProtocolRouteMappingMetadata {

}


