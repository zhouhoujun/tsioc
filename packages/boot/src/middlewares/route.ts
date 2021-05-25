import { Abstract, Inject, ProviderType, Singleton } from '@tsdi/ioc';
import { CONTEXT } from '../metadata/tk';
import { IRouteVaildator, MessageContext } from './ctx';
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

    isActiveRoute(ctx: MessageContext, route: string, routePrefix: string) {
        let routeUrl = this.getReqRoute(ctx, routePrefix);
        if (route === '' || route === routeUrl) {
            return true;
        }
        return routeUrl.startsWith(route) && subStart.test(routeUrl.substring(route.length));
    }

    getReqRoute(ctx: MessageContext, routePrefix: string): string {
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
export abstract class Route extends Middleware {

    constructor(@Inject(ROUTE_URL) private _url: string, @Inject(ROUTE_PREFIX) protected prefix: string) {
        super();
    }

    get url() {
        return this._url;
    }

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        if (this.match(ctx)) {
            await this.navigate(ctx, next);
        } else {
            await next();
        }
    }

    protected abstract navigate(ctx: MessageContext, next: () => Promise<void>): Promise<void>;

    protected match(ctx: MessageContext) {
        return (!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix);
    }
}

/**
 * custom route factory.
 */
export class FactoryRoute extends Route {

    constructor(url: string, prefix: string, private factory: (...pdrs: ProviderType[]) => Middleware) {
        super(url, prefix);
    }

    protected navigate(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        return this.factory({ provide: CONTEXT, useValue: ctx })?.execute(ctx, next);
    }

}
