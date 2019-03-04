import { IocAction, IocActionContext } from './Action';
import { DecoratorRegisterer } from '../services';
import { getOwnTypeMetadata } from '../factories';
import { ClassMetadata } from '../metadatas';
import { isNumber, lang } from '../utils';

export abstract class IocCacheAction extends IocAction {

    getCacheMetadata(ctx: IocActionContext): ClassMetadata {
        if (ctx.targetReflect.expires) {
            return ctx.targetReflect;
        } else {
            let matchs = this.container.resolve(DecoratorRegisterer).getClassDecorators(ctx.targetType, lang.getClass(this));
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
