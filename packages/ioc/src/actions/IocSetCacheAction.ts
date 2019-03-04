import { IocActionContext } from './Action';
import { isClass } from '../utils';
import { IocCacheManager } from '../services';
import { IocCacheAction } from './IocCacheAction';


/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 * @class CacheAction
 * @extends {ActionComposite}
 */
export class IocSetCacheAction extends IocCacheAction {

    execute(ctx: IocActionContext, next: () => void) {
        if (ctx.singleton || !ctx.targetType || !isClass(ctx.targetType)) {
            return next();
        }
        let cacheMetadata = this.getCacheMetadata(ctx);
        if (!cacheMetadata || !cacheMetadata.expires) {
            return next();
        }
        let cacheManager = this.container.get(IocCacheManager);
        if (!cacheManager.hasCache(ctx.targetType)) {
            cacheManager.cache(ctx.targetType, ctx.target, cacheMetadata.expires);
        }
        next();
    }

}

