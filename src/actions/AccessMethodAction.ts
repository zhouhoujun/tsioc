import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType, Param } from '../decorators';
import { MethodMetadata } from '../metadatas/index';
import { IContainer } from '../IContainer';
import { ParamProvider } from '../IMethodAccessor';
import { isArray } from 'util';

export interface AccessMethodData extends ActionData<MethodMetadata> {
    propertyKey: string | symbol;
    /**
     * param providers.
     *
     * @type {ParamProvider[]}
     * @memberof AccessorMethodData
     */
    providers?: ParamProvider[];
}

export class AccessMethodAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.setParamType.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: AccessMethodData) {
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

