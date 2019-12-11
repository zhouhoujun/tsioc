import { Token, IocResolveAction, isNullOrUndefined, isClassType } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';

/**
 * resolve service base action.
 *
 * @export
 * @abstract
 * @class IocResolveServiceAction
 * @extends {IocResolveAction}
 */
export abstract class IocResolveServiceAction extends IocResolveAction<ResolveServiceContext> {

    protected get(ctx: ResolveServiceContext, token: Token) {
        if (!ctx.instance && ctx.injector.has(token)) {
            ctx.instance = ctx.injector.get(token, ctx.providers);
        }
    }

    protected resolve(ctx: ResolveServiceContext, token: Token) {
        if (!ctx.instance) {
            ctx.instance = ctx.injector.get(token, ctx.providers);
            if (ctx.getOptions().extend && isNullOrUndefined(ctx.instance) && isClassType(token)) {
                ctx.injector.iterator((fac, k) => {
                    if (isNullOrUndefined(ctx.instance) && ctx.reflects.isExtends(k, token)) {
                        ctx.instance = fac(ctx.providers);
                        return false;
                    }
                    return true;
                });
            }
        }
    }
}
