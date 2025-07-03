import { getClass, HandlerFn, isArray, isFunction, OnDestroy } from '@tsdi/ioc';
import { RequestContext } from '../RequestContext';
import { Route, Routes } from './route';
import { RouteHanlder, Router } from './router';
import { TrieRoute, TrieRouter } from './trie';
import { Pattern, PatternFormatter, Protocols } from '@tsdi/common';
import { defer, from, mergeMap, Observable, of, throwError } from 'rxjs';
import { BadRequestException, NotFoundException } from '@tsdi/common/transport';
import { ApplicationHandler } from '@tsdi/core';
import { RestfulRequestContext } from '../RestfulRequestContext';



export class OptimizedRouter extends Router<RouteHanlder> implements OnDestroy {

    private trieRouter: TrieRouter = new TrieRouter();
    private cache: Map<string, Route | undefined> = new Map();

    constructor(
        readonly formatter: PatternFormatter,
        readonly prefix: string = '',
        readonly protocol: Protocols | null = null,
        routes?: Routes
    ) {
        super()
        routes?.forEach(route => this.trieRouter.insert(route));
    }


    use(route: Route): this;
    use(route: Pattern, handler: RouteHanlder, callback?: (route: Route) => void): this;
    use(arg: Route | Pattern, handler?: RouteHanlder, callback?: (route: Route) => void): this {
        const route = (handler) ? arg as Route : {
            path: this.formatter.format(arg as Pattern),
            handler
        }
        this.trieRouter.insert(route);
        callback?.(route);
        return this;
    }

    unuse(route: Route): this {
        this.trieRouter.remove(route.path);
        const keys: string[] = [];
        this.cache.forEach((v, k) => {
            if (v === route) {
                keys.push(k)
            }
        });
        keys.forEach(k => this.cache.delete(k));

        return this
    }


    handle(ctx: RequestContext, noFound?: () => Observable<any>): Observable<any> {
        if (ctx.headersSent || (ctx.status && ctx.statusAdapter && !ctx.statusAdapter.isNotFound(ctx.status))) return of(ctx)
        const route = this.getRoute(ctx);
        if (route) {
            if (route.handle) {
                return route.handle(ctx)
            }
            return defer(async () => {
                route.handle = await this.parse(route);
                return route;
            }).pipe(
                mergeMap(route => {
                   return route.handle!(ctx);
                })
            )
            // if (isArray(route)) {
            //     return runHybirds(route, ctx);
            // } else if ((route as RequestHandler).handle) {
            //     return (route as RequestHandler).handle(ctx)
            // } else {
            //     return (route as HandlerFn)(ctx);
            // }
        } else {
            if (noFound) return noFound();
            return throwError(() => new NotFoundException())
        }
    }

    intercept(ctx: RequestContext, next: ApplicationHandler<RequestContext>): Observable<any> {
        return this.handle(ctx, () => next.handle(ctx))
    }


    protected async parse(route: Route & { router?: Router }): Promise<HandlerFn | null> {
        if (route.handler) {
            return isFunction(route.handler) ? this.injector.get(route.handler) : route.handler
        } else if (route.redirectTo) {
            const to = route.redirectTo
            return (c, n) => from(this.redirect(c, to))
        } else if (route.controller) {
            const ctrRef = getClass(route.controller);
            return new ControllerRoute(ctrRef.createInvocation(this.injector), { prefix: route.path });
            // return this.injector.get(ControllerRouteFactory).create(route.controller, this.injector, route.path);
        } else if (route.children) {
            const router = new MappingRouter(this.injector, route.router?.matcher ?? this.root.matcher, route.router?.formatter ?? this.root.formatter, route.path);
            route.children.forEach(route => router.use(route));
            return router
        } else if (route.loadChildren) {
            const res = route.loadChildren();
            const module = await (isObservable(res) ? lastValueFrom(res) : res);
            if (isType(module)) {
                const platform = this.injector.platform();
                if (!platform.modules.has(module)) {
                    await this.injector.get(ModuleRef).import(module, true)
                }
                const router = platform.modules.get(module)?.injector.get(Router) as MappingRouter;
                if (router) {
                    router.prefix = route.path ?? '';
                    return router
                }
            }
        }
        return null;
    }

    getRoute(ctx: RequestContext): TrieRoute | undefined {
        const url = ctx.url;
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        const route = this.trieRouter.match(url);
        this.cache.set(url, route);
        return route;
    }

    onDestroy(): void {
        this.cache.clear();
        this.trieRouter.remove('/');
    }


    protected async redirect(ctx: RequestContext, url: string, alt?: string): Promise<any> {
        if (!isFunction((ctx as RestfulRequestContext).redirect)) {
            throw new BadRequestException();
        }
        (ctx as RestfulRequestContext).redirect(url, alt)
    }
}