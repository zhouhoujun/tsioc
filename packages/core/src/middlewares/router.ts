import { chain, isString, OnDestroy } from '@tsdi/ioc';
import { Context } from './context';
import { Route, Router } from './middleware';


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
        return chain([...this.befores, ...this.handles, (c, n) => this.execute(c, n), ...this.afters], ctx, next);
    }

    protected execute(ctx: Context, next: () => Promise<void>): Promise<void> {
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
