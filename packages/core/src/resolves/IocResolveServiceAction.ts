import { Token, IocResolveAction } from '@tsdi/ioc';
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

    abstract execute(ctx: ResolveServiceContext<any>, next: () => void): void;

    protected get(ctx: ResolveServiceContext<any>, token: Token<any>) {
        if (!ctx.instance && this.container.has(token)) {
            ctx.instance = this.container.get(token, ...ctx.providers);
        }
    }

    protected resolve(ctx: ResolveServiceContext<any>, token: Token<any>) {
        if (!ctx.instance) {
            ctx.instance = this.container.resolve(token, ...ctx.providers);
        }
    }
}
