import { Token } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveAction } from './IocResolveAction';

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
        if (this.container.has(token)) {
            ctx.instance = this.container.resolve(token, ...ctx.providers);
        }
    }
}
