"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedRouter = void 0;
exports.matchWildcard = matchWildcard;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const rxjs_1 = require("rxjs");
const route_1 = require("./route");
const router_1 = require("./router");
const trie_1 = require("./trie");
const route_handler_1 = require("../impl/route.handler");
const route_handler_2 = require("./route.handler");
class OptimizedRouter extends router_1.Router {
    get routes() {
        return this._routes;
    }
    constructor(injector, formatter, prefix = '', transport = null, options, routes, microservice) {
        super();
        this.injector = injector;
        this.formatter = formatter;
        this.prefix = prefix;
        this.transport = transport;
        this.microservice = microservice;
        this.cache = new Map();
        this.params = new Map();
        this.regExps = new Map();
        this.regCache = new Map();
        this.assets = [];
        this._routes = [];
        this.options = {
            loader: r => this.load(r),
            equals: microservice ? microEquals : resetfulEquals,
            toParts: microservice ? getMicroToPartsBy(transport) : urlToParts,
            wlidcards: microservice ? getMicroWildcardsBy(transport) : restWildcards,
            ...options
        };
        this.trieRouter = new trie_1.TrieRouter(this.options);
        routes?.forEach(route => this.trieRouter.insert(route));
    }
    use(arg, handler, callback) {
        let route;
        if (handler) {
            route = {
                path: this.formatter.format(arg),
                pattern: arg
            };
            if ((0, ioc_1.isArray)(handler)) {
                route.handlers = handler;
                route.handle = (0, ioc_1.composeHandlers)(handler);
            }
            else if ((0, ioc_1.isFunction)(handler)) {
                route.handle = handler;
            }
            else {
                route.handler = handler;
            }
        }
        else {
            route = arg;
        }
        if (route.assets) {
            this.assets.push(route);
            this.routes.push(route);
            callback?.(route);
            return this;
        }
        if (this.formatter.isRegExp && this.formatter.parseRegExp) {
            if (this.formatter.isRegExp(route.path)) {
                const wlidcard = this.options.wlidcards.find(r => r.toPath);
                if (wlidcard && wlidcard.toPath) {
                    const pathParams = {};
                    const parts = this.options.toParts(route.path);
                    parts.forEach((r, idx) => {
                        if (wlidcard.match(r, parts, idx)) {
                            pathParams[wlidcard.toPath(r)] = idx;
                        }
                    });
                    if ((0, ioc_1.hasProps)(pathParams)) {
                        route.pathParams = pathParams;
                    }
                }
                let params;
                if (route.paths && route.handler instanceof route_handler_2.RouteHandler) {
                    params = {};
                    const paths = route.paths;
                    const context = route.handler.injector;
                    Object.keys(paths).forEach(n => {
                        params[n] = context.get(paths[n]);
                    });
                }
                route.pattern = this.formatter.parseRegExp(route.path, params);
            }
        }
        if ((0, ioc_1.isRegExp)(route.pattern)) {
            this.regExps.set(route.pattern, route);
            this.routes.push(route);
        }
        else if (this.trieRouter.insert(route)) {
            this.routes.push(route);
        }
        callback?.(route);
        return this;
    }
    unuse(route) {
        this.trieRouter.remove(route);
        const keys = [];
        this.cache.forEach((v, k) => {
            if (v && v.has(route)) {
                keys.push(k);
            }
        });
        keys.forEach(k => this.cache.delete(k));
        return this;
    }
    getPatterns() {
        const paths = [];
        const patterns = [];
        const regExps = Array.from(this.regExps.keys());
        this.assets.forEach(r => {
            if ((0, ioc_1.isRegExp)(r.pattern)) {
                regExps.push(r.pattern);
            }
        });
        this.routes.forEach(r => {
            if ((0, ioc_1.isRegExp)(r.pattern))
                return;
            if (r.paths && r.pathParams && r.handler instanceof route_handler_2.RouteHandler) {
                const context = r.handler.injector;
                Object.entries(r.paths).forEach(([key, val]) => {
                    const pathValues = context.get(val, []);
                    pathValues.forEach(p => {
                        paths.push(r.path.replace(`:${key}`, p));
                    });
                });
            }
            else {
                if (r.isWildcard) {
                    patterns.push(r.path);
                }
                else {
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
    handle(req, context) {
        return this.doHandle(req, context);
    }
    intercept(req, next, context) {
        return this.doHandle(req, context, () => next.handle(req, context));
    }
    doHandle(req, context, notFound) {
        const res = context.getResponse();
        const statusAdapter = context.get(common_1.StatusAdapter);
        if (res.headersSent || (res.statusCode && statusAdapter && !statusAdapter.isNotFound(res.statusCode)))
            return (0, rxjs_1.of)(null);
        return (0, rxjs_1.defer)(async () => {
            const route = await this.getRoute(req, context);
            if (route && !route.handle) {
                route.handle = this.parse(route);
            }
            return route;
        }).pipe((0, rxjs_1.mergeMap)(route => {
            if (route?.handle) {
                return route.handle(req, context);
            }
            if (notFound)
                return notFound();
            return (0, rxjs_1.throwError)(() => new common_1.NotFoundException());
        }));
    }
    async load(route) {
        if (route.controller) {
            if (route.controller instanceof ioc_1.Invocation) {
                return this.parseCtrl(route.controller, route.path, route.pathParams);
            }
            const ctrRef = (0, ioc_1.getClassRef)(route.controller);
            const invocation = ctrRef.createInvocation(this.injector.getRuntime().getInjector(ctrRef.type, this.injector));
            return this.parseCtrl(invocation, route.path, route.pathParams);
        }
        else if (route.loadController) {
            const res = route.loadController();
            const controller = await ((0, rxjs_1.isObservable)(res) ? (0, rxjs_1.lastValueFrom)(res) : res);
            ioc_1.InjectUtil.register(this.injector, controller);
            const ctrRef = (0, ioc_1.getClassRef)(controller);
            const invocation = ctrRef.createInvocation(this.injector);
            return this.parseCtrl(invocation, route.path, route.pathParams);
        }
        else if (route.loadChildren) {
            const res = route.loadChildren();
            const module = await ((0, rxjs_1.isObservable)(res) ? (0, rxjs_1.lastValueFrom)(res) : res);
            if ((0, ioc_1.isType)(module)) {
                const runtime = this.injector.getRuntime();
                if (!runtime.getModules().has(module)) {
                    await this.injector.get(ioc_1.ModuleRef).import(module, true);
                }
                const routes = runtime.getModules().get(module)?.injector.get(route_1.ROUTES);
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
    parseCtrl(invocation, prefix, pathParams) {
        const sortRoutes = invocation.classRef
            .getMethodDefines(m => m.metadata && m.metadata.method && (0, ioc_1.isString)(m.metadata.route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length);
        const anno = invocation.classRef.getAnnotation();
        return sortRoutes.map(m => {
            const options = { ...m.metadata };
            if (anno.interceptors) {
                options.interceptors = [...anno.interceptors ?? [], ...options.interceptors ?? []];
            }
            if (anno.guards) {
                options.guards = [...anno.guards, ...options.guards ?? []];
            }
            if (anno.filters) {
                options.filters = [...anno.filters, ...options.filters ?? []];
            }
            return {
                path: this.formatter.format(m.metadata.route),
                pattern: m.metadata.route,
                prefix,
                method: m.metadata.method,
                pathParams: pathParams ? { ...pathParams } : undefined,
                paths: m.metadata.paths,
                handler: (0, route_handler_1.createRouteHandler)(invocation, options, m.propertyKey)
            };
        });
    }
    parse(route) {
        if (route.handler) {
            let handler;
            if ((0, ioc_1.isToken)(route.handler)) {
                if ((0, ioc_1.isType)(route.handler) && !this.injector.has(route.handler)) {
                    ioc_1.InjectUtil.register(this.injector, route.handler);
                }
                handler = this.injector.get(route.handler);
            }
            else {
                handler = route.handler;
            }
            return (i, c) => handler.handle(i, c);
        }
        else if (route.redirectTo) {
            const to = route.redirectTo;
            return (i, c) => (0, rxjs_1.from)(this.redirect(i, to));
        }
    }
    async getRoute(req, context) {
        const url = req.url ?? req.topic ?? req.pattern;
        if (this.assets.length && this.assets.some(r => (r.path && url.startsWith(r.path)) || ((0, ioc_1.isRegExp)(r.pattern) && r.pattern.test(url)))) {
            return;
        }
        let parts;
        let trieRoute = this.cache.get(url);
        if (trieRoute == undefined) {
            parts = this.options.toParts(url);
            trieRoute = await this.trieRouter.match(parts);
            this.cache.set(url, trieRoute || null);
        }
        if (!trieRoute) {
            if (!this.regExps.size)
                return;
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
                const params = {};
                if (!parts) {
                    parts = this.options.toParts(url);
                }
                Object.entries(route.pathParams).forEach(([v, k]) => {
                    params[v] = parts[k];
                });
                req.paths = params;
            }
            return route;
        }
        if (this.microservice) {
            const routes = trieRoute.filter(req.method);
            if (!routes.length)
                return;
            if (routes.length == 1) {
                const route = routes[0];
                if (route)
                    this.initPaths(req, route, url, parts, req.method || '*');
                return route;
            }
            if (routes.length > 1) {
                if (!parts) {
                    parts = this.options.toParts(url);
                }
                const handles = routes.map(route => {
                    return (input, context) => {
                        this.initPaths(input, route, url, parts, req.method);
                        if (!route.handle) {
                            route.handle = this.parse(route);
                        }
                        return route.handle(input, context);
                    };
                });
                return {
                    path: url,
                    handle: (0, ioc_1.composeHandlers)(handles)
                };
            }
        }
        const route = trieRoute.find(req.method);
        if (route)
            this.initPaths(req, route, url, parts, req.method || '*');
        return route;
    }
    initPaths(req, route, url, parts, method) {
        const params = method ? this.params.get(url)?.get(method) : undefined;
        if (params) {
            req.paths = params;
        }
        else if (route?.pathParams) {
            const params = {};
            if (!parts) {
                parts = this.options.toParts(url);
            }
            Object.entries(route.pathParams).forEach(([v, k]) => {
                params[v] = parts[k];
            });
            req.paths = params;
            let paths = this.params.get(url);
            if (!paths) {
                paths = new Map();
                this.params.set(url, paths);
            }
            if (method)
                paths.set(method, params);
        }
    }
    onDestroy() {
        this.regCache.clear();
        this.regExps.clear();
        this.cache.clear();
        this.params.clear();
        this.assets = [];
        this._routes = [];
        this.trieRouter.remove();
    }
    async redirect(ctx, url, alt) {
        if (!(0, ioc_1.isFunction)(ctx.redirect)) {
            throw new common_1.BadRequestException();
        }
        ctx.redirect(url, alt);
    }
}
exports.OptimizedRouter = OptimizedRouter;
function handlerEquals(r1, r2) {
    return r1 === r2 ||
        (r1 instanceof route_handler_2.RouteHandler
            && r2 instanceof route_handler_2.RouteHandler
            && (r1.invocation === r2.invocation || (r1.invocation.type === r2.invocation.type && r1.propertyKey === r2.propertyKey)));
}
function routeEquals(r1, r2) {
    return r1.method === r2.method
        && !!((r1.redirectTo && r1.redirectTo === r2.redirectTo)
            || (r1.handler && handlerEquals(r1.handler, r2.handler))
            || (r1.handle && r1.handle === r2.handle)
            || (r1.controller && (r1.controller === r2.controller || (r1.controller instanceof ioc_1.Invocation && r1.controller.type === r2.controller.type)))
            || (r1.loadController && r1.loadController === r2.loadController)
            || (r1.loadChildren && r1.loadChildren === r2.loadChildren));
}
const restWildcards = [
    { wlidcard: '*', match: (part) => part.startsWith(':'), toPath: (part) => part.slice(1) },
];
function resetfulEquals(r1, r2) {
    if (!r1 || !r2) {
        return false;
    }
    if (r1 === r2) {
        return true;
    }
    return r1.path === r2.path && routeEquals(r1, r2);
}
function microEquals(r1, r2) {
    if (!r1 || !r2) {
        return false;
    }
    if (r1 === r2) {
        return true;
    }
    return routeEquals(r1, r2);
}
function matchWildcard(wlidcard, match, mutilOrPath, includeParent, toPath) {
    let mutil;
    if ((0, ioc_1.isFunction)(mutilOrPath)) {
        toPath = mutilOrPath;
    }
    else {
        mutil = mutilOrPath;
    }
    if ((0, ioc_1.isString)(match)) {
        switch (match) {
            case 'start':
                match = (part, parts, index) => {
                    if (wlidcard === part) {
                        if (index == 0)
                            return true;
                        throw new ioc_1.Exception(`topic [${parts.toString()}] start wildcards must be first part.`);
                    }
                    return false;
                };
                break;
            case 'end':
                match = (part, parts, index) => {
                    if (wlidcard === part) {
                        if (index == parts.length - 1)
                            return true;
                        throw new ioc_1.Exception(`topic [${parts.toString()}] end wildcards must be last part.`);
                    }
                    return false;
                };
                break;
            case 'startEnd':
                match = (part, parts, index) => {
                    if (wlidcard === part) {
                        if (index == 0 || index == parts.length - 1)
                            return true;
                        throw new ioc_1.Exception(`topic [${parts.toString()}] start end wildcards must be first or last part.`);
                    }
                    return false;
                };
                break;
            case 'startWith':
                match = (part, parts, index) => part.startsWith(wlidcard);
                toPath = (part) => part.slice(1);
                break;
            case 'equals':
                match = (part, parts, index) => part == wlidcard;
                break;
        }
    }
    return {
        wlidcard,
        match,
        mutil,
        includeParent,
        toPath
    };
}
const microWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('${}', (part) => part.startsWith('${') && part.endsWith('}'), (part) => part.slice(2, -1)),
    matchWildcard('*', 'equals'),
    matchWildcard('+', 'equals'),
    matchWildcard('#', 'end', true, true),
    matchWildcard('**', 'end', true, true)
];
const mqttWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('+', 'equals'),
    matchWildcard('#', 'end', true, true)
];
const redisWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('?', 'equals'),
    matchWildcard('*', 'end', true, true),
    matchWildcard(':*', 'end', true, true)
];
const natsWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('*', 'equals'),
    matchWildcard('>', 'end', true),
];
const amqpWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('*', 'equals'),
    matchWildcard('#', 'startEnd', true, true)
];
const kafkaWildcards = [
    matchWildcard(':', 'startWith'),
    matchWildcard('+', 'equals'),
    matchWildcard('*', 'startEnd', true, true)
];
function getMicroWildcardsBy(protocol) {
    switch (protocol) {
        case common_1.Transport.MQTT:
            return mqttWildcards;
        case common_1.Transport.Redis:
            return redisWildcards;
        case common_1.Transport.Kafka:
            return kafkaWildcards;
        case common_1.Transport.NATS:
            return natsWildcards;
        case common_1.Transport.AMQP:
            return amqpWildcards;
        default:
            return microWildcards;
    }
}
function getMicroToPartsBy(protocol) {
    switch (protocol) {
        case common_1.Transport.MQTT:
            return mqttToParts;
        case common_1.Transport.Redis:
            return redisToParts;
        case common_1.Transport.Kafka:
            return kafkaToParts;
        case common_1.Transport.AMQP:
        case common_1.Transport.NATS:
            return dotParts;
        default:
            return urlToParts;
    }
}
const redisToParts = (url) => {
    if (url.indexOf('.') >= 0) {
        return dotParts(url);
    }
    if (url.indexOf(':') >= 0) {
        return url.split(':').filter(part => part).map((r, idx) => idx ? ':' + r : r);
    }
    return url ? [url] : [];
};
const kafkaToParts = (url) => {
    if (url.indexOf('.') >= 0) {
        return dotParts(url);
    }
    if (url.indexOf('-') >= 0) {
        return url.split('-').filter(part => part).map((r, idx) => idx ? '-' + r : r);
    }
    return url ? [url] : [];
};
// const kafkaToParts = (url: string) => url.split('-').filter(part => part);
const dotParts = (url) => url.split('.').filter(part => part);
const mqttToParts = (url) => url.split('/');
const urlToParts = (url) => url.split('/').filter(part => part);
//# sourceMappingURL=router.optimize.js.map