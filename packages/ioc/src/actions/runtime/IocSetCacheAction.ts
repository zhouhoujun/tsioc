import { RuntimeActionContext } from './RuntimeActionContext';
import { isClass } from '../../utils';
import { IocRuntimeAction } from './IocRuntimeAction';


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
        let cacheManager = this.container.getCacheManager();
        if (!cacheManager.hasCache(ctx.targetType)) {
            cacheManager.cache(ctx.targetType, ctx.target, ctx.targetReflect.expires);
        }
        next();
    }
}

