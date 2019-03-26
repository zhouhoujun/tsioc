import { ParamProviders } from '../../providers';
import { getParamMetadata, getMethodMetadata } from '../../factories';
import { ParameterMetadata, MethodMetadata } from '../../metadatas';
import { isArray, lang } from '../../utils';
import { DecoratorRegisterer, MetadataService } from '../../services';
import { DesignActionContext } from './DesignActionContext';
import { IocDesignAction } from './IocDesignAction';


/**
 * bind method provider action.
 *
 * @export
 * @class BindMethodProviderAction
 * @extends {ActionComposite}
 */
export class BindMethodProviderAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {

        let metas = getMethodMetadata<MethodMetadata>(ctx.currDecoractor, ctx.targetType);

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

        next();
    }
}
