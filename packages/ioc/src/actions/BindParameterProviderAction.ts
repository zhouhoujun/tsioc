import { IocActionContext, IocAction } from './Action';
import { IIocContainer } from '../IIocContainer';
import { ParamProviders } from '../providers';
import { getParamMetadata } from '../factories';
import { ParameterMetadata } from '../metadatas';
import { isArray, lang } from '../utils';
import { DecoratorRegisterer } from '../services';


/**
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
export class BindParameterProviderAction extends IocAction {

    constructor() {
        super();
    }

    execute(container: IIocContainer, ctx: IocActionContext) {
        if (ctx.raiseContainer && ctx.raiseContainer !== container) {
            return;
        }
        super.execute(container, ctx);
        let type = ctx.targetType;
        let propertyKey = ctx.propertyKey;

        if(ctx.targetReflect.methodProviders && ctx.targetReflect.methodProviders[propertyKey]){
            return;
        }
        ctx.targetReflect.methodProviders = ctx.targetReflect.methodProviders || {};

        let decors = container.get(DecoratorRegisterer).getMethodDecorators(type, lang.getClass(this));

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
    }
}
