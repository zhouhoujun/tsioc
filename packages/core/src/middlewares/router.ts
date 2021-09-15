import { Inject, Injectable, isFunction, refl, Singleton } from '@tsdi/ioc';
import { Context } from './ctx';
import { IRouter, ROUTE_URL, ROUTE_PREFIX, MiddlewareType, RouteReflect, ROUTE_PROTOCOL } from './handle';
import { MessageQueue } from './queue';
import { Route, RouteVaildator } from './route';


@Injectable()
export class Router<T extends Context = Context> extends MessageQueue<T> implements IRouter<T> {

    constructor(@Inject(ROUTE_URL) public url: string, @Inject(ROUTE_PREFIX) private prefix = '', @Inject(ROUTE_PROTOCOL) public protocol = '') {
        super();
    }

    private urlpath!: string;
    getPath() {
        if (!this.urlpath) {
            this.urlpath = this.prefix ? `${this.prefix}/${this.url}` : (this.protocol ? `${this.protocol}//${this.url}` : this.url);
        }
        return this.urlpath;
    }

    private sorted = false;
    protected override canExecute(ctx: T): boolean {
        if (!ctx.vaild) {
            ctx.vaild = this.injector.get(RouteVaildator);
        }
        return this.match(ctx);
    }

    protected override beforeExec(ctx: T) {
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

    protected match(ctx: T): boolean {
        return (!ctx.status || ctx.status === 404) && this.protocol === ctx.protocol && ctx.vaild?.isActiveRoute(ctx, this.url, this.prefix) === true;
    }

    protected override resetHandler() {
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
