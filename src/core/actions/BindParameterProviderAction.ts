import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType, getMethodMetadata } from '../factories/index';
import { MethodMetadata } from '../metadatas/index';
import { IContainer } from '../../IContainer';
import { ParamProvider } from '../../ParamProvider';
import { isArray } from '../../utils/index';

export interface BindParameterProviderActionData extends ActionData<ParamProvider[]> {

}

export class BindParameterProviderAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindParameterProviders)
    }

    protected working(container: IContainer, data: BindParameterProviderActionData) {

        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getMethodDecorators(surm => surm.actions.includes(CoreActions.bindParameterProviders) && Reflect.hasMetadata(surm.name, type));

        let providers: ParamProvider[] = [];
        matchs.forEach(surm => {
            let methodmtas = getMethodMetadata<MethodMetadata>(surm.name, type);
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

