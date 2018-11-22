import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getOwnMethodMetadata, hasOwnMethodMetadata } from '../factories';
import { MethodMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';
import { ProviderTypes } from '../../types';
import { isArray } from '../../utils';

/**
 * bind parameter provider action data.
 *
 * @export
 * @interface BindParameterProviderActionData
 * @extends {ActionData<ProviderTypes[]>}
 */
export interface BindParameterProviderActionData extends ActionData<ProviderTypes[]> {

}

/**
 * bind parameters action.
 *
 * @export
 * @class BindParameterProviderAction
 * @extends {ActionComposite}
 */
export class BindParameterProviderAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindParameterProviders)
    }

    protected working(container: IContainer, data: BindParameterProviderActionData) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getMethodDecorators(type, surm => surm.actions.includes(CoreActions.bindParameterProviders) && hasOwnMethodMetadata(surm.name, type));

        let providers: ProviderTypes[] = [];
        matchs.forEach(surm => {
            let methodmtas = getOwnMethodMetadata<MethodMetadata>(surm.name, type);
            let metadatas = methodmtas[propertyKey];
            if (metadatas && isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
        });

        data.execResult = providers;

    }
}

