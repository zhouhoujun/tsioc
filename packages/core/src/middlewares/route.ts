import { Abstract, Inject, Injector, ProviderType, Singleton } from '@tsdi/ioc';
import { CONTEXT } from '../metadata/tk';
import { IRouteVaildator, Context } from './ctx';
import { Middleware, ROUTE_URL, ROUTE_PREFIX } from './handle';

const urlReg = /\/((\w|%|\.))+\.\w+$/;
const noParms = /\/\s*$/;
const hasParms = /\?\S*$/;
const subStart = /^\s*\/|\?/;

/**
 * route vaildator.
 */
@Singleton()
export class RouteVaildator implements IRouteVaildator {

    isRoute(url: string): boolean {
        return !urlReg.test(url);
    }

    vaildify(routePath: string, foreNull = false): string {
        if (foreNull && routePath === '/') {
            routePath = '';
        }
        if (noParms.test(routePath)) {
            routePath = routePath.substring(0, routePath.lastIndexOf('/'));
        }
        if (hasParms.test(routePath)) {
            routePath = routePath.substring(0, routePath.lastIndexOf('?'));
        }
        return routePath;
    }

    isActiveRoute(ctx: Context, route: string, routePrefix: string) {
        let routeUrl = this.getReqRoute(ctx, routePrefix);
        if (route === '' || route === routeUrl) {
            return true;
        }
        return routeUrl.startsWith(route) && subStart.test(routeUrl.substring(route.length));
    }

    getReqRoute(ctx: Context, routePrefix: string): string {
        let reqUrl = this.vaildify(ctx.url, true);

        if (routePrefix) {
            return reqUrl.replace(routePrefix, '');
        }
        return reqUrl;
    }
}


/**
 * route
 */
@Abstract()
export abstract class Route<T extends Context = Context> extends Middleware<T> {

    constructor(@Inject(ROUTE_URL) private _url: string, @Inject(ROUTE_PREFIX) protected prefix: string) {
        super();
    }

    get url() {
        return this._url;
    }

    override async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        if (this.match(ctx)) {
            await this.navigate(ctx, next);
        } else {
            await next();
        }
    }

    protected abstract navigate(ctx: T, next: () => Promise<void>): Promise<void>;

    protected match(ctx: T): boolean {
        return (!ctx.status || ctx.status === 404) && ctx.vaild?.isActiveRoute(ctx, this.url, this.prefix) === true;
    }
}

/**
 * custom route resolver.
 */
export class RouteResolver extends Route {

    constructor(url: string, prefix: string, private factory: (pdr: Injector) => Middleware) {
        super(url, prefix);
    }

    protected override navigate(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.factory(ctx.injector)?.execute(ctx, next);
    }

}
