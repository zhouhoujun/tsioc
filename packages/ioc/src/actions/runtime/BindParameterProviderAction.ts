import { ParamProviders } from '../../providers';
import { getParamMetadata } from '../../factories';
import { ParameterMetadata } from '../../metadatas';
import { isArray, lang } from '../../utils';
import { DecoratorRegisterer } from '../../services';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';


/**
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
export class BindParameterProviderAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let type = ctx.targetType;
        let propertyKey = ctx.propertyKey;

        if (ctx.targetReflect.methodProviders && ctx.targetReflect.methodProviders[propertyKey]) {
            return next();
        }
        ctx.targetReflect.methodProviders = ctx.targetReflect.methodProviders || {};

        let decors = ctx.resolve(DecoratorRegisterer).getMethodDecorators(type, lang.getClass(this));

        let providers: ParamProviders[] = [];
        decors.forEach(d => {
            let methodmtas = getParamMetadata<ParameterMetadata>(d, type);
            let metadatas = methodmtas[propertyKey];
            if (metadatas && isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
        });

        ctx.targetReflect.methodProviders[propertyKey] = providers;

        next();
    }
}
