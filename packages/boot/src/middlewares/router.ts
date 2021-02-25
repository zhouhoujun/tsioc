import { Inject, Injectable, isFunction, refl, Singleton } from '@tsdi/ioc';
import { MessageContext } from './ctx';
import { IRouter, ROUTE_URL, ROUTE_PREFIX, MiddlewareType, RouteReflect, ROUTE_PROTOCOL } from './handle';
import { MessageQueue } from './queue';
import { Route, RouteVaildator } from './route';


@Injectable()
export class Router extends MessageQueue implements IRouter {

    constructor(@Inject(ROUTE_URL) public url: string, @Inject(ROUTE_PREFIX) private prefix = '', @Inject(ROUTE_PROTOCOL) private protocol?: string) {
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
    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        ctx.injector = this.getInjector();
        if (!ctx.vaild) {
            ctx.vaild = ctx.injector.get(RouteVaildator);
        }
        if (this.match(ctx)) {
            if (!this.sorted) {
                this.handles = this.handles.sort((a, b) => this.getUrlFrom(b).length - this.getUrlFrom(a).length);
                this.resetFuncs();
                this.sorted = true;
            }
            await super.execute(ctx);
        }
        if (next) {
            return await next();
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
        return (!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix);
    }

    protected resetFuncs() {
        super.resetFuncs();
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
