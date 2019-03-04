import { IocActionContext } from './Action';
import { IocCacheAction } from './IocCacheAction';
import { IocCacheManager } from '../services';

export class IocGetCacheAction extends IocCacheAction {
    execute(ctx: IocActionContext, next: () => void): void {
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
