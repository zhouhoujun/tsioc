import { RegisterActionContext } from './RegisterActionContext';
import { IocCacheAction } from './IocCacheAction';
import { IocCacheManager } from '../services';

/**
 * get class cache action.
 *
 * @export
 * @class IocGetCacheAction
 * @extends {IocCacheAction}
 */
export class IocGetCacheAction extends IocCacheAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.target) {
            let cacheMetadata = this.getCacheMetadata(ctx);
            if (cacheMetadata && cacheMetadata.expires) {
                let cacheManager = this.container.get(IocCacheManager);
                if (cacheManager.hasCache(ctx.targetType)) {
                    ctx.target = cacheManager.get(ctx.target, cacheMetadata.expires);
                    if (ctx.target) {
                        return;
                    }
                }
            }
        }
        next();
    }
}
