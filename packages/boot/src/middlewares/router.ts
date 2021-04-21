import { Inject, Injectable, isFunction, refl, Singleton } from '@tsdi/ioc';
import { MessageContext } from './ctx';
import { IRouter, ROUTE_URL, ROUTE_PREFIX, MiddlewareType, RouteReflect, ROUTE_PROTOCOL } from './handle';
import { MessageQueue } from './queue';
import { Route, RouteVaildator } from './route';


@Injectable()
export class Router extends MessageQueue implements IRouter {

    constructor(@Inject(ROUTE_URL) public url: string, @Inject(ROUTE_PREFIX) private prefix = '', @Inject(ROUTE_PROTOCOL) public protocol = '') {
        super();
    }

    private urlpath: string;
    getPath() {
        if (!this.urlpath) {
            this.urlpath = this.prefix ? `${this.prefix}/${this.url}` : (this.protocol ? `${this.protocol}//${this.url}` : this.url);
        }
        return this.urlpath;
    }

    private sorted = false;
    protected canExecute(ctx: MessageContext) {
        if (!ctx.vaild) {
            ctx.vaild = this.injector.get(RouteVaildator);
        }
        return this.match(ctx);
    }

    protected beforeExec(ctx: MessageContext) {
        if (!this.sorted) {
            this.handles.sort((a, b) => this.getUrlFrom(b).length - this.getUrlFrom(a).length);
            this.resetHandler();
            this.sorted = true;
        }
    }

    getUrlFrom(mddl: MiddlewareType) {
        if (isFunction(mddl)) {
            return refl.get<RouteReflect>(mddl)?.route_url ?? '';
        } else if (mddl instanceof Router) {
            return mddl.url;
        } else if (mddl instanceof Route) {
            return mddl.url;
        }
        return '';
    }

    protected match(ctx: MessageContext) {
        return (!ctx.status || ctx.status === 404) && this.protocol === ctx.protocol && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix);
    }

    protected resetHandler() {
        super.resetHandler();
        this.sorted = false;
    }
}


/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {BuildHandles<T>}
 * @template T
 */
@Singleton()
export class RootRouter extends Router {
    constructor() {
        super('', '');
    }
}
