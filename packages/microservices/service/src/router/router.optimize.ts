import {
    Type, composeHandlers, Exception, getClassRef, HandlerFn, hasProps, Injector, Invocation,
    isArray, isType, isFunction, isRegExp, isString, isNil, ModuleRef, OnDestroy, TokenOf, isToken, InjectUtil
} from '@tsdi/ioc';
import { Pattern, PatternFormatter, BadRequestException, NotFoundException, RequestHandler, Transport, RequestContext, ReadableLike, Incoming, UrlIncoming, TopicIncoming, REQUEST, StatusMessageAdapter } from '@tsdi/common'
import { defer, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { AssetRoute, Route, ROUTES, Routes } from './route';
import { RouteHanlder, RoutePatterns, Router } from './router';
import { TrieOptions, TrieRoute, TrieRouter, Wlidcard } from './trie';
import { RouteHandler } from './route.handler';
import { createControllerRoutes } from './route.manifest';
import { RouteRegistry, RouteSourceSnapshot, RouteTableChange } from './route.registry';
import { CompiledRouteSnapshot, CompiledRouteTable, compareRoutes, RouteConflict } from './route.table';

export class OptimizedRouter extends Router<RouteHanlder> implements OnDestroy {

    private trieRouter: TrieRouter;
    private cache: Map<string, TrieRoute | null> = new Map();
    private matchCache: Map<string, Route | null> = new Map();
    private microMatchCache: Map<string, Route[] | null> = new Map();
    private microComposeCache: Map<string, Route> = new Map();
    private params: Map<string, Map<string, Record<string, string>>> = new Map();
    private regExps: Map<RegExp, Route> = new Map();
    private regCache: Map<string, Route> = new Map();
    private assets: AssetRoute[] = [];
    private readonly maxCacheSize: number;
    private readonly registry = new RouteRegistry();
    private regexRoutes: Route[] = [];
    private rejectedRoutes: Route[] = [];
    private routeLoaders = new Map<string, () => Routes | Promise<Routes>>();
    private batchDepth = 0;
    private cacheDirty = false;

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
        private microservice?: boolean,
        readonly name: string = ''
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
        this.maxCacheSize = Math.max(options?.maxCacheSize ?? 2048, 1);
        routes?.forEach(route => this.use(route));
    }

    /** Current route table revision. */
    get revision(): number {
        return this.registry.revision;
    }

    /** Route-table change stream for gateways/admin/swagger. */
    get changes(): Observable<RouteTableChange> {
        return this.registry.changes;
    }

    snapshot(): CompiledRouteSnapshot {
        const table = this.compiledTable();
        return {
            revision: table.revision,
            routes: table.routes,
            conflicts: this.getRouteConflicts()
        };
    }

    /** Compile the current route set into a deterministic, read-only view. */
    compiledTable(): CompiledRouteTable {
        return new CompiledRouteTable(this._routes, this.registry.revision);
    }

    /** Duplicate/ambiguous routes rejected by the matcher, plus active ones. */
    getRouteConflicts(): readonly RouteConflict[] {
        if (!this.rejectedRoutes.length) {
            return this.compiledTable().conflicts;
        }
        return new CompiledRouteTable(
            this._routes.concat(this.rejectedRoutes),
            this.registry.revision
        ).conflicts;
    }

    listRouteSources(): RouteSourceSnapshot[] {
        return this.registry.listSources();
    }


    use(asset: AssetRoute): this;
    use(route: Route): this;
    use(route: Pattern, handler: RouteHanlder, callback?: (route: Route) => void): this;
    use(arg: Route | Pattern, handler?: RouteHanlder, callback?: (route: Route) => void): this {
        this.invalidateCaches();
        if (this.batchDepth > 0) {
            this.registry.bump();
        }
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
            this.emitManualChange('use', route);
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
                    const context = route.handler.injector;
                    Object.keys(paths).forEach(n => {
                        params![n] = context.get(paths[n]);
                    })
                }
                route.pattern = this.formatter.parseRegExp(route.path, params);
            }
        }
        if (isRegExp(route.pattern)) {
            this.regExps.set(route.pattern, route);
            this.regexRoutes.push(route);
            this.regexRoutes.sort(compareRoutes);
            this.routes.push(route);
        } else if (this.trieRouter.insert(route)) {
            this.routes.push(route);
        } else {
            // Keep rejected duplicates for diagnostics/snapshots without
            // changing matcher behavior (first registration still wins).
            this.rejectedRoutes.push(route);
        }
        callback?.(route);
        this.emitManualChange('use', route);
        return this;
    }

    unuse(route: Route): this {
        this.removeRoute(route);
        // A removed route can change the winner for any cached URL; keep the
        // existing conservative invalidation for manual route mutation.
        this.invalidateCaches();
        if (this.batchDepth > 0) {
            this.registry.bump();
        } else {
            this.registry.touch('unuse', undefined, [route]);
        }
        return this
    }

    private emitManualChange(type: 'use' | 'unuse', route: Route): void {
        if (this.batchDepth === 0) {
            this.registry.touch(type, undefined, [route]);
        }
    }

    /**
     * Register or replace a named dynamic route source.
     *
     * Re-registering the same source replaces its previous routes atomically
     * from the caller's point of view and emits one `register` change.
     */
    registerRoutes(source: string, routes: Routes): this {
        const previous = this.registry.getSource(source);
        if (previous?.length) {
            this.detachRoutes(previous);
        }
        this.attachRoutes(routes);
        this.registry.setSource(source, routes);
        this.registry.touch('register', source, routes);
        return this;
    }

    /** Replace a source's route set, emitting a single `replace` change. */
    replaceRoutes(source: string, routes: Routes): this {
        const previous = this.registry.getSource(source);
        if (previous?.length) {
            this.detachRoutes(previous);
        }
        this.attachRoutes(routes);
        this.registry.setSource(source, routes);
        this.registry.touch('replace', source, routes);
        return this;
    }

    /** Register a lazy source loader; call `reloadRoutes` to materialize it. */
    registerLazyRoutes(source: string, loader: () => Routes | Promise<Routes>): this {
        this.routeLoaders.set(source, loader);
        return this;
    }

    /**
     * Reload a source from its registered loader (or an explicit loader).
     * The previous route set is replaced only after the new set resolves.
     */
    async reloadRoutes(source: string, loader?: () => Routes | Promise<Routes>): Promise<this> {
        const resolve = loader ?? this.routeLoaders.get(source);
        if (!resolve) {
            return this;
        }
        const routes = await resolve();
        this.replaceRoutes(source, routes);
        return this;
    }

    /** Remove every route owned by a source. */
    removeRoutes(source: string): this {
        this.routeLoaders.delete(source);
        const previous = this.registry.deleteSource(source);
        if (!previous?.length) {
            return this;
        }
        this.detachRoutes(previous);
        this.registry.touch('remove', source, previous);
        return this;
    }

    /** Clear every route (including manual `use` routes) and install a new set. */
    resetRoutes(routes: Routes): this {
        this.detachRoutes(this._routes.slice());
        this.rejectedRoutes = [];
        this.routeLoaders.clear();
        this.registry.clearSources();
        this.attachRoutes(routes);
        this.registry.touch('reset', undefined, routes);
        return this;
    }

    private attachRoutes(routes: readonly Route[]): void {
        this.withBatch(() => routes.forEach(route => this.use(route)));
    }

    private detachRoutes(routes: readonly Route[]): void {
        this.withBatch(() => routes.forEach(route => this.removeRoute(route)));
    }

    private withBatch(action: () => void): void {
        this.batchDepth += 1;
        try {
            action();
        } finally {
            this.batchDepth -= 1;
            if (this.batchDepth === 0 && this.cacheDirty) {
                this.cacheDirty = false;
                this.clearCaches();
            }
        }
    }

    private invalidateCaches(): void {
        if (this.batchDepth > 0) {
            this.cacheDirty = true;
            return;
        }
        this.clearCaches();
    }

    private clearCaches(): void {
        this.cache.clear();
        this.regCache.clear();
        this.matchCache.clear();
        this.microMatchCache.clear();
        this.microComposeCache.clear();
        this.params.clear();
    }

    private removeRoute(route: Route): void {
        if (!route) {
            return;
        }
        if (route.children?.length) {
            route.children.forEach(child => this.removeRoute(child));
        }
        if ((route as AssetRoute).assets) {
            const assetIndex = this.assets.indexOf(route as AssetRoute);
            if (assetIndex > -1) {
                this.assets.splice(assetIndex, 1);
            }
        }
        if (isRegExp(route.pattern)) {
            this.regExps.delete(route.pattern);
            const regexIndex = this.regexRoutes.indexOf(route);
            if (regexIndex > -1) {
                this.regexRoutes.splice(regexIndex, 1);
            }
        } else {
            this.trieRouter.remove(route);
        }
        const index = this._routes.indexOf(route);
        if (index > -1) {
            this._routes.splice(index, 1);
        }
        const rejectedIndex = this.rejectedRoutes.indexOf(route);
        if (rejectedIndex > -1) {
            this.rejectedRoutes.splice(rejectedIndex, 1);
        }
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
                const context = r.handler.injector;
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

    handle(req: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        return this.doHandle(req, context)
    }


    intercept(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>>, context: RequestContext): Observable<any> {
        return this.doHandle(req, context, () => next.handle(req, context))
    }

    doHandle(req: ReadableLike<Incoming>, context: RequestContext, notFound?: () => Observable<any>): Observable<any> {
        const pattern = req.pattern;
        const url = (req as UrlIncoming).url ?? (req as TopicIncoming).topic ?? pattern;
        if (!url) {
            return notFound ? notFound() : throwError(() => new NotFoundException());
        }
        if (!context.has(REQUEST)) {
            context.set(REQUEST, req as Incoming);
        }
        if (!context.getPayload()) {
            context.setPayload(req as Incoming);
        }
        const adapter = context.get(StatusMessageAdapter);
        if (adapter) {
            const status = adapter.status;
            const error = adapter.error;
            if (adapter.isHeadersSent() || (!isNil(status) && !(error instanceof NotFoundException))) {
                return of(null);
            }
        }

        return defer(async () => {
            const route = await this.getRoute(req, context);
            if (route && !route.handle) {
                route.handle = this.parse(route);
            }
            return route;
        }).pipe(
            mergeMap(route => {

                if (route?.handle) {
                    return route.handle(req, context);
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
            InjectUtil.register(this.injector, controller as Type);

            const ctrRef = getClassRef(controller);
            const invocation = ctrRef.createInvocation(this.injector);

            return this.parseCtrl(invocation, route.path, route.pathParams)

        } else if (route.loadChildren) {
            const res = route.loadChildren();
            const loaded = await (isObservable(res) ? lastValueFrom(res) : res);
            if (isArray(loaded)) {
                return loaded;
            }
            if (isType(loaded)) {
                const runtime = this.injector.getRuntime();
                if (!runtime.getModules().has(loaded)) {
                    await this.injector.get(ModuleRef).import(loaded, true);
                }
                const routes = runtime.getModules().get(loaded)?.injector.get(ROUTES);
                return routes?.map(r => {
                    r.prefix = route.path;
                    if (route.pathParams) {
                        r.pathParams = { ...route.pathParams };
                    }
                    return r;
                }) ?? [];
            }
        }
        return [];
    }

    protected parseCtrl(invocation: Invocation, prefix: string, pathParams: any): Routes {
        return createControllerRoutes(invocation, prefix, pathParams, this.formatter);
    }


    protected parse(route: Route): HandlerFn | undefined {
        if (route.handler) {
            let handler: RequestHandler;
            if (isToken(route.handler)) {
                if (isType(route.handler) && !this.injector.has(route.handler)) {
                    InjectUtil.register(this.injector, route.handler);
                }
                handler = this.injector.get(route.handler)
            } else {
                handler = route.handler;
            }
            return (i, c) => handler.handle(i, c)
        } else if (route.redirectTo) {
            const to = route.redirectTo;
            return (i, c) => from(this.redirect(i as any, to))
        }
    }

    async getRoute(req: ReadableLike<Incoming>, context: RequestContext): Promise<Route | undefined> {
        const url = (req as UrlIncoming).url ?? (req as TopicIncoming).topic ?? req.pattern!;
        if (this.assets.length && this.assets.some(r => (r.path && url.startsWith(r.path)) || (isRegExp(r.pattern) && r.pattern.test(url)))) {
            return;
        }
        let parts: string[] | undefined;
        let trieRoute = this.cache.get(url);
        if (trieRoute === undefined) {
            parts = this.options.toParts(url);
            trieRoute = await this.trieRouter.match(parts);
            this.setCache(this.cache, url, trieRoute || null);
        }

        if (!trieRoute) {
            if (!this.regExps.size) return;
            let route = this.regCache.get(url);
            if (!route) {
                for (const candidate of this.regexRoutes) {
                    const regExp = candidate.pattern as RegExp;
                    if (regExp.test(url)) {
                        route = candidate;
                        break;
                    }
                }
                if (route) {
                    this.setCache(this.regCache, url, route);
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
                req.paths = params;
            }
            return route;
        }

        if (this.microservice) {
            const method = req.method || '*';
            const matchKey = `${method}\u0000${url}`;
            let routes = this.microMatchCache.get(matchKey);
            if (routes === undefined) {
                const found = trieRoute.filter(req.method);
                routes = found.length ? found : null;
                if (routes) {
                    this.setCache(this.microMatchCache, matchKey, routes);
                }
            }
            if (!routes?.length) return;
            if (routes.length == 1) {
                const route = routes[0];
                if (route) this.initPaths(req, route, url, parts, method)
                return route;
            }
            if (routes.length > 1) {
                const composed = this.microComposeCache.get(matchKey);
                if (composed) {
                    return composed;
                }
                if (!parts) {
                    parts = this.options.toParts(url);
                }
                const handles = routes.map(route => {
                    return (input: ReadableLike<Incoming>, context?: RequestContext) => {
                        this.initPaths(input, route, url, parts, method);
                        if (!route.handle) {
                            route.handle = this.parse(route)!;
                        }
                        return route.handle(input, context);
                    };
                });
                const route = {
                    path: url,
                    handle: composeHandlers(handles)
                };
                this.setCache(this.microComposeCache, matchKey, route);
                return route;
            }
        }

        const method = req.method || '*';
        const matchKey = `${method}\u0000${url}`;
        let route = this.matchCache.get(matchKey);
        if (route === undefined) {
            const found = trieRoute.find(req.method);
            if (found) {
                route = found;
                this.setCache(this.matchCache, matchKey, route);
            } else {
                route = null;
            }
        }
        if (route) this.initPaths(req, route, url, parts, method)
        return route ?? undefined;
    }


    private initPaths(req: ReadableLike<Incoming>, route: Route, url: string, parts?: string[], method?: string) {
        if (!route?.pathParams) {
            return;
        }
        const params = method ? this.params.get(url)?.get(method) : undefined;

        if (params) {
            req.paths = params;
        } else if (route?.pathParams) {
            const params: Record<string, string> = {};
            if (!parts) {
                parts = this.options.toParts(url);
            }
            Object.entries(route.pathParams).forEach(([v, k]) => {
                params[v] = parts![k];
            })
            req.paths = params;
            let paths = this.params.get(url);
            if (!paths) {
                if (this.params.size >= this.maxCacheSize) {
                    this.params.clear();
                }
                paths = new Map();
                this.params.set(url, paths);
            }
            if (method) paths.set(method, params);
        }
    }

    private setCache<K, V>(cache: Map<K, V>, key: K, value: V): void {
        if (cache.size >= this.maxCacheSize) {
            cache.clear();
        }
        cache.set(key, value);
    }


    onDestroy(): void {
        this.registry.destroy();
        this.regCache.clear();
        this.regExps.clear();
        this.cache.clear();
        this.matchCache.clear();
        this.microMatchCache.clear();
        this.microComposeCache.clear();
        this.params.clear();
        this.assets = [];
        this._routes = [];
        this.regexRoutes = [];
        this.rejectedRoutes = [];
        this.routeLoaders.clear();
        this.trieRouter.remove();
    }


    protected async redirect(ctx: RequestContext, url: string, alt?: string): Promise<any> {
        throw new BadRequestException();
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
                };
                break;
            case 'end':
                match = (part: string, parts: string[], index: number) => {
                    if (wlidcard === part) {
                        if (index == parts.length - 1) return true;
                    }
                    return false
                };
                break;
            case 'startEnd':
                match = (part: string, parts: string[], index: number) => {
                    if (wlidcard === part) {
                        if (index == 0 || index == parts.length - 1) return true;
                        throw new Exception(`topic [${parts.toString()}] start end wildcards must be first or last part.`);
                    }
                    return false
                };
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
    matchWildcard('>', 'end', true)
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
        case Transport.WS:
            return dotParts;

        case Transport.UDP:
            return udpToParts;

        default:
            return urlToParts;

    }
}
const redisToParts = (url: string) => {
    if (url.indexOf('/') >= 0) {
        return urlToParts(url)
    }
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

const dotParts = (url: string) => url.split('.').filter(part => part);
const udpToParts = (url: string) => url.indexOf('/') >= 0 ? urlToParts(url) : dotParts(url);
const mqttToParts = (url: string) => url.split('/').filter(part => part);
const urlToParts = (url: string) => url.split('/').filter(part => part);
