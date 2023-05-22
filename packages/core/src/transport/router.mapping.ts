import {
    EMPTY, Inject, Injectable, InjectFlags, Optional, ModuleRef, isFunction, isString,
    lang, OnDestroy, pomiseOf, Injector, Execption, isArray, isPromise, isObservable
} from '@tsdi/ioc';
import { defer, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanActivate, getGuardsToken } from '../guard';
import { getInterceptorsToken } from '../Interceptor';
import { getFiltersToken } from '../filters/filter';
import { BadRequestExecption, NotFoundExecption } from '../execptions';
import { GuardHandler } from '../handlers/guards';
import { setHandlerOptions } from '../handlers/handler.service';
import { Endpoint } from '../endpoints/endpoint';
import { joinprefix, Route, ROUTES, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { MiddlewareBackend, NEXT } from './middleware.compose';
import { RouteMatcher, Router } from './router';
import { HybridRoute, HybridRouter } from './router.hybrid';
import { ControllerRoute, ControllerRouteReolver } from './controller';
import { AssetContext, TransportContext } from './context';



/**
 * Mapping router.
 */
@Injectable()
export class MappingRouter extends HybridRouter implements Middleware, OnDestroy {

    readonly routes: Map<string, Endpoint | MiddlewareLike | Array<Endpoint | MiddlewareLike>>;

    constructor(
        private injector: Injector,
        @Inject() private matcher: RouteMatcher,
        @Optional() public prefix: string = '',
        @Inject(ROUTES, { nullable: true, flags: InjectFlags.Self }) routes?: Routes) {
        super()
        this.routes = new Map<string, MiddlewareFn>();
        if (routes) {
            routes.forEach(r => this.use(r));
        }
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
    use(route: Route | string, endpoint?: MiddlewareLike | Endpoint): this {
        if (isString(route)) {
            if (!endpoint) return this;
            this.addEndpoint(route, endpoint);
            return this;
        } else {
            this.addEndpoint(route.path, new MappingRoute(this.injector, route))
        }
        return this
    }

    unuse(route: string, endpoint?: Endpoint | MiddlewareLike) {
        if (endpoint) {
            const handles = this.routes.get(route);
            if (isArray(handles)) {
                const idx = handles.findIndex(i => i === endpoint || (isFunction((i as Endpoint).equals) && (i as Endpoint).equals?.(endpoint)))
                if (idx >= 0) handles.splice(idx, 1);
            } else {
                this.routes.delete(route)
            }
        } else {
            this.routes.delete(route)
        }
        return this
    }

    handle(ctx: TransportContext): Observable<any> {
        if (ctx.isDone()) return of(ctx)
        const route = this.getRoute(ctx);
        if (route) {
            if (isArray(route)) {
                return runHybirds(route, ctx);
            } else if ((route as Endpoint).handle) {
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

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (ctx.isDone()) return next()
        const route = this.getRoute(ctx);
        if (route) {
            if (isArray(route)) {
                return lastValueFrom(runHybirds(route, ctx));
            } else if ((route as Endpoint).handle) {
                await lastValueFrom((route as Endpoint).handle(ctx))
            } else {
                await (isFunction(route) ? route(ctx, NEXT) : (route as Middleware).invoke(ctx, NEXT));
            }
        }
        return await next()
    }

    onDestroy(): void {
        this.routes.clear()
    }


    protected getRoute(ctx: TransportContext): HybridRoute | undefined {
        let url: string;
        if (this.prefix) {
            if (!ctx.url.startsWith(this.prefix)) return;
            url = ctx.url.slice(this.prefix.length)
        } else {
            url = ctx.url ?? '/'
        }

        const route = this.findRoute(ctx.url);
        return route
    }

    protected findRoute(url: string): HybridRoute | undefined {
        let route = this.routes.get(url);
        if (!route) {
            const exp = this.matcher.match(url);
            if (exp) {
                route = this.routes.get(exp)
            }
        }
        return route;
    }

    protected addEndpoint(route: string, endpoint: Endpoint | MiddlewareLike) {
        this.matcher.register(route);
        if (this.routes.has(route)) {
            const handles = this.routes.get(route)!;
            if (handles instanceof ControllerRoute) throw new Execption(`route ${route} has registered with Controller: ${handles.factory.typeRef.class.className}`)
            if (isArray(handles)) {
                handles.push(endpoint);
            } else {
                this.routes.set(route, [handles, endpoint]);
            }
        } else {
            this.routes.set(route, endpoint)
        }
    }

}

@Injectable()
export class DefaultRouteMatcher extends RouteMatcher {

    private matchers: Map<RegExp, string>;
    constructor() {
        super();
        this.matchers = new Map();
    }

    register(route: string): boolean {
        if (route.indexOf('*') >= 0) {
            const exp = route.split('/').map(r => {
                if (r.indexOf('**') >= 0) {
                    return r.replace('**', '.*')
                } else if (r.indexOf('*') >= 0) {
                    return r.replace('*', '(\\w|-|%)+')
                } else {
                    return r;
                }
            }).join('\\/');
            this.matchers.set(new RegExp('^' + exp + '$'), route);
            return true;
        }
        return false;
    }

    match(path: string): string | null {
        const exp = Array.from(this.matchers.keys()).find(reg => reg.test(path));
        if (exp) {
            return this.matchers.get(exp) ?? null;
        }
        return null
    }

}

/**
 * run hybird routes.
 * @param endpoints 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runHybirds<TInput extends TransportContext>(endpoints: (Endpoint | MiddlewareLike)[] | undefined, input: TInput, isDone?: (input: TInput) => boolean): Observable<any> {
    let $obs: Observable<any> = of(input);
    if (!endpoints || !endpoints.length) {
        return $obs;
    }

    endpoints.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(() => {
                if (isDone && isDone(input)) return of(input);
                const $res = isFunction(i) ? (i as MiddlewareFn)(input, NEXT) : (isFunction((i as Endpoint).handle) ? (i as Endpoint).handle(input) : (i as Middleware).invoke(input, NEXT));
                if (isPromise($res) || isObservable($res)) return $res;
                return of($res);
            }));
    });

    return $obs;
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

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    handle(ctx: TransportContext): Observable<any> {
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

    protected canActive(ctx: TransportContext) {
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
            const router = new MappingRouter(this.injector, this.injector.get(RouteMatcher), route.path);
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
            const gendpt = new GuardHandler(this.injector, endpoint, getInterceptorsToken(route), getGuardsToken(route), getFiltersToken(route));
            setHandlerOptions(gendpt, this.route);
            endpoint = gendpt;
        }

        return endpoint;
    }

    protected async redirect(ctx: TransportContext, url: string, alt?: string): Promise<void> {
        if (!isFunction((ctx as AssetContext).redirect)) {
            throw new BadRequestExecption();
        }
        (ctx as AssetContext).redirect(url, alt)
    }

}
