import { Abstract, chain, Injectable, isString, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { Route } from './route';
import { Middlewares, MiddlewareType } from './middlewares';
import { PipeTransform } from '../pipes/pipe';
import { CanActive } from './guard';
import { Middleware } from './middleware';


/**
 * abstract router.
 */
@Abstract()
export abstract class Router<T extends Context = Context> extends Middlewares<T> {
    /**
     * can hold protocols.
     */
    abstract get protocols(): string[];
    /**
     * routes.
     */
    abstract get routes(): Map<string, Route>;
}

/**
 * router resolver
 */
@Abstract()
export abstract class RouterResolver {
    /**
     * resolve router.
     * @param protocol the router protocal. 
     */
    abstract resolve(protocol?: string): Router;
}



const endColon = /:$/;

@Injectable()
export class MappingRouter extends Router implements OnDestroy {


    readonly routes: Map<string, Route>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, Route>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    override use(...handles: MiddlewareType[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            if (handle instanceof Route) {
                this.routes.set(handle.url, handle);
            } else {
                this.handles.push(handle);
            }
        });
        return this;
    }

    override unuse(...handles: (MiddlewareType | Type)[]) {
        handles.forEach(handle => {
            if (handle instanceof Route) {
                this.routes.delete(handle.url);
            } else {
                this.remove(this.handles, handle);
            }
        });
        return this;
    }

    override handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        return chain([...this.handles, (c, n) => this.response(c, n)], ctx, next);
    }

    protected response(ctx: Context, next: () => Promise<void>): Promise<void> {
        const route = this.routes.get(ctx.url);
        if (route) {
            return route.handle(ctx, next);
        } else {
            return next();
        }
    }

    protected match(ctx: Context): boolean {
        return isString(ctx.url);
    }

    onDestroy(): void {
        this.handles = [];
        this.routes.clear();
    }
}


export class MappingRouterResolver {

    readonly routers: Map<string, Router>;
    constructor() {
        this.routers = new Map();
    }

    resolve(protocol?: string): Router {
        if (!protocol) {
            protocol = 'msg:';
        } else if (!endColon.test(protocol)) {
            protocol = protocol + ':';
        }
        let router = this.routers.get(protocol);
        if (!router) {
            router = new MappingRouter(protocol);
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
    method?: string;
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
     * @type {(MiddlewareType | Type<Middleware>)[]}
     * @memberof RouteMetadata
     */
    middlewares?: (MiddlewareType | Type<Middleware>)[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActive>[];
}

/**
 * protocol route mapping metadata.
 */
export interface ProtocolRouteMappingMetadata extends RouteMappingMetadata {
    /**
     * protocol type.
     */
    protocol?: string;
}

export interface MappingReflect<T = any> extends TypeReflect<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;
}


