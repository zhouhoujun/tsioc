import { RuntimeActionContext } from './RuntimeActionContext';
import { IocRuntimeAction } from './IocRuntimeAction';
import { IocCacheManager } from '../IocCacheManager';


/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 * @class CacheAction
 * @extends {ActionComposite}
 */
export class IocSetCacheAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        if (ctx.targetReflect.singleton || !ctx.targetReflect.expires || ctx.targetReflect.expires <= 0) {
            return next();
        }
        let cacheManager = ctx.injector.getInstance(IocCacheManager);
        if (!cacheManager.hasCache(ctx.type)) {
            cacheManager.cache(ctx.type, ctx.target, ctx.targetReflect.expires);
        }
        next();
    }
}

