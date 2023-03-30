import { Abstract, EMPTY, Inject, Injectable, InjectFlags, ModuleRef, isFunction, isString, lang, Nullable, OnDestroy, pomiseOf } from '@tsdi/ioc';
import { defer, lastValueFrom, Observable, throwError } from 'rxjs';
import { CanActivate } from '../guard';
import { Route, ROUTES, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { BadRequestExecption, ForbiddenExecption, NotFoundExecption } from '../execptions';
import { Context } from './middleware';
import { InterceptorMiddleware, NEXT } from './middleware.compose';
import { EndpointContext } from '../endpoints/context';
import { Endpoint } from '../Endpoint';
import { Router } from './router';

/**
 * abstract router.
 */
@Abstract()
export abstract class MiddlewareRouter extends Router<Endpoint | MiddlewareLike> implements Middleware {
    /**
     * invoke middleware.
     *
     * @param {MiddlewareContext} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void>;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: Route): this;

    /**
     * use route.
     * @param route
     * @param endpoint endpoint. 
     */
    abstract use(route: string, endpoint: Endpoint): this;
    /**
     * use route.
     * @param route 
     * @param middleware middleware. 
     */
    abstract use(route: string, middleware: MiddlewareLike): this;
}

/**
 * Mapping route.
 */
export class MappingRoute implements Middleware, Endpoint {

    private _middleware?: Middleware;
    private _guards?: CanActivate[];
    constructor(private route: Route) {

    }

    handle(ctx: EndpointContext<Context>): Observable<any> {
        return defer(async () => {
            const can = await this.canActive(ctx);
            if (!can) {
                return throwError(()=> new ForbiddenExecption())
            }
            await this._middleware?.invoke(ctx, NEXT);
            return ctx;
        });
    }


    get path() {
        return this.route.path
    }

    async invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        const can = await this.canActive(ctx);
        if (can) {
            if (!this._middleware) {
                const middleware = await this.parse(this.route, ctx);
                this._middleware = new InterceptorMiddleware(middleware, this.route.interceptors ? this.route.interceptors.map(i => isFunction(i) ? ctx.resolve(i) : i) : EMPTY);
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

    protected async parse(route: Route & { router?: MiddlewareRouter }, ctx: EndpointContext<Context>): Promise<MiddlewareLike> {
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
            const router = platform.modules.get(module)?.injector.get(MiddlewareRouter) as MappingRouter;
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
export class MappingRouter extends MiddlewareRouter implements OnDestroy {

    readonly routes: Map<string, Endpoint | MiddlewareLike>;

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
     * @param middleware
     */
    use(route: string, middleware: MiddlewareLike): this;
    /**
     * use route.
     * @param route 
     * @param endpoint
     */
    use(route: string, endpoint: Endpoint): this;
    use(route: Route | string, middleware?: MiddlewareLike | Endpoint): this {
        if (isString(route)) {
            if (!middleware || this.has(route)) return this;
            this.routes.set(route, middleware)
        } else {
            if (this.has(route.path)) return this;
            this.routes.set(route.path, new MappingRoute(route))
        }
        return this
    }

    // parse(endpoint: Middleware | Endpoint): MiddlewareFn {
    //     if (endpoint instanceof Endpoint) {
    //         return (ctx, next) => lastValueFrom(endpoint.handle(ctx)
    //             .pipe(
    //                 mergeMap(async r => {
    //                     await next();
    //                     return r;
    //                 })
    //             ))
    //     }
    //     return (ctx, next) => endpoint.invoke(ctx, next)
    // }

    unuse(route: string) {
        this.routes.delete(route);
        return this
    }


    handle(ctx: EndpointContext<Context>): Observable<any> {
        const route = this.getRoute(ctx);
        if (route) {
            if ((route as Endpoint).handle) {
                return (route as Endpoint).handle(ctx)
            } else {
                return defer(async () => {
                    await (isFunction(route) ? route(ctx, NEXT) : (route as Middleware).invoke(ctx, NEXT));
                    return ctx;
                });
            }

        } else {
            return throwError(() => new NotFoundExecption())
        }
    }



    async invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            if ((route as Endpoint).handle) {
                await lastValueFrom((route as Endpoint).handle(ctx))
            } else {
                await (isFunction(route) ? route(ctx, NEXT) : (route as Middleware).invoke(ctx, NEXT));
            }
            return await next()
        } else {
            throw new NotFoundExecption();
        }
    }

    protected getRoute(ctx: EndpointContext<Context>): MiddlewareLike | Endpoint | undefined {
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

    getRouteByUrl(url: string): MiddlewareLike | Endpoint | undefined {
        const paths = url.split('/');
        let route: MiddlewareLike | Endpoint | undefined;
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
