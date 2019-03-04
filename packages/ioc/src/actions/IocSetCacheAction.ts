import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { isClass, lang, isNumber } from '../utils';
import { IocCacheManager, DecoratorRegisterer } from '../services';
import { ClassMetadata } from '../metadatas';
import { getOwnTypeMetadata } from '../factories';


/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 * @class CacheAction
 * @extends {ActionComposite}
 */
export class IocSetCacheAction extends IocAction {

    execute(ctx: IocActionContext, next: () => void) {
        if (ctx.singleton || !ctx.targetType || !isClass(ctx.targetType)) {
            return next();
        }
        let cacheMetadata = this.getCacheMetadata(this.container, ctx);
        if (!cacheMetadata || !cacheMetadata.expires) {
            return next();
        }
        let cacheManager = this.container.get(IocCacheManager);
        if (!cacheManager.hasCache(ctx.targetType)) {
            cacheManager.cache(ctx.targetType, ctx.target, cacheMetadata.expires);
        }
        next();
    }

    getCacheMetadata(container: IIocContainer, ctx: IocActionContext): ClassMetadata {
        if (ctx.targetReflect.expires) {
            return ctx.targetReflect;
        } else {
            let matchs = container.resolve(DecoratorRegisterer).getClassDecorators(ctx.targetType, lang.getClass(this));
            let cacheMetadata: ClassMetadata;
            matchs.some(d => {
                let metadata = getOwnTypeMetadata<ClassMetadata>(d, ctx.targetType);
                if (Array.isArray(metadata) && metadata.length > 0) {
                    cacheMetadata = metadata.find(c => c && isNumber(c.expires) && c.expires > 0);
                    return !!cacheMetadata;
                }
                return false;
            });
            return cacheMetadata;
        }
    }
}

