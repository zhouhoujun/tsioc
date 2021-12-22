import { Abstract, Type, lang, InvocationContext } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';
import { Middleware, AbstractRouter, Route } from './middleware';


/**
 * route for {@link AbstractRouter}
 */
@Abstract()
export abstract class AbstractRoute<T extends Context = Context> extends Middleware<T> {

    constructor(protected route: Route) {
        super();
    }

    get url() {
        return this.route.url;
    }

    get prefix() {
        return this.route.prefix;
    }


    override async handle(ctx: T, next: () => Promise<void>): Promise<void> {
        if (await this.canActive(ctx)) {
            await this.navigate(ctx, next);
        } else {
            await next();
        }
    }

    protected abstract navigate(ctx: T, next: () => Promise<void>): Promise<void>;

    protected async canActive(ctx: T): Promise<boolean> {
        if (!((!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix) === true)) return false;
        if (this.route.guards && this.route.guards.length) {
            if (!(await lang.some(
                this.route.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return false;
        }
        return true;
    }
}

/**
 * route adapter.
 */
export class RouteAdapter extends AbstractRoute {

    constructor(url: string, prefix: string, private factory: (ctx?: InvocationContext) => Middleware, guards?: Type<CanActive>[]) {
        super(Route.create(url, prefix, guards));
    }

    protected override navigate(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.factory(ctx.injector.get(InvocationContext))?.handle(ctx, next);
    }
}
