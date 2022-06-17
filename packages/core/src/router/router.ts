import { Abstract, EMPTY, isFunction, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { Protocol, RequestMethod } from '../transport/packet';
import { CanActivate } from './guard';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver } from './route';
import { ModuleRef } from '../module.ref';
import { Middleware, MiddlewareFn } from '../transport/endpoint';
import { HeaderContext, TransportContext } from '../transport/context';
import { promisify } from './promisify';
import { BadRequestError, ForbiddenError, NotFoundError } from '../transport/error';




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
     * route prefix.
     */
    abstract set prefix(value: string);
    /**
     * routes.
     */
    abstract get routes(): Map<string, MiddlewareFn>;
    /**
     * invoke middleware.
     *
     * @param {TransportContext} ctx context.
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

export class MappingRoute implements Middleware {

    private _guards?: CanActivate[];
    private _middleware?: Middleware;
    constructor(private route: Route) {

    }

    get path() {
        return this.route.path
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (this.route.protocol && this.route.protocol !== ctx.protocol) return next();
        if (await this.canActive(ctx)) {
            if (!this._middleware) {
                this._middleware = await this.parse(this.route, ctx)
            }
            return this._middleware.invoke(ctx, next)
        } else {
            throw new ForbiddenError();
        }
    }

    protected canActive(ctx: TransportContext) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(token => ctx.resolve(token)) ?? EMPTY
        }
        if (!this._guards.length) return true;
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(ctx))), vaild => vaild === false)
    }

    protected async parse(route: Route & { router?: Router }, ctx: TransportContext): Promise<Middleware> {
        if (route.middleware) {
            return isFunction(route.middleware) ? ctx.get(route.middleware) : route.middleware
        } else if (route.middlewareFn) {
            return {
                invoke: (ctx, next) => route.middlewareFn!(ctx, next)
            } as Middleware
        } else if (route.redirectTo) {
            const to = route.redirectTo
            return this.create((c, n) => this.redirect(c, to))
        } else if (route.controller) {
            return ctx.resolve(RouteFactoryResolver).resolve(route.controller).last() ?? this.create((c, n) => { throw new NotFoundError() })
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
            const router = platform.modules.get(module)?.injector.get(Router);
            if (router) {
                router.prefix = route.path ?? '';
                return router
            }
            return this.create((c, n) => { throw new NotFoundError() })
        } else {
            return this.create((c, n) => { throw new NotFoundError() })
        }
    }

    protected create(invoke: MiddlewareFn) {
        return { invoke }
    }

    protected async redirect(ctx: TransportContext, url: string, alt?: string): Promise<void> {
        const hctx = ctx as TransportContext & HeaderContext;
        if (!isFunction(hctx.redirect)) {
            throw new BadRequestError();
        }
        hctx.redirect(url, alt)
    }

}

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, MiddlewareFn>;

    constructor(public prefix = '') {
        super()
        this.routes = new Map<string, MiddlewareFn>()
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

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return route(ctx, next)
        } else {
            return next()
        }
    }

    protected getRoute(ctx: TransportContext): MiddlewareFn | undefined {
        if (ctx.status && ctx.status !== 404) return;

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
     * protocol.
     */
    protocol?: Protocol;
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
 * mapping type reflect.
 */
export interface MappingReflect<T = any> extends TypeReflect<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;
}


