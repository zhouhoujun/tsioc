import { IocResolveAction, Singleton, Token } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';

/**
 * resolve service base action.
 *
 * @export
 * @abstract
 * @class IocResolveServiceAction
 * @extends {IocResolveAction}
 */
export abstract class IocResolveServiceAction extends IocResolveAction {

    abstract execute(ctx: ResolveServiceContext, next: () => void): void;

    protected resolve(ctx: ResolveServiceContext, token: Token<any>) {
        if (ctx.has(token)) {
            ctx.instance = ctx.resolve(token, ...ctx.providers);
        }
    }
}


/**
 * default resolve.
 *
 * @export
 * @class ResolveServiceTokenAction
 * @extends {IocResolveServiceAction}
 */
@Singleton
export class DefaultResolveServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.currToken || ctx.token);
        if (!ctx.instance) {
            next();
        }
    }
}
