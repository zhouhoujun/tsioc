import { Abstract, Injector, Type, lang } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';
import { Middleware, RouteInfo } from './middleware';


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
        if (await this.canActive(ctx)) {
            await this.navigate(ctx, next);
        } else {
            await next();
        }
    }

    protected abstract navigate(ctx: T, next: () => Promise<void>): Promise<void>;

    protected async canActive(ctx: T): Promise<boolean> {
        if (!((!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url, this.prefix) === true)) return false;
        if (this.info.guards && this.info.guards.length) {
            if (!(await lang.some(
                this.info.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return false;
        }
        return true;
    }
}

/**
 * custom route resolver.
 */
export class RouteResolver extends Route {

    constructor(url: string, prefix: string, private factory: (pdr: Injector) => Middleware, readonly guards?: Type<CanActive>[]) {
        super(RouteInfo.create(url, prefix));
    }

    protected override navigate(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.factory(ctx.injector)?.execute(ctx, next);
    }

}
