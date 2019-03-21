import { IocResolveAction, Token } from '@ts-ioc/ioc';
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
