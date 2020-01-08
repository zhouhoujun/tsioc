import { RuntimeActionContext } from './RuntimeActionContext';
import { IocCacheManager } from '../IocCacheManager';

/**
 * get class cache action.
 *
 * @export
 */
export const IocGetCacheAction = function (ctx: RuntimeActionContext, next: () => void): void {
    if (!ctx.target && !ctx.targetReflect.singleton && ctx.targetReflect.expires > 0) {
        let cache = ctx.injector.getInstance(IocCacheManager).get(ctx.target, ctx.targetReflect.expires);
        if (cache) {
            ctx.target = cache;
            if (ctx.target) {
                return;
            }
        }
    }
    next();
};

