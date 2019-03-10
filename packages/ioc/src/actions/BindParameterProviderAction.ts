import { ParamProviders } from '../providers';
import { getParamMetadata } from '../factories';
import { ParameterMetadata } from '../metadatas';
import { isArray, lang } from '../utils';
import { DecoratorRegisterer } from '../services';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';


/**
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
export class BindParameterProviderAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void) {
        let type = ctx.targetType;
        let propertyKey = ctx.propertyKey;

        if (ctx.targetReflect.methodProviders && ctx.targetReflect.methodProviders[propertyKey]) {
            return next();
        }
        ctx.targetReflect.methodProviders = ctx.targetReflect.methodProviders || {};

        let decors = this.container.get(DecoratorRegisterer).getMethodDecorators(type, lang.getClass(this));

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
