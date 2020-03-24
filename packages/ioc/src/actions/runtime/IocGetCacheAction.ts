import { RuntimeContext } from './RuntimeActionContext';
import { IocCacheManager } from '../IocCacheManager';

/**
 * get class cache action.
 *
 * @export
 */
export const IocGetCacheAction = function (ctx: RuntimeContext, next: () => void): void {
    let targetReflect = ctx.targetReflect;
    if (!ctx.target && !targetReflect.singleton && targetReflect.expires > 0) {
        let cache = ctx.injector.getInstance(IocCacheManager).get(ctx.target, targetReflect.expires);
        if (cache) {
            ctx.target = cache;
            if (ctx.target) {
                return;
            }
        }
    }
    next();
};

