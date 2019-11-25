import { MethodMetadata } from '../../metadatas';
import { isArray } from '../../utils';
import { DesignActionContext } from './DesignActionContext';
import { IocDesignAction } from './IocDesignAction';
import { CTX_CURR_DECOR } from '../../context-tokens';


/**
 * bind method provider action.
 *
 * @export
 * @class BindMethodProviderAction
 * @extends {ActionComposite}
 */
export class BindMethodProviderAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        let refs = ctx.reflects;
        ctx.targetReflect.defines.extendTypes.forEach(ty => {
            let metas = refs.getMethodMetadata<MethodMetadata>(ctx.get(CTX_CURR_DECOR), ty);
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
                if (ctx.targetReflect.methodParamProviders.has(propertyKey)) {
                    ctx.targetReflect.methodParamProviders.get(propertyKey).push(...providers);
                } else {
                    ctx.targetReflect.methodParamProviders.set(propertyKey, providers);
                }
            });
        });

        next();
    }
}
