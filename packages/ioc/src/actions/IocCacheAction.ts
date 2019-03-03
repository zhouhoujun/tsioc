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
export class IocCacheAction extends IocAction {

    constructor() {
        super()
    }

    execute(container: IIocContainer, ctx: IocActionContext) {
        if (ctx.raiseContainer && ctx.raiseContainer !== container) {
            return;
        }
        super.execute(container, ctx);

        if (ctx.singleton || !ctx.targetType || !isClass(ctx.targetType)) {
            return;
        }
        let cacheMetadata = this.getCacheMetadata(container, ctx);
        if(!cacheMetadata || !cacheMetadata.expires){
            return;
        }
        let cacheManager = container.get(IocCacheManager);
        if (ctx.target) {
            if (!cacheManager.hasCache(ctx.targetType)) {
                let cacheMetadata = this.getCacheMetadata(container, ctx);
                if (cacheMetadata) {
                    cacheManager.cache(ctx.targetType, ctx.target, cacheMetadata.expires);
                }
            }
        } else {
            let target = cacheManager.get(container, ctx.targetType);
            if (target) {
                let cacheMetadata = this.getCacheMetadata(container, ctx);
                if (cacheMetadata) {
                    cacheManager.cache(ctx.targetType, target, cacheMetadata.expires);
                    ctx.target = target;
                }
            }
        }
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

