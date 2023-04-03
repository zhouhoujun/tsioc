import { Abstract, EMPTY, Inject, Injectable, InjectFlags, ModuleRef, isFunction, isString, lang, Nullable, OnDestroy, pomiseOf, Injector } from '@tsdi/ioc';
import { defer, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanActivate } from '../guard';
import { getInterceptorsToken } from '../Interceptor';
import { BadRequestExecption, NotFoundExecption } from '../execptions';
import { Endpoint } from '../endpoints/endpoint';
import { EndpointContext } from '../endpoints/context';
import { GuardsEndpoint } from '../endpoints/guards.endpoint';
import { getGuardsToken, setOptions } from '../endpoints/endpoint.service';
import { getFiltersToken } from '../filters/filter';
import { joinprefix, Route, ROUTES, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { Context } from './middleware';
import { MiddlewareBackend, NEXT } from './middleware.compose';
import { Router } from './router';
import { ControllerRouteReolver } from './controller';

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

    private endpoint?: Endpoint;
    private _guards?: CanActivate[];

    constructor(
        protected injector: Injector,
        private route: Route) {

    }

    get path() {
        return this.route.path
    }

    async invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    handle(ctx: EndpointContext<Context>): Observable<any> {
        return of(ctx)
            .pipe(
                mergeMap(async ctx => {
                    if (!this.endpoint) {
                        this.endpoint = await this.buildEndpoint(this.route);
                    }
                    return this.endpoint;
                }),
                mergeMap((endpoint) => {
                    return endpoint.handle(ctx);
                })
            );
    }

    protected canActive(ctx: EndpointContext<Context>) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(g => isFunction(g) ? ctx.resolve(g) : g) ?? EMPTY
        }
        if (!this._guards.length) return true;
        return lang.some(this._guards.map(guard => () => pomiseOf(guard.canActivate(ctx))), vaild => vaild === false)
    }

    protected async parse(route: Route & { router?: Router }): Promise<MiddlewareLike> {
        if (route.invoke) {
            return route as Middleware;
        } else if (route.middleware) {
            return isFunction(route.middleware) ? this.injector.get(route.middleware) : route.middleware
        } else if (route.middlewareFn) {
            return route.middlewareFn;
        } else if (route.redirectTo) {
            const to = route.redirectTo
            return (c, n) => this.redirect(c, to)
        } else if (route.controller) {
            return this.injector.get(ControllerRouteReolver).resolve(route.controller, this.injector, route.path);
        } else if (route.children) {
            const router = new MappingRouter(this.injector, route.path);
            route.children.forEach(route => router.use(route));
            return router
        } else if (route.loadChildren) {
            const module = await route.loadChildren();
            const platform = this.injector.platform();
            if (!platform.modules.has(module)) {
                this.injector.get(ModuleRef).import(module, true)
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

    protected async buildEndpoint(route: Route & { router?: Router }) {
        let endpoint: Endpoint;
        if (route.endpoint) {
            endpoint = isFunction(route.endpoint) ? this.injector.get(route.endpoint) : route.endpoint
        } else if (route.controller) {
            endpoint = this.injector.get(ControllerRouteReolver).resolve(route.controller, this.injector, route.path);
        } else {
            const middleware = await this.parse(route);
            endpoint = new MiddlewareBackend([middleware])
        }

        if (this.route.interceptors || this.route.guards || this.route.filters) {
            const route = joinprefix(this.route.path);
            const gendpt = new GuardsEndpoint(this.injector, getInterceptorsToken(route), endpoint, getGuardsToken(route), getFiltersToken(route));
            setOptions(gendpt, this.route);
            endpoint = gendpt;
        }

        return endpoint;
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

    constructor(
        private injector: Injector,
        @Nullable() public prefix: string = '',
        @Inject(ROUTES, { nullable: true, flags: InjectFlags.Self }) routes?: Routes) {
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
            this.routes.set(route.path, new MappingRoute(this.injector, route))
        }
        return this
    }

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
