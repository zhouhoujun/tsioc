import { Abstract, chain, isClass, isFunction, isString, OnDestroy, refl, Type, TypeReflect } from '@tsdi/ioc';
import { RequestMethod } from '../transport/packet';
import { TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';
import { Middlewarable, Middleware } from '../transport/endpoint';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteFactoryResolver, RouteRef } from './route';
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
    abstract get routes(): Map<string, Route | Router>;
    /**
     * middleware handle.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract handle(ctx: T, next?: () => Promise<void>): Promise<void>;
    /**
     * has route or not.
     * @param route route
     */
    abstract has(route: Route): boolean;
    /**
     * use route.
     * @param route 
     */
    abstract use(...route: Route[]): void;
    /**
     * unuse route.
     * @param route 
     */
    abstract unuse(...route: Route[]): void;
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



const endColon = /:$/;

export class MappingRouter extends Router implements OnDestroy {

    readonly routes: Map<string, Route>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, RouteRef>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    has(route: string | Route): boolean {
        return this.routes.has(isString(route) ? route : route.path);
    }

    use(...routes: Route[]): this {
        routes.forEach(route => {
            if (this.has(route)) return;
            this.routes.set(route.path, route);
        });
        return this;
    }

    unuse(...routes: Route[]) {
        routes.forEach(route => {
            if (route.path) {
                this.routes.delete(route.path);
            }
        });
        return this;
    }

    handle(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            if (route.handle) {
                return isFunction(route.handle) ? route.handle(ctx, next) : route.handle.handle(ctx, next);
            } else if (route.loadChildren) {
                return this.routeChildren(ctx, route.loadChildren);
            } else if (route.redirectTo) {
                return this.redirect(ctx, route.redirectTo);
            } else if (route.controller) {
                return this.routeController(ctx, route.controller, next);
            } else {
                return next();
            }
        } else {
            return next();
        }
    }

    protected async redirect(ctx: TransportContext, url: string, alt?: string) {
        ctx.redirect(url, alt);
    }

    protected async routeController(ctx: TransportContext, controller: Type, next: () => Promise<void>) {
        return await ctx.injector.get(RouteFactoryResolver).resolve(controller).last()?.handle(ctx, next);
    }

    protected async routeChildren(ctx: TransportContext, loadChildren: () => any): Promise<void> {
        const module = await loadChildren();
        const platform = ctx.injector.platform();
        if (!platform.modules.has(module)) {
            ctx.injector.get(ModuleRef).import(module);
        }
        return platform.modules.get(module)?.injector.get(RouterResolver).resolve(ctx.protocol).handle(ctx);
    }

    protected getRoute(ctx: TransportContext): Route | undefined {
        if (this.protocols.indexOf(ctx.protocol) < 0) return;
        if (ctx.status && ctx.status !== 404) return;
        if (!ctx.pattern.startsWith(this.prefix)) return;
        const url = ctx.pattern.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): Route | undefined {
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


