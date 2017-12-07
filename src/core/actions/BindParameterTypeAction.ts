import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType } from '../factories';
import { ParameterMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';


export interface BindParameterTypeActionData extends ActionData<ParameterMetadata> {
}

export class BindParameterTypeAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(CoreActions.bindParameterType.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: BindParameterTypeActionData) {
        let parameters = data.paramMetadata;
        let designParams = data.designMetadata;
        if (Array.isArray(parameters) && parameters.length > 0) {
            parameters.forEach(params => {
                let parm = Array.isArray(params) && params.length > 0 ? params[0] : null;
                if (parm && parm.index >= 0) {
                    if (container.isVaildDependence(parm.provider)) {
                        if (!container.has(parm.provider, parm.alias)) {
                            container.register(container.getToken(parm.provider, parm.alias));
                        }
                    }
                    if (container.isVaildDependence(parm.type)) {
                        if (!container.has(parm.type)) {
                            container.register(parm.type);
                        }
                    }
                    let token = parm.provider ? container.getTokenKey(parm.provider, parm.alias) : parm.type;
                    if (token) {
                        designParams[parm.index] = token;
                    }
                }
            });
        }
    }
}

