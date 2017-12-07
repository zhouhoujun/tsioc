import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType } from '../factories';
import { MethodMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';
import { ParamProvider } from '../../ParamProvider';
import { isArray } from 'util';

export interface BindParameterProviderActionData extends ActionData<MethodMetadata> {
    /**
     * method name.
     *
     * @type {(string | symbol)}
     * @memberof BindParameterProviderActionData
     */
    propertyKey: string | symbol;
    /**
     * param providers.
     *
     * @type {ParamProvider[]}
     * @memberof AccessorMethodData
     */
    providers?: ParamProvider[];
}

export class BindParameterProviderAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(CoreActions.bindParameterType.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: BindParameterProviderActionData) {
        let methodmtas = data.methodMetadata;
        let propertyKey = data.propertyKey;
        let designParams = data.designMetadata;
        let metadatas = methodmtas[propertyKey];
        if (metadatas && isArray(metadatas) && metadatas.length > 0) {
            data.providers = data.providers || [];
            metadatas.forEach(meta => {
                if (meta.providers && meta.providers.length > 0) {
                    data.providers = data.providers.concat(meta.providers);
                }
            });
        }
    }
}

