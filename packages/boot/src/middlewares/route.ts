import { Abstract, Inject, Singleton, Token, tokenId } from '@tsdi/ioc';
import { IRouteVaildator, MsgContext } from './ctx';
import { Middleware } from './handle';

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

    isActiveRoute(ctx: MsgContext, route: string) {
        let routeUrl = this.vaildify(ctx.url, true);
        if (route === '') {
            return true;
        }
        return routeUrl.startsWith(route);
    }
}

export const ROUTE_URL: Token<string> = tokenId<string>('ROUTE_URL');


@Abstract()
export abstract class MessageRoute extends Middleware {

    constructor(@Inject(ROUTE_URL) private _url: string) {
        super();
    }

    get url() {
        return this._url;
    }
}