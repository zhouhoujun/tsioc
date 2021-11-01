import { Injectable, isFunction, isString, refl, Singleton } from '@tsdi/ioc';
import { Context } from './context';
import { AbstractRouter, MiddlewareType, RouteInfo, RouteReflect } from './middleware';
import { MessageQueue } from './queue';
import { Route } from './route';


@Injectable()
export class Router<T extends Context = Context> extends MessageQueue<T> implements AbstractRouter<T> {

    constructor(protected info: RouteInfo) {
        super();
    }

    get url() {
        return this.info.url;
    }

    get prefix() {
        return this.info.prefix;
    }

    get protocols() {
        return this.info.protocols;
    }

    private urlpath!: string;
    getPath() {
        if (!this.urlpath) {
            this.urlpath = this.prefix ? `${this.prefix}/${this.url}` : this.url;
        }
        return this.urlpath;
    }

    private sorted = false;
    protected override canExecute(ctx: T): boolean {
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
            return refl.get<RouteReflect>(mddl)?.route?.url ?? '';
        } else if (mddl instanceof Router) {
            return mddl.url;
        } else if (mddl instanceof Route) {
            return mddl.url;
        }
        return '';
    }

    protected match(ctx: T): boolean {
        return (!ctx.status || ctx.status === 404) && this.matchProtocol(ctx.protocol) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix) === true;
    }

    protected matchProtocol(protocol: string) {
        return this.protocols.indexOf(protocol) >= 0;
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
        super(RouteInfo.create());
    }

    protected match(ctx: Context): boolean {
        return isString(ctx.url);
    }

    getRoot(protocol?: string): Router {
        if (!protocol) {
            protocol = 'msg:';
        } else if (!/:$/.test(protocol)) {
            protocol = protocol + ':';
        }
        let router = this.handles.find(r => {
            if (isFunction(r)) {
                return refl.get<RouteReflect>(r).route?.protocols.includes(protocol!);
            }
            if (r instanceof Router) {
                return r.protocols.includes(protocol!);
            }
            return false;
        });
        if (!router) {
            router = this.injector.resolve(Router, { provide: RouteInfo, useValue: RouteInfo.createProtocol(protocol) });
            this.use(router);
        }
        return isFunction(router) ? this.injector.state().resolve(router) : router;
    }
}
