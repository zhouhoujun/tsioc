import { RuntimeActionContext } from './RuntimeActionContext';
import { IocCacheManager } from '../IocCacheManager';


/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 */
export const IocSetCacheAction = function (ctx: RuntimeActionContext, next: () => void) {
    let targetReflect = ctx.targetReflect;
    if (targetReflect.singleton || !targetReflect.expires || targetReflect.expires <= 0) {
        return next();
    }
    let cacheManager = ctx.injector.getInstance(IocCacheManager);
    if (!cacheManager.hasCache(ctx.type)) {
        cacheManager.cache(ctx.type, ctx.target, targetReflect.expires);
    }
    next();
};
