import {
    EMPTY, Inject, Injectable, InjectFlags, Optional, ModuleRef, isFunction, isString,
    lang, OnDestroy, pomiseOf, Injector, Execption, isArray, isPromise, isObservable, isBoolean
} from '@tsdi/ioc';
import { defer, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanActivate, getGuardsToken } from '../guard';
import { getInterceptorsToken } from '../Interceptor';
import { getFiltersToken } from '../filters/filter';
import { BadRequestExecption, NotFoundExecption } from '../execptions';
import { GuardHandler } from '../handlers/guards';
import { setHandlerOptions } from '../handlers/handler.service';
import { Endpoint } from '../endpoints/endpoint';
import { joinprefix, normalize, Route, ROUTES, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { MiddlewareBackend, NEXT } from './middleware.compose';
import { RouteMatcher, Router } from './router';
import { HybridRoute, HybridRouter } from './router.hybrid';
import { ControllerRoute, ControllerRouteReolver } from './controller';
import { AssetContext, TransportContext } from './context';
import { RouteEndpoint } from './route.endpoint';



/**
 * Mapping router.
 */
@Injectable()
export class MappingRouter extends HybridRouter implements Middleware, OnDestroy {

    readonly routes: Map<string, HybridRoute>;

    readonly subscribes: Set<string>;

    constructor(
        private injector: Injector,
        @Inject() readonly matcher: RouteMatcher,
        @Optional() public prefix: string = '',
        @Inject(ROUTES, { nullable: true, flags: InjectFlags.Self }) routes?: Routes) {
        super()
        this.subscribes = new Set();
        this.routes = new Map<string, MiddlewareFn>();
        if (routes) {
            routes.forEach(r => this.use(r));
        }
    }

    use(route: Route): this;
    use(route: string, middleware: HybridRoute, subscribe?: boolean): this;
    use(route: Route | string, endpoint?: HybridRoute, subscribe?: boolean): this {
        if (isString(route)) {
            if (!endpoint) return this;
            this.addEndpoint(route, endpoint, subscribe);
            return this;
        } else {
            this.addEndpoint(route.path, new MappingRoute(this.injector, route), subscribe);
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
                this.routes.delete(route);
                this.subscribes.delete(route)
            }
        } else {
            this.routes.delete(route);
            this.subscribes.delete(route)
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
            url = normalize(ctx.url.slice(this.prefix.length));
        } else {
            url = ctx.url ?? ''
        }

        const route = this.findRoute(url);
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

    protected addEndpoint(route: string, endpoint: HybridRoute, subscribe?: boolean) {
        const redpt = endpoint as RouteEndpoint;
        let subs: string[] | null;
        if (redpt.injector && redpt.options && redpt.options.paths) {
            const params: Record<string, any> = {};
            const paths = redpt.options.paths;
            const injector = redpt.injector;
            Object.keys(paths).forEach(n => {
                params[n] = injector.get(paths[n]);
            })
            subs = this.matcher.register(route, params, subscribe);
        } else {
            subs = this.matcher.register(route, subscribe);
        }

        if (subscribe && subs?.length) {
            subs.forEach(s => this.subscribes.add(s));
        }
        if (this.routes.has(route)) {
            const handles = this.routes.get(route)!;
            if (handles instanceof ControllerRoute) throw new Execption(`route ${route} has registered with Controller: ${handles.factory.typeRef.class.className}`)
            if (isArray(handles)) {
                if (isArray(endpoint)) {
                    handles.push(...endpoint);
                } else {
                    handles.push(endpoint);
                }
            } else {
                this.routes.set(route, [handles, ...isArray(endpoint) ? endpoint : [endpoint]]);
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

    isPattern(route: string): boolean {
        return pattern$.test(route)
    }

    register(route: string, subscribe?: boolean): string[] | null;
    register(route: string, params?: Record<string, any>, subscribe?: boolean): string[] | null;
    register(route: string, arg?: Record<string, any> | boolean, subscribe?: boolean): string[] | null {
        let params: Record<string, any> | undefined;
        if (isBoolean(arg)) {
            subscribe = arg;
            params = undefined;
        } else {
            params = arg;
        }
        if (this.isPattern(route)) {
            let subs: string[] | null = subscribe ? [route.slice(0)] : null;
            let $exp = this.replaceTopic(route);
            if (params) {
                let opts = { match: tval$, start: 2, end: 1, subs };
                $exp = this.replaceWithParams($exp, params, opts);
                opts = { ...opts, match: rest$, start: 1, end: 0 };
                $exp = this.replaceWithParams($exp, params, opts);
                subs = opts.subs
            } else {
                $exp = $exp.replace(tval$, tplPth)
                    .replace(rest$, tplPth)
            }

            this.matchers.set(new RegExp('^' + $exp + '$'), route);
            return subs;
        }
        return subscribe ? [route] : null;
    }

    match(path: string): string | null {
        const exp = Array.from(this.matchers.keys()).find(reg => reg.test(path));
        if (exp) {
            return this.matchers.get(exp) ?? null;
        }
        return null
    }

    protected replaceTopic(route: string) {
        return route.replace(sg$, sg)
            .replace(mtlPth$, mtlPth)
            .replace(mtlall$, mtlall)
            .replace(words$, words)
    }

    protected replaceWithParams(route: string, params: Record<string, any>, opts: { match: RegExp, start: number, end: number, subs: string[] | null }) {
        route.match(opts.match)?.forEach(v => {
            const name = v.slice(opts.start, v.length - opts.end);
            if (params[name]) {
                const data = params[name];
                if (isArray(data)) {
                    const orgs = opts.subs;
                    const subs: string[] = orgs ? [] : null!;
                    const repl = data.map((d, idx) => {
                        const rp = this.format(d);
                        orgs?.forEach(r => {
                            subs.push(r.replace(v, rp));
                        })
                        return rp;
                    }).join('|');
                    route = route.replace(v, `(${repl})`);
                    if (opts.subs) opts.subs = subs;
                } else {
                    const repl = this.format(data);
                    if (opts.subs) {
                        opts.subs = opts.subs.map(r => r.replace(v, repl));
                    }
                    route = route.replace(v, repl);
                }
            } else {
                route = route.replace(v, tplPth)
            }
        });
        return route;
    }

    protected format(val: any) {
        return String(val);
    }

}

const pattern$ = /(:\w+)|(\/#$)|(\/\+)|(\*)|(\$\{\w+\})/;
const sg$ = /\/\+/g;
const sg = '/[^/]+';

const tval$ = /\$\{\w+\}/g;
const rest$ = /:\w+/g;
const tplPth = '[^/]+';

const mtlPth$ = /\/#$/;
const mtlPth = '(/.{0,})?';

const mtlall$ = /\*\*/g;
const mtlall = '.{0,}';

const words$ = /\*/g;
const words = '\\w+';

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
