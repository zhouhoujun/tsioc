import { Abstract, chain, isClass, isString, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { RequestMethod } from '../transport/packet';
import { TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';
import { Middleware } from '../transport/middleware';
import { Middlewares } from '../transport/middlewares';
import { PipeTransform } from '../pipes/pipe';
import { Route, RouteRef } from './route';


/**
 * abstract router.
 */
@Abstract()
export abstract class Router<T extends TransportContext = TransportContext> extends Middlewares<T> {
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

    readonly routes: Map<string, RouteRef>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, RouteRef>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    override use(...handles: Middleware[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            if (handle instanceof RouteRef) {
                if (handle.url) {
                    this.routes.set(handle.url, handle);
                } else {
                    this.handles.push(handle);
                }
            } else {
                this.handles.push(handle);
            }
        });
        return this;
    }

    override unuse(...handles: Middleware[]) {
        handles.forEach(handle => {
            if (handle instanceof RouteRef) {
                if (handle.url) {
                    this.routes.delete(handle.url);
                } else {
                    this.remove(this.handles, handle);
                }
            } else {
                this.remove(this.handles, handle);
            }
        });
        return this;
    }

    override handle(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        return chain([...this.handles.map(x=> isClass(x)? ctx.resolve(x) : x), (c, n) => this.response(c, n)], ctx, next);
    }

    protected response(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const route = this.getRoute(ctx);
        if (route) {
            return route.handle(ctx, next);
        } else {
            return next();
        }
    }

    protected getRoute(ctx: TransportContext): RouteRef | undefined {
        if (this.protocols.indexOf(ctx.protocol) < 0) return;
        if (ctx.status && ctx.status !== 404) return;
        if (!ctx.pattern.startsWith(this.prefix)) return;
        const url = ctx.pattern.replace(this.prefix, '') || '/';
        return this.getRouteByUrl(url);

    }

    getRouteByUrl(url: string): RouteRef | undefined {
        let route = this.routes.get(url);
        while (!route && url.lastIndexOf('/') > 1) {
            route = this.getRouteByUrl(url.slice(0, url.lastIndexOf('/')));
        }
        return route;
    }

    onDestroy(): void {
        this.handles = [];
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


