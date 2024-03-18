import {
    EMPTY, ModuleRef, isFunction, lang, OnDestroy, pomiseOf, Injector,
    Execption, isArray, isPromise, isObservable, isBoolean
} from '@tsdi/ioc';
import {
    Handler, CanActivate, getGuardsToken, getInterceptorsToken,
    getFiltersToken, setHandlerOptions, createGuardHandler
} from '@tsdi/core';
import { Pattern, PatternFormatter, joinPath, normalize } from '@tsdi/common';
import { NotFoundExecption, BadRequestExecption } from '@tsdi/common/transport';
import { defer, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';

import { RequestHandler } from '../RequestHandler';
import { Route, Routes } from './route';
import { Middleware, MiddlewareFn, MiddlewareLike } from '../middleware/middleware';
import { MiddlewareBackend, NEXT } from '../middleware/middleware.compose';
import { RouteMatcher, Router } from './router';
import { HybridRoute, HybridRouter } from './router.hybrid';
import { ControllerRoute, ControllerRouteFactory } from './controller';
import { RequestContext } from '../RequestContext';
import { RouteHandler } from './route.handler';
import { RestfulRequestContext } from '../RestfulRequestContext';



/**
 * Mapping router.
 */
export class MappingRouter extends HybridRouter implements Middleware, OnDestroy {

    readonly routes: Map<string, HybridRoute>;


    protected micro = false;

    constructor(
        private injector: Injector,
        readonly matcher: RouteMatcher,
        readonly formatter: PatternFormatter,
        public prefix: string = '',
        routes?: Routes) {
        super()
        this.routes = new Map<string, MiddlewareFn>();
        if (routes) {
            routes.forEach(r => this.use(r));
        }
    }


    getPatterns<T = string>(): T[] {
        return this.matcher.getPatterns<T>()
    }

    use(route: Route): this;
    use(route: Pattern, middleware: HybridRoute, callback?: (route: string, regExp?: RegExp) => void): this;
    use(route: Route | Pattern, handler?: HybridRoute, callback?: (route: string, regExp?: RegExp) => void): this {
        if (handler) {
            this.addHandler(route as Pattern, handler, callback);
            return this;
        } else {
            this.addHandler((route as Route).path, new MappingRoute(this.injector, route as Route));
        }
        return this
    }

    unuse(route: Pattern, handler?: RequestHandler | MiddlewareLike): this {
        route = this.formatter.format(route);
        if (handler) {
            const handles = this.routes.get(route);
            if (isArray(handles)) {
                const idx = handles.findIndex(i => i === handler || (isFunction((i as RequestHandler).equals) && (i as RequestHandler).equals?.(handler)))
                if (idx >= 0) handles.splice(idx, 1);
            } else {
                this.routes.delete(route);
                this.matcher.unregister(route)
            }
        } else {
            this.routes.delete(route);
            this.matcher.unregister(route)
        }
        return this
    }

    handle(ctx: RequestContext, noFound?: () => Observable<any>): Observable<any> {
        if (ctx.isDone()) return of(ctx)
        const route = this.getRoute(ctx);
        if (route) {
            if (isArray(route)) {
                return runHybirds(route, ctx);
            } else if ((route as RequestHandler).handle) {
                return (route as RequestHandler).handle(ctx)
            } else {
                return defer(async () => {
                    await (isFunction(route) ? route(ctx, NEXT) : (route as Middleware).invoke(ctx, NEXT));
                    return ctx;
                });
            }
        } else {
            if (noFound) return noFound();
            return throwError(() => new NotFoundExecption())
        }
    }

    intercept(ctx: RequestContext, next: Handler<any, any>): Observable<any> {
        return this.handle(ctx, () => next.handle(ctx))
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        if (ctx.isDone()) return next()
        const route = this.getRoute(ctx);
        if (route) {
            if (isArray(route)) {
                return lastValueFrom(runHybirds(route, ctx));
            } else if ((route as RequestHandler).handle) {
                await lastValueFrom((route as RequestHandler).handle(ctx))
            } else {
                await (isFunction(route) ? route(ctx, NEXT) : (route as Middleware).invoke(ctx, NEXT));
            }
        }
        return await next()
    }

    onDestroy(): void {
        this.routes.clear();
        this.matcher.clear()
    }


    protected getRoute(ctx: RequestContext): HybridRoute | undefined {
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

    protected addHandler(route: Pattern, handler: HybridRoute, callback?: (route: string) => void) {
        route = this.formatter.format(route);
        const redpt = handler as RouteHandler;
        if (redpt.injector && redpt.options && redpt.options.paths) {
            const params: Record<string, any> = {};
            const paths = redpt.options.paths;
            const injector = redpt.injector;
            Object.keys(paths).forEach(n => {
                params[n] = injector.get(paths[n]);
            })
            this.matcher.register(route, params, this.micro);
        } else {
            this.matcher.register(route, this.micro);
        }



        if (this.routes.has(route)) {
            const handles = this.routes.get(route)!;
            if (handles instanceof ControllerRoute) throw new Execption(`route ${route} has registered with Controller: ${handles.factory.typeRef.class.className}`)
            if (isArray(handles)) {
                if (isArray(handler)) {
                    handles.push(...handler);
                } else {
                    handles.push(handler);
                }
            } else {
                this.routes.set(route, [handles, ...isArray(handler) ? handler : [handler]]);
            }
        } else {
            this.routes.set(route, handler)
        }
        callback && callback(route)
    }

}


export class DefaultRouteMatcher extends RouteMatcher {

    private matchers: Map<RegExp, string>;
    protected patterns: Map<string, any>;
    constructor() {
        super();
        this.patterns = new Map();
        this.matchers = new Map();
    }

    isPattern(route: string): boolean {
        return pattern$.test(route)
    }

    getPatterns<T = string>(): T[] {
        return Array.from(this.patterns.values());
    }

    eachPattern<T = string>(callback: (transformed: T, pattern: string) => void): void {
        this.patterns.forEach(callback);
    }

    register(route: string, subscribe?: boolean): void;
    register(route: string, params?: Record<string, any>, subscribe?: boolean): void;
    register(route: string, arg?: Record<string, any> | boolean, subscribe?: boolean): void {
        let params: Record<string, any> | undefined;
        if (isBoolean(arg)) {
            subscribe = arg;
            params = undefined;
        } else {
            params = arg;
        }
        if (this.isPattern(route)) {
            let subs: string[] | undefined = subscribe ? [route.slice(0)] : undefined;
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

            const regExp = new RegExp('^' + $exp + '$');
            subscribe && this.registerPattern(route, subs, regExp);
            this.matchers.set(regExp, route);
        } else {
            subscribe && this.registerPattern(route)
        }
    }


    unregister(route: string): void {
        this.patterns.delete(route);
    }

    clear(): void {
        this.patterns.clear();
        this.matchers.clear()
    }

    protected registerPattern(route: string, patterns?: string[], regExp?: RegExp) {
        patterns ?
            patterns.forEach(p => this.patterns.set(p, p))
            : this.patterns.set(route, route);
    }

    match(path: string): string | null {
        const exp = Array.from(this.matchers.keys()).find(reg => reg.test(path));
        if (exp) {
            return this.matchers.get(exp) ?? null;
        }
        return null
    }

    protected replaceTopic(route: string) {
        return route.replace(doat$, doat)
            .replace(sg$, sg)
            .replace(mtlPth$, mtlPth)
            .replace(mtlall$, mtlall)
            .replace(words$, words)
            .replace(anyval$, anyval)
    }

    protected replaceWithParams(route: string, params: Record<string, any>, opts: { match: RegExp, start: number, end: number, subs?: string[] }) {
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

const doat$ = /\./g;
const doat = '\\.';

const words$ = /\*/g;
const words = '\\w+';

const anyval$ = /\.\{0,\}/g;
const anyval = '.*';

/**
 * run hybird routes.
 * @param endpoints 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runHybirds<TInput extends RequestContext>(endpoints: (RequestHandler | MiddlewareLike)[] | undefined, input: TInput, isDone?: (input: TInput) => boolean): Observable<any> {
    let $obs: Observable<any> = of(input);
    if (!endpoints || !endpoints.length) {
        return $obs;
    }

    endpoints.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(() => {
                if (isDone && isDone(input)) return of(input);
                const $res = isFunction(i) ? (i as MiddlewareFn)(input, NEXT) : (isFunction((i as RequestHandler).handle) ? (i as RequestHandler).handle(input) : (i as Middleware).invoke(input, NEXT));
                if (isPromise($res) || isObservable($res)) return $res;
                return of($res);
            }));
    });

    return $obs;
}


/**
 * Mapping route.
 */
export class MappingRoute implements Middleware, RequestHandler {

    private handler?: RequestHandler;
    private _guards?: CanActivate[];

    constructor(
        protected injector: Injector,
        private route: Route) {

    }

    get path() {
        return this.route.path
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    handle(ctx: RequestContext): Observable<any> {
        return of(ctx)
            .pipe(
                mergeMap(async ctx => {
                    if (!this.handler) {
                        this.handler = await this.buildEndpoint(this.route);
                    }
                    return this.handler;
                }),
                mergeMap((handler) => {
                    return handler.handle(ctx);
                })
            );
    }

    protected canActive(ctx: RequestContext) {
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
            return this.injector.get(ControllerRouteFactory).create(route.controller, this.injector, route.path);
        } else if (route.children) {
            const router = new MappingRouter(this.injector, new DefaultRouteMatcher(), this.injector.get(PatternFormatter), route.path);
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
        let handler: RequestHandler;
        if (route.handler) {
            handler = isFunction(route.handler) ? this.injector.get(route.handler) : route.handler
        } else if (route.controller) {
            handler = this.injector.get(ControllerRouteFactory).create(route.controller, this.injector, route.path);
        } else {
            const middleware = await this.parse(route);
            handler = new MiddlewareBackend([middleware])
        }

        if (this.route.interceptors || this.route.guards || this.route.filters) {
            const route = joinPath(this.route.path);
            const gendpt = createGuardHandler(this.injector, handler, getInterceptorsToken(route), getGuardsToken(route), getFiltersToken(route));
            setHandlerOptions(gendpt, this.route);
            handler = gendpt;
        }

        return handler;
    }

    protected async redirect(ctx: RequestContext, url: string, alt?: string): Promise<void> {
        if (!isFunction((ctx as RestfulRequestContext).redirect)) {
            throw new BadRequestExecption();
        }
        (ctx as RestfulRequestContext).redirect(url, alt)
    }

}
