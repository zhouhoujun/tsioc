import { Abstract, EMPTY, isFunction, isString, lang, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { RequestMethod } from '../transport/packet';
import { promisify, TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';
import { Middlewarable, Middleware } from '../transport/endpoint';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver } from './route';
import { ModuleRef } from '../module.ref';




/**
 * abstract router.
 */
@Abstract()
export abstract class Router<T extends TransportContext = TransportContext> implements Middlewarable<T> {
    /**
     * route prefix.
     */
    abstract get prefix(): string;
    /**
     * can hold protocols.
     */
    abstract get protocols(): string[];
    /**
     * routes.
     */
    abstract get routes(): Map<string, Middleware>;
    /**
     * middleware handle.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract middleware(ctx: T, next?: () => Promise<void>): Promise<void>;
    /**
     * has route or not.
     * @param route route
     */
    abstract has(route: string): boolean;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: Route): this;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: string, middleware: Middleware): this;
    /**
     * unuse route.
     * @param route 
     */
    abstract unuse(route: string): this;
}

/**
 * router resolver
 */
@Abstract()
export abstract class RouterResolver {
    /**
     * resolve router.
     * @param protocol the router protocal. 
     * @param prefix route prefix.
     */
    abstract resolve(protocol?: string, prefix?: string): Router;
}


export class MappingRoute implements Middlewarable {

    private _guards!: CanActivate[];
    private router?: Router;
    constructor(private route: Route, private protocols: string | string[]) {

    }

    get path() {
        return this.route.path;
    }

    async middleware(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (await this.canActive(ctx)) {
            return await this.navigate(this.route, ctx, next);
        } else {
            throw ctx.throwError('Forbidden');
        }
    }

    protected canActive(ctx: TransportContext) {
        if (!this._guards) {
            this._guards = this.route.guards?.map(token => ctx.resolve(token)) ?? EMPTY;
        }
        return lang.some(this._guards.map(guard => () => promisify(guard.canActivate(ctx))), vaild => vaild === false);
    }

    protected navigate(route: Route & { router?: Router }, ctx: TransportContext, next: () => Promise<void>) {
        if (route.middleware) {
            return isFunction(route.middleware) ? route.middleware(ctx, next) : route.middleware.middleware(ctx, next);
        } else if (route.redirectTo) {
            return this.redirect(ctx, route.redirectTo);
        } else if (route.controller) {
            return this.routeController(ctx, route.controller, next);
        } else if (route.children) {
            if (!this.router) {
                this.router = new MappingRouter(this.protocols, route.path);
            }
            return this.router.middleware(ctx);
        } else if (route.loadChildren) {
            return this.routeChildren(ctx, route.loadChildren, route.path);
        } else {
            return next();
        }
    }

    protected async redirect(ctx: TransportContext, url: string, alt?: string) {
        ctx.redirect(url, alt);
    }

    protected async routeController(ctx: TransportContext, controller: Type, next: () => Promise<void>) {
        return await ctx.injector.get(RouteFactoryResolver).resolve(controller).last()?.middleware(ctx, next);
    }

    protected async routeChildren(ctx: TransportContext, loadChildren: () => any, prefix?: string): Promise<void> {
        if (!this.router) {
            const module = await loadChildren();
            const platform = ctx.injector.platform();
            if (!platform.modules.has(module)) {
                ctx.injector.get(ModuleRef).import(module);
            }
            this.router = platform.modules.get(module)?.injector.get(RouterResolver).resolve(ctx.protocol, prefix);
        }
        return this.router?.middleware(ctx);
    }

}


const endColon = /:$/;

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, Middleware>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, Middleware>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    has(route: string | Route): boolean {
        return this.routes.has(isString(route) ? route : route.path);
    }

    /**
     * use route.
     * @param route 
     */
    use(route: Route): this;
    /**
     * use route.
     * @param route 
     */
    use(route: string, middleware: Middleware): this;
    use(route: Route | string, middleware?: Middleware): this {
        if (isString(route)) {
            if (this.has(route)) return this;
            this.routes.set(route, middleware as Middleware);
        } else {
            if (this.has(route.path)) return this;
            this.routes.set(route.path, new MappingRoute(route, this.protocols));
        }

        return this;
    }

    unuse(route: string) {
        this.routes.delete(route);
        return this;
    }

    middleware(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return isFunction(route) ? route(ctx, next) : route.middleware(ctx, next);
        } else {
            return next();
        }
    }

    protected getRoute(ctx: TransportContext): Middleware | undefined {
        if (this.protocols.indexOf(ctx.protocol) < 0) return;
        if (ctx.status && ctx.status !== 404) return;
        if (!ctx.pattern.startsWith(this.prefix)) return;
        const url = ctx.pattern.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): Middleware | undefined {
        let route = this.routes.get(url);
        while (!route && url.lastIndexOf('/') > 1) {
            route = this.getRouteByUrl(url.slice(0, url.lastIndexOf('/')));
        }
        return route;
    }

    onDestroy(): void {
        this.routes.clear();
    }
}


export class MappingRouterResolver implements RouterResolver {

    readonly routers: Map<string, Router>;
    constructor() {
        this.routers = new Map();
    }

    resolve(protocol?: string, prefix?: string): Router {
        if (!protocol) {
            protocol = 'msg:';
        } else if (!endColon.test(protocol)) {
            protocol = protocol + ':';
        }
        let router = this.routers.get(protocol);
        if (!router) {
            router = new MappingRouter(protocol, prefix);
            this.routers.set(protocol, router);
        }
        return router;
    }
}


/**
 * route mapping metadata.
 */
export interface RouteMappingMetadata {
    /**
     * route.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    route?: string;
    /**
     * parent router.
     */
    parent?: Type<Router>;
    /**
     * request method.
     */
    method?: RequestMethod;
    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    contentType?: string;
    /**
     * middlewares for the route.
     *
     * @type {Middleware[]}
     * @memberof RouteMetadata
     */
    middlewares?: Middleware[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];
}

/**
 * protocol route mapping metadata.
 */
export interface ProtocolRouteMappingMetadata extends RouteMappingMetadata {
    /**
     * protocol type.
     */
    protocol?: string;
    /**
     * version of api.
     */
    version?: string;
}

/**
 * mapping type reflect.
 */
export interface MappingReflect<T = any> extends TypeReflect<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;
}


