import { Abstract, Inject, ProviderType, Singleton, Token, tokenId, Type, TypeReflect } from '@tsdi/ioc';
import { IRouteVaildator, MessageContext } from './ctx';
import { Middleware } from './handle';
import { CONTEXT } from './mapping';

const urlReg = /\/((\w|%|\.))+\.\w+$/;
const noParms = /\/\s*$/;
const hasParms = /\?\S*$/;

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
        if (route === '') {
            return true;
        }
        return routeUrl.startsWith(route);
    }

    getReqRoute(ctx: MessageContext, routePrefix: string): string {
        let reqUrl = this.vaildify(ctx.url, true);

        if (routePrefix) {
            return reqUrl.replace(routePrefix, '');
        }
        return reqUrl;
    }
}

export const ROUTE_URL: Token<string> = tokenId<string>('ROUTE_URL');


@Abstract()
export abstract class MessageRoute extends Middleware {

    constructor(private _url: string, protected parentRoute: string) {
        super();
    }

    get url() {
        return this._url;
    }

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        if (this.match(ctx)) {
            this.navigate(ctx, next);
        } else {
            return await next();
        }
    }

    protected abstract navigate(ctx: MessageContext, next: () => Promise<void>): Promise<void>;

    protected match(ctx: MessageContext) {
        return (!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.parentRoute);
    }
}


export class FactoryRoute extends MessageRoute {

    constructor(url: string, parentRoute: string, private factory: (...pdrs: ProviderType[]) => Middleware) {
        super(url, parentRoute);
    }

    protected navigate(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        return this.factory({provide: CONTEXT, useValue: ctx})?.execute(ctx, next);
    }

}

