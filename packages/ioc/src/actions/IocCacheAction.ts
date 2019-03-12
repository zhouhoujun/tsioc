import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorRegisterer } from '../services';
import { getOwnTypeMetadata } from '../factories';
import { ClassMetadata } from '../metadatas';
import { isNumber, lang } from '../utils';

/**
 * cache action.
 *
 * @export
 * @abstract
 * @class IocCacheAction
 * @extends {IocRegisterAction}
 */
export abstract class IocCacheAction extends IocRegisterAction {

    getCacheMetadata(ctx: RegisterActionContext): ClassMetadata {
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
