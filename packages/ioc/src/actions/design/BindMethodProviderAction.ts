import { MethodMetadata } from '../../metadatas/MethodMetadata';
import { isArray } from '../../utils/lang';
import { DesignActionContext } from './DesignActionContext';
import { CTX_CURR_DECOR } from '../../context-tokens';


/**
 * bind method provider action.
 *
 * @export
 */
export const BindMethodProviderAction = function (ctx: DesignActionContext, next: () => void) {
    let refs = ctx.reflects;
    let targetReflect = ctx.targetReflect;
    targetReflect.defines.extendTypes.forEach(ty => {
        let metas = refs.getMethodMetadata<MethodMetadata>(ctx.getValue(CTX_CURR_DECOR), ty);
        Object.keys(metas).forEach(propertyKey => {
            let metadatas = metas[propertyKey];
            let providers = [];
            if (metadatas && isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
            if (targetReflect.methodParamProviders.has(propertyKey)) {
                targetReflect.methodParamProviders.get(propertyKey).push(...providers);
            } else {
                targetReflect.methodParamProviders.set(propertyKey, providers);
            }
        });
    });

    next();
};

