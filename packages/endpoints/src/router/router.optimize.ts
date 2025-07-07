import {
    ClassType, composeHandlers, DecorDefine, Empty, getClass, Handler, HandlerFn, Injector, Invocation,
    isArray, isClassType, isFunction, isString, isType, ModuleRef, OnDestroy, TypeOf
} from '@tsdi/ioc';
import { ApplicationHandler } from '@tsdi/core';
import { Pattern, PatternFormatter, Protocols } from '@tsdi/common';
import { BadRequestException, NotFoundException } from '@tsdi/common/transport';
import { defer, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { Route, ROUTES, Routes } from './route';
import { MappingDef, RouteHanlder, RouteMappingMetadata, Router } from './router';
import { TrieRoute, TrieRouter, urlToParts, Wlidcard } from './trie';
import { RestfulRequestContext } from '../RestfulRequestContext';
import { createRouteHandler } from '../impl/route.handler';
import { RouteHandler } from './route.handler';




export class OptimizedRouter extends Router<RouteHanlder> implements OnDestroy {

    private trieRouter: TrieRouter;
    private cache: Map<string, TrieRoute | null> = new Map();
    private params: Map<string, Map<string, Record<string, string>>> = new Map();

    readonly routes: Routes;

    constructor(
        private injector: Injector,
        readonly formatter: PatternFormatter,
        readonly prefix: string = '',
        readonly protocol: Protocols | null = null,
        equals?: (r1: Route, r2: Route) => boolean,
        wlidcards?: Wlidcard[],
        routes?: Routes,
        private microservice?: boolean
    ) {
        super()
        this.routes = [];
        this.trieRouter = new TrieRouter(r => this.load(r), equals ?? (microservice ? microEquals : resetfulEquals), wlidcards ?? (microservice ? microWildcards : restWildcards));
        routes?.forEach(route => this.trieRouter.insert(route));
    }


    use(route: Route): this;
    use(route: Pattern, handler: RouteHanlder, callback?: (route: Route) => void): this;
    use(arg: Route | Pattern, handler?: RouteHanlder, callback?: (route: Route) => void): this {
        let route: Route;
        if (handler) {
            route = {
                path: this.formatter.format(arg as Pattern)
            };
            if (isArray(handler)) {
                route.handlers = handler;
                route.handle = composeHandlers(handler);
            } else if (isFunction(handler)) {
                route.handle = handler;
            } else {
                route.handler = handler;
            }
        } else {
            route = arg as Route;
        }
        if (this.trieRouter.insert(route)) {
            this.routes.push(route);
        }
        callback?.(route);
        return this;
    }

    unuse(route: Route): this {
        this.trieRouter.remove(route);
        const keys: string[] = [];
        this.cache.forEach((v, k) => {
            if (v && v.has(route)) {
                keys.push(k)
            }
        });
        keys.forEach(k => this.cache.delete(k));

        return this
    }

    forEach(cb: (route: Route) => void | false): void | false {
        return this.trieRouter.forEach(cb);
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
                return this.parseCtrl(route.controller, route.path, route.pathParams);
            }

            const ctrRef = getClass(route.controller);
            const invocation = ctrRef.createInvocation(this.injector.platform().getInjector(ctrRef.type, this.injector));

            return this.parseCtrl(invocation, route.path, route.pathParams)

        } else if (route.loadController) {
            const res = route.loadController();
            const controller = await (isObservable(res) ? lastValueFrom(res) : res);
            this.injector.register(controller as ClassType);

            const ctrRef = getClass(controller);
            const invocation = ctrRef.createInvocation(this.injector);

            return this.parseCtrl(invocation, route.path, route.pathParams)

        } else if (route.loadChildren) {
            const res = route.loadChildren();
            const module = await (isObservable(res) ? lastValueFrom(res) : res);
            if (isType(module)) {
                const platform = this.injector.platform();
                if (!platform.modules.has(module)) {
                    await this.injector.get(ModuleRef).import(module, true);
                }
                const routes = platform.modules.get(module)?.injector.get(ROUTES);
                return routes?.map(r => {
                    r.prefix = route.path;
                    if (route.pathParams) {
                        r.pathParams = { ...route.pathParams };
                    }
                    return r;
                }) ?? Empty
            }
        }
        return Empty;
    }

    protected parseCtrl(invocation: Invocation, prefix: string, pathParams: any): Routes {
        const sortRoutes = invocation.class
            .getMethodDefines(m => m && m.metadata.method && isString(m.metadata.route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[];

        const anno = invocation.class.getAnnotation<MappingDef>();

        return sortRoutes.map(m => {
            const options = { ...m.metadata };
            if (anno.interceptors) {
                options.interceptors = [anno.interceptors, ...options.interceptors ?? Empty];
            }
            if (anno.guards) {
                options.guards = [...anno.guards, ...options.guards ?? Empty]
            }
            if (anno.filters) {
                options.filters = [...anno.filters, ...options.filters ?? Empty]
            }
            return {
                path: this.formatter.format(m.metadata.route as Pattern),
                prefix,
                method: m.metadata.method,
                pathParams: pathParams ? { ...pathParams } : undefined,
                handler: createRouteHandler(invocation, options, m.propertyKey)
            };
        })
    }


    protected parse(route: Route): HandlerFn | undefined {
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
        let parts: string[] | undefined;
        let trieRoute = this.cache.get(url);
        if (trieRoute == undefined) {
            parts = urlToParts(url);
            trieRoute = await this.trieRouter.match(parts);
            this.cache.set(url, trieRoute || null);
        }

        if (!trieRoute) return;
        if (this.microservice) {
            const routes = trieRoute.filter(ctx.method);
            if (!routes.length) return;
            if (routes.length == 1) {
                const route = routes[0];
                if (route) this.initPaths(ctx, route, url, parts, ctx.method || '*')
                return route;
            }
            if (routes.length > 1) {
                if (!parts) {
                    parts = urlToParts(url);
                }
                const handles = routes.map(route => {
                    return (input: RequestContext, context?: any) => {
                        this.initPaths(input, route, url, parts, ctx.method);
                        if (!route.handle) {
                            route.handle = this.parse(route)!;
                        }
                        return route.handle(input, context);
                    }
                });
                return {
                    path: url,
                    handle: composeHandlers(handles)
                }
            }
        }

        const route = trieRoute.find(ctx.method);
        if (route) this.initPaths(ctx, route, url, parts, ctx.method || '*')
        return route;
    }


    private initPaths(ctx: RequestContext, route: Route, url: string, parts?: string[], method?: string) {
        const params = method ? this.params.get(url)?.get(method) : undefined;

        if (params) {
            ctx.request.path = params;
        } else if (route?.pathParams) {
            const params: Record<string, string> = {};
            if (!parts) {
                parts = urlToParts(url);
            }
            Object.entries(route.pathParams).forEach(([v, k]) => {
                params[v] = parts![k];
            })
            ctx.request.path = params;
            let paths = this.params.get(url);
            if (!paths) {
                paths = new Map();
                this.params.set(url, paths);
            }
            if (method) paths.set(method, params);
        }
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

function handlerEquals(r1: TypeOf<Handler>, r2: TypeOf<Handler>) {
    return r1 === r2 ||
        (r1 instanceof RouteHandler
            && r2 instanceof RouteHandler
            && (r1.invocation === r2.invocation || (r1.invocation.type === r2.invocation.type && r1.propertyKey === r2.propertyKey)))
}

function routeEquals(r1: Route, r2: Route) {
    return r1.method === r2.method
        && !!(
            (r1.redirectTo && r1.redirectTo === r2.redirectTo)
            || (r1.handler && handlerEquals(r1.handler, r2.handler!))
            || (r1.handle && r1.handle === r2.handle)
            || (r1.controller && (r1.controller === r2.controller || (r1.controller instanceof Invocation && (r1.controller as Invocation).type === (r2.controller as Invocation).type)))
            || (r1.loadController && r1.loadController === r2.loadController)
            || (r1.loadChildren && r1.loadChildren === r2.loadChildren)
        );
}
function resetfulEquals(r1: Route, r2: Route) {
    if (!r1 || !r2) {
        return false;
    }
    if (r1 === r2) {
        return true;
    }
    return r1.path === r2.path && routeEquals(r1, r2);
}


function microEquals(r1: Route, r2: Route) {
    if (!r1 || !r2) {
        return false;
    }
    if (r1 === r2) {
        return true;
    }
    return routeEquals(r1, r2);
}


const microWildcards: Wlidcard[] = [
    { wlidcard: ':', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
    { wlidcard: '*', match: (part: string) => part === '*' },
    { wlidcard: '+', match: (part: string) => part === '+' },
    { wlidcard: '#', match: (part: string, parts: string[], idx: number) => part == '#' && (idx == parts.length - 1), startWith: true },
    { wlidcard: '**', match: (part: string, parts: string[], idx: number) => part === '**' && (idx == parts.length - 1), startWith: true }
];


const restWildcards: Wlidcard[] = [
    { wlidcard: '*', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
];