import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getOwnMethodMetadata, hasOwnMethodMetadata } from '../factories/index';
import { MethodMetadata } from '../metadatas/index';
import { IContainer } from '../../IContainer';
import { Providers } from '../../types';
import { isArray } from '../../utils/index';

/**
 * bind parameter provider action data.
 *
 * @export
 * @interface BindParameterProviderActionData
 * @extends {ActionData<Providers[]>}
 */
export interface BindParameterProviderActionData extends ActionData<Providers[]> {

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

        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getMethodDecorators(surm => surm.actions.includes(CoreActions.bindParameterProviders) && hasOwnMethodMetadata(surm.name, type));

        let providers: Providers[] = [];
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

