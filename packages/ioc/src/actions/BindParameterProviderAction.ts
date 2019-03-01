import { IocActionContext, IocAction } from './Action';
import { IIocContainer } from '../IIocContainer';
import { ParamProviders } from '../providers';
import { getOwnMethodMetadata, getMethodDecorators } from '../factories';
import { MethodMetadata } from '../metadatas';
import { isArray } from '../utils';


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
        if (ctx.paramProviders && ctx.paramProviders.length) {
            return;
        }
        if (ctx.raiseContainer && ctx.raiseContainer !== container) {
            return;
        }
        let type = ctx.targetType;
        let propertyKey = ctx.propertyKey;

        let decors = getMethodDecorators(type);

        let providers: ParamProviders[] = [];
        decors.forEach(d => {
            let methodmtas = getOwnMethodMetadata<MethodMetadata>(d, type);
            let metadatas = methodmtas[propertyKey];
            if (metadatas && isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
        });
        ctx.paramProviders = providers;
    }
}
