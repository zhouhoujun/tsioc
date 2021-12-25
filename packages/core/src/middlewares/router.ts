import { Abstract, chain, DecorDefine, isString, OnDestroy, OperationTypeReflect, Type } from '@tsdi/ioc';
import { Context } from './context';
import { Route } from './route';
import { Middlewares, MiddlewareType } from './middlewares';
import { PipeTransform } from '../pipes/pipe';
import { CanActive } from './guard';



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
     * @type {MiddlewareType[]}
     * @memberof RouteMetadata
     */
    middlewares?: MiddlewareType[];
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

export interface MappingReflect<T = any> extends OperationTypeReflect<T> {
    /**
     * protocol type.
     */
    annotation: ProtocolRouteMappingMetadata;

    sortRoutes: DecorDefine[];
}




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
    /**
     * add route.
     * @param route 
     */
    abstract route(...route: Route[]): void;
    /**
     * remove route.
     * @param route 
     */
    abstract remove(...route: Route[]): void;
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


export class MappingRouter extends Router implements OnDestroy {


    readonly routes: Map<string, Route>;

    readonly protocols: string[];

    constructor(protocols: string | string[], readonly prefix = '') {
        super();
        this.routes = new Map<string, Route>();
        this.protocols = isString(protocols) ? protocols.split(';') : protocols;
    }

    route(...route: Route[]): void {
        route.forEach(r => {
            this.routes.set(r.url, r);
        });
    }

    remove(...route: Route[]): void {
        route.forEach(r => {
            this.routes.delete(r.url);
        });
    }

    override handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        return chain([...this.befores, ...this.handles, (c, n) => this.response(c, n), ...this.afters], ctx, next);
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
