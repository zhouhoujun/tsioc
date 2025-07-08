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
import { MappingDef, RouteHanlder, RouteMappingMetadata, RoutePatterns, Router } from './router';
import { TrieOptions, TrieRoute, TrieRouter, Wlidcard } from './trie';
import { RestfulRequestContext } from '../RestfulRequestContext';
import { createRouteHandler } from '../impl/route.handler';
import { RouteHandler } from './route.handler';




export class OptimizedRouter extends Router<RouteHanlder> implements OnDestroy {

    private trieRouter: TrieRouter;
    private cache: Map<string, TrieRoute | null> = new Map();
    private params: Map<string, Map<string, Record<string, string>>> = new Map();
    private regExps: Map<RegExp, Route> = new Map();

    readonly routes: Routes;
    readonly options: TrieOptions;

    constructor(
        private injector: Injector,
        readonly formatter: PatternFormatter,
        readonly prefix: string = '',
        readonly protocol: Protocols | null = null,
        options?: Partial<TrieOptions>,
        routes?: Routes,
        private microservice?: boolean
    ) {
        super()
        this.routes = [];
        this.options = {
            loader: r => this.load(r),
            equals: microservice ? microEquals : resetfulEquals,
            toParts: microservice ? getMicroToPartsBy(protocol) : urlToParts,
            wlidcards: microservice ? getMicroWildcardsBy(protocol) : restWildcards,
            ...options
        };
        this.trieRouter = new TrieRouter(this.options);
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
            if (arg instanceof RegExp) {
                route.regExp = arg;
            }
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
        if (route.regExp) {
            this.regExps.set(route.regExp, route);
        } else if (this.trieRouter.insert(route)) {
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

    getPatterns(): RoutePatterns {
        const paths: string[] = [];
        const patterns: string[] = [];
        const regExps: RegExp[] = Array.from(this.regExps.keys());
        this.routes.forEach(r => {
            if (r.path) {
                if (r.paths && r.pathParams && r.handler instanceof RouteHandler) {
                    const injector = r.handler.injector;
                    Object.entries(r.paths).forEach(([key, val]) => {
                        const pathValues: any[] = injector.get(val, Empty);
                        pathValues.forEach(p => {
                            paths.push(r.path.replace(`:${key}`, p));
                        })
                    })
                } else {
                    if (r.isWildcard) {
                        patterns.push(r.path);
                    } else {
                        paths.push(r.path);
                    }

                }
            }
        });
        return {
            routes: paths.concat(patterns),
            paths,
            patterns,
            regExps
        };
    }

    forEach(cb: (route: Route) => void | false): void | false {
        return this.trieRouter.forEach(cb);
    }


    handle(ctx: RequestContext, noFound?: () => Observable<any>): Observable<any> {
        if (ctx.headersSent || (ctx.status && ctx.statusAdapter && !ctx.statusAdapter.isNotFound(ctx.status))) return of(ctx);

        return defer(async () => {
            const route = await this.getRoute(ctx);
            if (route && !route.handle) {
                route.handle = this.parse(route);
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
                paths: m.metadata.paths,
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
            parts = this.options.toParts(url);
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
                    parts = this.options.toParts(url);
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
                parts = this.options.toParts(url);
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
    { wlidcard: '${}', match: (part: string) => part.startsWith('${') && part.endsWith('}'), toPath: (part: string) => part.slice(2, -1) },
    { wlidcard: '*', match: (part: string) => part === '*' },
    { wlidcard: '+', match: (part: string) => part === '+' },
    { wlidcard: '#', match: (part: string, parts: string[], idx: number) => part == '#' && (idx == parts.length - 1), startWith: true },
    { wlidcard: '**', match: (part: string, parts: string[], idx: number) => part === '**' && (idx == parts.length - 1), startWith: true }
];

const mqttWildcards: Wlidcard[] = [
    { wlidcard: ':', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
    { wlidcard: '+', match: (part: string) => part === '+' },
    { wlidcard: '#', match: (part: string, parts: string[], idx: number) => part == '#' && (idx == parts.length - 1), startWith: true }
];

const redisWildcards: Wlidcard[] = [
    { wlidcard: ':', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
    { wlidcard: '?', match: (part: string) => part === '?' },
    { wlidcard: '*', match: (part: string, parts: string[], idx: number) => part === '*' && (idx == parts.length - 1), startWith: true },
    { wlidcard: ':*', match: (part: string, parts: string[], idx: number) => part === ':*' && (idx == parts.length - 1), startWith: true }
];

const natsWildcards: Wlidcard[] = [
    { wlidcard: ':', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
    { wlidcard: '*', match: (part: string) => part === '*' },
    { wlidcard: '>', match: (part: string, parts: string[], idx: number) => part == '>' && (idx == parts.length - 1), startWith: true }
];

function getMicroWildcardsBy(protocol: Protocols | null): Wlidcard[] {
    switch (protocol) {
        case 'mqtt':
        case 'mqtts':
            return mqttWildcards;

        case 'redis':
            return redisWildcards;

        case 'nats':
            return natsWildcards;

        default:
            return microWildcards
    }
}


const restWildcards: Wlidcard[] = [
    { wlidcard: '*', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
];


function getMicroToPartsBy(protocol: Protocols | null): (url: string) => string[] {
    switch (protocol) {
        case 'mqtt':
        case 'mqtts':
            return mqttToParts;

        case 'redis':
            return redisToParts;

        case 'nats':
            return dotParts;

        default:
            return urlToParts;

    }

}
const redisToParts = (url: string) => {
    if (url.indexOf('.') >= 0) {
        return dotParts(url)
    }
    if (url.indexOf(':') >= 0) {
        return url.split(':').filter(part => part).map((r, idx) => idx ? ':' + r : r);
    }
    return url ? [url] : [];

};

const dotParts = (url: string) => url.split('.').filter(part => part);
const mqttToParts = (url: string) => url.split('/');
const urlToParts = (url: string) => url.split('/').filter(part => part);
