import { Injectable, Injector, Singleton } from '@tsdi/ioc';
import { ContextFactory } from '.';
import { RouteVaildator, Context, Request, Response, RequestOption } from './ctx';

const urlReg = /\/((\w|%|\.))+\.\w+$/;
const noParms = /\/\s*$/;
const hasParms = /\?\S*$/;
const subStart = /^\s*\/|\?/;

/**
 * route vaildator.
 */
@Singleton()
export class MsgRouteVaildator implements RouteVaildator {

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

@Injectable()
export class MsgContext extends Context {
    constructor(readonly request: Request, readonly response: Response, readonly injector: Injector) {
        super();
    }

    private _err!: Error;
    set error(err: Error) {
        this._err = err;
        if (err) {
            this.message = err.stack ?? err.message;
            this.status = 500;
        }
    }
}

export class MsgRequest extends Request {
    constructor(option: RequestOption | Request) {
        super();
    }
}

export class MsgResponse extends Response {
    constructor(private req: Request) {
        super();
    }
}

export const MSG_CONTEXT_FACTORY_IMPL: ContextFactory = {
    create(request: Request | RequestOption, injector: Injector): Context {
        let req: Request = request instanceof Request ? request : new MsgRequest(request);
        let rep = new MsgResponse(req);
        return new MsgContext(req, rep, injector);
    }
}
