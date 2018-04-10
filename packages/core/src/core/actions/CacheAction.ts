import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { isFunction, isNumber, isClass, MapSet, symbols } from '../../utils/index';
import { CoreActions } from './CoreActions';
import { Type } from '../../types';
import { DecoratorType, getOwnTypeMetadata, hasOwnClassMetadata } from '../factories/index';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { ICacheManager } from '../../ICacheManager';






export interface CacheActionData extends ActionData<ClassMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class CacheAction extends ActionComposite {

    constructor() {
        super(CoreActions.cache)
    }

    protected working(container: IContainer, data: CacheActionData) {

        if (data.singleton || !data.targetType || !isClass(data.targetType)) {
            return data;
        }
        let cacheManager = container.get<ICacheManager>(symbols.ICacheManager);

        if (data.target) {
            if (!cacheManager.hasCache(data.targetType)) {
                let cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, data.target, cacheMetadata.expires);
                }
            }
        } else {
            let target = cacheManager.get(data.targetType);
            if (target) {
                let cacheMetadata = this.getCacheMetadata(container, data);
                if (cacheMetadata) {
                    cacheManager.cache(data.targetType, target, cacheMetadata.expires);
                    data.execResult = target;
                }
            }
        }

        return data;
    }

    getCacheMetadata(container: IContainer, data: CacheActionData): ClassMetadata {
        let lifeScope = container.getLifeScope();
        let matchs = lifeScope.getClassDecorators(surm => hasOwnClassMetadata(surm.name, data.targetType));
        let cacheMetadata: ClassMetadata;
        for (let i = 0; i < matchs.length; i++) {
            let surm = matchs[i];
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, data.targetType);
            if (Array.isArray(metadata) && metadata.length > 0) {
                cacheMetadata = metadata.find(c => c && isNumber(c.expires) && c.expires > 0);
                if (cacheMetadata) {
                    break;
                }
            }
        }
        return cacheMetadata;
    }
}

