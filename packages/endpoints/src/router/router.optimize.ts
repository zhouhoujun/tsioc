import {
    ClassType, composeHandlers, DecorDefine, Empty, getClass, Handler, HandlerFn, hasProps,
    Injector, Invocation, isArray, isClassType, isFunction, isString, isType, ModuleRef, OnDestroy
} from '@tsdi/ioc';
import { ApplicationHandler } from '@tsdi/core';
import { Pattern, PatternFormatter, Protocols } from '@tsdi/common';
import { BadRequestException, NotFoundException } from '@tsdi/common/transport';
import { defer, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { Route, ROUTES, Routes } from './route';
import { RouteHanlder, RouteMappingMetadata, Router } from './router';
import { TrieRoute, TrieRouter, Wlidcard } from './trie';
import { RestfulRequestContext } from '../RestfulRequestContext';
import { createRouteHandler } from '../impl/route.handler';



const resetfulEquals = (r1: Route, r2: Route) => {
    if (!r1 || !r2) {
        return false;
    }
    if (r1 === r2) {
        return true;
    }
    return r1.path === r2.path
        && r1.method === r2.method
        && !!(
            (r1.redirectTo && r1.redirectTo === r2.redirectTo)
            || (r1.handler && r1.handler === r2.handler)
            || (r1.handle && r1.handle === r2.handle)
            || (r1.controller && (r1.controller === r2.controller || (r1.controller instanceof Invocation && (r1.controller as Invocation).type === (r2.controller as Invocation).type)))
            || (r1.loadController && r1.loadController === r2.loadController)
            || (r1.loadChildren && r1.loadChildren === r2.loadChildren)
        );
}


export class OptimizedRouter extends Router<RouteHanlder> implements OnDestroy {

    private trieRouter: TrieRouter;
    private cache: Map<string, Route | undefined> = new Map();
    private params: Map<string, Record<string, string>> = new Map();

    constructor(
        private injector: Injector,
        readonly formatter: PatternFormatter,
        readonly prefix: string = '',
        readonly protocol: Protocols | null = null,
        equals?: (r1: Route, r2: Route) => boolean,
        wlidcards?: Wlidcard[],
        routes?: Routes
    ) {
        super()
        this.trieRouter = new TrieRouter(r => this.load(r), equals ?? resetfulEquals, wlidcards)
        routes?.forEach(route => this.trieRouter.insert(route));
    }


    use(route: Route): this;
    use(route: Pattern, handler: RouteHanlder, callback?: (route: Route) => void): this;
    use(arg: Route | Pattern, handler?: RouteHanlder, callback?: (route: Route) => void): this {
        let route: Route;
        if (handler) {
            route = {
                path: this.formatter.format(arg as Pattern),
                handle: composeHandlers(isArray(handler) ? handler : [handler])
            };
        } else {
            route = arg as Route;
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
        if (ctx.headersSent || (ctx.status && ctx.statusAdapter && !ctx.statusAdapter.isNotFound(ctx.status))) return of(ctx);

        return defer(async () => {
            const route = await this.getRoute(ctx);
            if (route && !route.handle) {
                route.handle = await this.parse(route);
            }
            return route;
        }).pipe(
            mergeMap(route => {

                if (route?.handle) {
                    return route.handle(ctx);
                }

                if (noFound) return noFound();
                return throwError(() => new NotFoundException())
            })
        )
    }

    intercept(ctx: RequestContext, next: ApplicationHandler<RequestContext>): Observable<any> {
        return this.handle(ctx, () => next.handle(ctx))
    }

    protected async load(route: Route): Promise<Routes> {
        if (route.controller) {
            if (route.controller instanceof Invocation) {
                return this.parseCtrl(route.controller)
            }

            const ctrRef = getClass(route.controller);
            const invocation = ctrRef.createInvocation(this.injector.platform().getInjector(ctrRef.type, this.injector));

            return this.parseCtrl(invocation)

        } else if (route.loadController) {
            const res = route.loadController();
            const controller = await (isObservable(res) ? lastValueFrom(res) : res);
            this.injector.register(controller as ClassType);

            const ctrRef = getClass(controller);
            const invocation = ctrRef.createInvocation(this.injector);

            return this.parseCtrl(invocation)

        } else if (route.loadChildren) {
            const res = route.loadChildren();
            const module = await (isObservable(res) ? lastValueFrom(res) : res);
            if (isType(module)) {
                const platform = this.injector.platform();
                if (!platform.modules.has(module)) {
                    await this.injector.get(ModuleRef).import(module, true);
                }
                const routes = platform.modules.get(module)?.injector.get(ROUTES);
                return routes ?? Empty
            }
        }
        return Empty;
    }

    protected parseCtrl(invocation: Invocation): Routes {
        const sortRoutes = invocation.class
            .getMethodDefines(m => m && isString((m.metadata as RouteMappingMetadata).route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[];

        return sortRoutes.map(m => {
            return {
                path: this.formatter.format(m.metadata.route as Pattern),
                method: m.metadata.method,
                handler: createRouteHandler(invocation, { ...m.metadata }, m.propertyKey)
            };
        })
    }


    protected async parse(route: Route): Promise<HandlerFn | undefined> {
        if (route.handler) {
            let handler: Handler;
            if (isFunction(route.handler)) {
                if (isClassType(route.handler) && !this.injector.has(route.handler)) {
                    this.injector.register(route.handler);
                }
                handler = this.injector.get(route.handler)
            } else {
                handler = route.handler;
            }
            return (i, c) => handler.handle(i, c)
        } else if (route.redirectTo) {
            const to = route.redirectTo;
            return (i, c) => from(this.redirect(i, to))
        }
    }

    async getRoute(ctx: RequestContext): Promise<Route | undefined> {
        const url = ctx.url;
        if (this.cache.has(url)) {
            if (this.params.has(url)) {
                ctx.request.params = this.params.get(url);
            }
            return this.cache.get(url);
        }

        const params = {};
        const trieRoute = await this.trieRouter.match(url, params);
        if (hasProps(params)) {
            ctx.request.params = params;
            this.params.set(url, params);
        }
        const route = trieRoute?.get(ctx.method);
        this.cache.set(url, route);
        return route;
    }

    onDestroy(): void {
        this.cache.clear();
        this.params.clear();
        this.trieRouter.remove('/');
    }


    protected async redirect(ctx: RequestContext, url: string, alt?: string): Promise<any> {
        if (!isFunction((ctx as RestfulRequestContext).redirect)) {
            throw new BadRequestException();
        }
        (ctx as RestfulRequestContext).redirect(url, alt)
    }
}