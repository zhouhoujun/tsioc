import {
    Type, composeHandlers, DecorDefine, Exception, getClassRef, HandlerFn, hasProps, Injector, Invocation,
    isArray, isType, isFunction, isRegExp, isString, ModuleRef, OnDestroy, TokenOf, isToken
} from '@tsdi/ioc';
import { Pattern, PatternFormatter, BadRequestException, NotFoundException, RequestHandler, Transport, RequestContext } from '@tsdi/common';
import { defer, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';
import { AssetRoute, Route, ROUTES, Routes } from './route';
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
    private regCache: Map<string, Route> = new Map();
    private assets: AssetRoute[] = [];

    private _routes: Routes = [];
    get routes(): Routes {
        return this._routes;
    }

    readonly options: TrieOptions;

    constructor(
        private injector: Injector,
        readonly formatter: PatternFormatter,
        readonly prefix: string = '',
        readonly transport: Transport | null = null,
        options?: Partial<TrieOptions>,
        routes?: Routes,
        private microservice?: boolean
    ) {
        super()
        this.options = {
            loader: r => this.load(r),
            equals: microservice ? microEquals : resetfulEquals,
            toParts: microservice ? getMicroToPartsBy(transport) : urlToParts,
            wlidcards: microservice ? getMicroWildcardsBy(transport) : restWildcards,
            ...options
        };
        this.trieRouter = new TrieRouter(this.options);
        routes?.forEach(route => this.trieRouter.insert(route));
    }


    use(asset: AssetRoute): this;
    use(route: Route): this;
    use(route: Pattern, handler: RouteHanlder, callback?: (route: Route) => void): this;
    use(arg: Route | Pattern, handler?: RouteHanlder, callback?: (route: Route) => void): this {
        let route: Route;
        if (handler) {
            route = {
                path: this.formatter.format(arg as Pattern),
                pattern: arg as Pattern
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
        if ((route as AssetRoute).assets) {
            this.assets.push(route as AssetRoute);
            this.routes.push(route);
            callback?.(route);
            return this;
        }
        if (this.formatter.isRegExp && this.formatter.parseRegExp) {
            if (this.formatter.isRegExp(route.path)) {
                const wlidcard = this.options.wlidcards.find(r => r.toPath);
                if (wlidcard && wlidcard.toPath) {
                    const pathParams: Record<string, number> = {};
                    const parts = this.options.toParts(route.path);
                    parts.forEach((r, idx) => {
                        if (wlidcard.match(r, parts, idx)) {
                            pathParams[wlidcard.toPath!(r)] = idx;
                        }
                    });
                    if (hasProps(pathParams)) {
                        route.pathParams = pathParams;
                    }
                }
                let params: Record<string, any> | undefined;
                if (route.paths && route.handler instanceof RouteHandler) {
                    params = {};
                    const paths = route.paths;
                    const context = route.handler.context;
                    Object.keys(paths).forEach(n => {
                        params![n] = context.get(paths[n]);
                    })
                }
                route.pattern = this.formatter.parseRegExp(route.path, params);
            }
        }
        if (isRegExp(route.pattern)) {
            this.regExps.set(route.pattern, route);
            this.routes.push(route);
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
        this.assets.forEach(r => {
            if (isRegExp(r.pattern)) {
                regExps.push(r.pattern);
            }
        });

        this.routes.forEach(r => {
            if (isRegExp(r.pattern)) return;

            if (r.paths && r.pathParams && r.handler instanceof RouteHandler) {
                const context = r.handler.context;
                Object.entries(r.paths).forEach(([key, val]) => {
                    const pathValues: any[] = context.get(val, []);
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

        });
        return {
            routes: paths.concat(patterns),
            paths,
            patterns,
            regExps
        };
    }

    handle(ctx: AbstractRequestContext, context: RequestContext): Observable<any> {
        return this.doHandle(ctx, context)
    }


    intercept(ctx: AbstractRequestContext, next: RequestHandler<AbstractRequestContext>, context: RequestContext): Observable<any> {
        return this.doHandle(ctx, context, () => next.handle(ctx, context))
    }

    doHandle(ctx: AbstractRequestContext, context: RequestContext, notFound?: () => Observable<any>): Observable<any> {
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
                    return route.handle(ctx, context);
                }

                if (notFound) return notFound();
                return throwError(() => new NotFoundException())
            })
        )
    }

    protected async load(route: Route): Promise<Routes> {
        if (route.controller) {
            if (route.controller instanceof Invocation) {
                return this.parseCtrl(route.controller, route.path, route.pathParams);
            }

            const ctrRef = getClassRef(route.controller);
            const invocation = ctrRef.createInvocation(this.injector.getRuntime().getInjector(ctrRef.type, this.injector));

            return this.parseCtrl(invocation, route.path, route.pathParams)

        } else if (route.loadController) {
            const res = route.loadController();
            const controller = await (isObservable(res) ? lastValueFrom(res) : res);
            this.injector.getInject().register(controller as Type);

            const ctrRef = getClassRef(controller);
            const invocation = ctrRef.createInvocation(this.injector);

            return this.parseCtrl(invocation, route.path, route.pathParams)

        } else if (route.loadChildren) {
            const res = route.loadChildren();
            const module = await (isObservable(res) ? lastValueFrom(res) : res);
            if (isType(module)) {
                const runtime = this.injector.getRuntime();
                if (!runtime.getModules().has(module)) {
                    await this.injector.get(ModuleRef).import(module, true);
                }
                const routes = runtime.getModules().get(module)?.injector.get(ROUTES);
                return routes?.map(r => {
                    r.prefix = route.path;
                    if (route.pathParams) {
                        r.pathParams = { ...route.pathParams };
                    }
                    return r;
                }) ?? []
            }
        }
        return [];
    }

    protected parseCtrl(invocation: Invocation, prefix: string, pathParams: any): Routes {
        const sortRoutes = invocation.classRef
            .getMethodDefines(m => m.metadata && m.metadata.method && isString(m.metadata.route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[];

        const anno = invocation.classRef.getAnnotation<MappingDef>();

        return sortRoutes.map(m => {
            const options = { ...m.metadata };
            if (anno.interceptors) {
                options.interceptors = [...anno.interceptors ?? [], ...options.interceptors ?? []];
            }
            if (anno.guards) {
                options.guards = [...anno.guards, ...options.guards ?? []]
            }
            if (anno.filters) {
                options.filters = [...anno.filters, ...options.filters ?? []]
            }
            return {
                path: this.formatter.format(m.metadata.route as Pattern),
                pattern: m.metadata.route,
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
            let handler: RequestHandler;
            if (isToken(route.handler)) {
                if (isType(route.handler) && !this.injector.has(route.handler)) {
                    this.injector.getInject().register(route.handler);
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

    async getRoute(ctx: AbstractRequestContext): Promise<Route | undefined> {
        const url = ctx.url;
        if (this.assets.length && this.assets.some(r => (r.path && url.startsWith(r.path)) || (isRegExp(r.pattern) && r.pattern.test(url)))) {
            return;
        }
        let parts: string[] | undefined;
        let trieRoute = this.cache.get(url);
        if (trieRoute == undefined) {
            parts = this.options.toParts(url);
            trieRoute = await this.trieRouter.match(parts);
            this.cache.set(url, trieRoute || null);
        }

        if (!trieRoute) {
            if (!this.regExps.size) return;
            let route = this.regCache.get(url);
            if (!route) {
                for (const regExp of this.regExps.keys()) {
                    if (regExp.test(url)) {
                        route = this.regExps.get(regExp);
                        break;
                    }
                }
                if (route) {
                    this.regCache.set(url, route);
                }
            }
            if (route?.pathParams) {
                const params: Record<string, string> = {};
                if (!parts) {
                    parts = this.options.toParts(url);
                }
                Object.entries(route.pathParams).forEach(([v, k]) => {
                    params[v] = parts![k];
                })
                ctx.request.path = params;
            }
            return route;
        }

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
                    return (input: AbstractRequestContext, context?: any) => {
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


    private initPaths(ctx: AbstractRequestContext, route: Route, url: string, parts?: string[], method?: string) {
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
        this.regCache.clear();
        this.regExps.clear();
        this.cache.clear();
        this.params.clear();
        this.assets = [];
        this._routes = [];
        this.trieRouter.remove();
    }


    protected async redirect(ctx: AbstractRequestContext, url: string, alt?: string): Promise<any> {
        if (!isFunction((ctx as RestfulRequestContext).redirect)) {
            throw new BadRequestException();
        }
        (ctx as RestfulRequestContext).redirect(url, alt)
    }
}



function handlerEquals(r1: TokenOf<RequestHandler>, r2: TokenOf<RequestHandler>) {
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


const restWildcards: Wlidcard[] = [
    { wlidcard: '*', match: (part: string) => part.startsWith(':'), toPath: (part: string) => part.slice(1) },
];

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


export function matchWildcard(wlidcard: string,
    match: 'start' | 'end' | 'equals' | 'startEnd' | 'startWith' | ((part: string, parts: string[], index: number) => boolean),
    toPath?: (part: string) => string): Wlidcard;
export function matchWildcard(wlidcard: string,
    match: 'start' | 'end' | 'equals' | 'startEnd' | 'startWith' | ((part: string, parts: string[], index: number) => boolean),
    mutil?: boolean,
    includeParent?: boolean,
    toPath?: (part: string) => string): Wlidcard;
export function matchWildcard(wlidcard: string,
    match: 'start' | 'end' | 'equals' | 'startEnd' | 'startWith' | ((part: string, parts: string[], index: number) => boolean),
    mutilOrPath?: boolean | ((part: string) => string),
    includeParent?: boolean,
    toPath?: (part: string) => string): Wlidcard {

    let mutil: boolean | undefined;
    if (isFunction(mutilOrPath)) {
        toPath = mutilOrPath;
    } else {
        mutil = mutilOrPath;
    }
    if (isString(match)) {
        switch (match) {
            case 'start':
                match = (part: string, parts: string[], index: number) => {
                    if (wlidcard === part) {
                        if (index == 0) return true;
                        throw new Exception(`topic [${parts.toString()}] start wildcards must be first part.`);
                    }
                    return false
                }
                break;
            case 'end':
                match = (part: string, parts: string[], index: number) => {
                    if (wlidcard === part) {
                        if (index == parts.length - 1) return true;
                        throw new Exception(`topic [${parts.toString()}] end wildcards must be last part.`);
                    }
                    return false
                }
                break;
            case 'startEnd':
                match = (part: string, parts: string[], index: number) => {
                    if (wlidcard === part) {
                        if (index == 0 || index == parts.length - 1) return true;
                        throw new Exception(`topic [${parts.toString()}] start end wildcards must be first or last part.`);
                    }
                    return false
                }
                break;
            case 'startWith':
                match = (part: string, parts: string[], index: number) => part.startsWith(wlidcard);
                toPath = (part: string) => part.slice(1);
                break;

            case 'equals':
                match = (part: string, parts: string[], index: number) => part == wlidcard;
                break;
        }
    }
    return {
        wlidcard,
        match,
        mutil,
        includeParent,
        toPath
    } as Wlidcard
}

const microWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('${}', (part: string) => part.startsWith('${') && part.endsWith('}'), (part: string) => part.slice(2, -1)),
    matchWildcard('*', 'equals'),
    matchWildcard('+', 'equals'),
    matchWildcard('#', 'end', true, true),
    matchWildcard('**', 'end', true, true)
];

const mqttWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('+', 'equals'),
    matchWildcard('#', 'end', true, true)
];

const redisWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('?', 'equals'),
    matchWildcard('*', 'end', true, true),
    matchWildcard(':*', 'end', true, true)
];

const natsWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('*', 'equals'),
    matchWildcard('>', 'end', true),
];

const amqpWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('*', 'equals'),
    matchWildcard('#', 'startEnd', true, true)
];

const kafkaWildcards: Wlidcard[] = [
    matchWildcard(':', 'startWith'),
    matchWildcard('+', 'equals'),
    matchWildcard('*', 'startEnd', true, true)
];

function getMicroWildcardsBy(protocol: Transport | null): Wlidcard[] {
    switch (protocol) {
        case Transport.MQTT:
            return mqttWildcards;

        case Transport.Redis:
            return redisWildcards;

        case Transport.Kafka:
            return kafkaWildcards;

        case Transport.NATS:
            return natsWildcards;

        case Transport.AMQP:
            return amqpWildcards;

        default:
            return microWildcards
    }
}


function getMicroToPartsBy(protocol: Transport | null): (url: string) => string[] {
    switch (protocol) {
        case Transport.MQTT:
            return mqttToParts;

        case Transport.Redis:
            return redisToParts;

        case Transport.Kafka:
            return kafkaToParts;

        case Transport.AMQP:
        case Transport.NATS:
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
const kafkaToParts = (url: string) => {
    if (url.indexOf('.') >= 0) {
        return dotParts(url)
    }
    if (url.indexOf('-') >= 0) {
        return url.split('-').filter(part => part).map((r, idx) => idx ? '-' + r : r);
    }
    return url ? [url] : [];
};

// const kafkaToParts = (url: string) => url.split('-').filter(part => part);
const dotParts = (url: string) => url.split('.').filter(part => part);
const mqttToParts = (url: string) => url.split('/');
const urlToParts = (url: string) => url.split('/').filter(part => part);
