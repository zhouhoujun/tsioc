import { Abstract, Injector } from '@tsdi/ioc';
import { Context } from './ctx';
import { Middleware, RouteInfo } from './handle';


/**
 * route
 */
@Abstract()
export abstract class Route<T extends Context = Context> extends Middleware<T> {

    constructor(protected info: RouteInfo) {
        super();
    }

    get url() {
        return this.info.url;
    }

    get prefix() {
        return this.info.prefix;
    }

    override async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        const canactive = await this.canActive(ctx);
        if (canactive) {
            await this.navigate(ctx, next);
        } else {
            await next();
        }
    }

    protected abstract navigate(ctx: T, next: () => Promise<void>): Promise<void>;

    protected async canActive(ctx: T): Promise<boolean> {
        return (!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix) === true;
    }
}

/**
 * custom route resolver.
 */
export class RouteResolver extends Route {

    constructor(url: string, prefix: string, private factory: (pdr: Injector) => Middleware) {
        super(RouteInfo.create(url, prefix));
    }

    protected override navigate(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.factory(ctx.injector)?.execute(ctx, next);
    }

}
