import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType, Param } from '../decorators';
import { ParameterMetadata } from '../metadatas/index';
import { IContainer } from '../IContainer';

export class SetParamAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.bindParameterType.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: ActionData<ParameterMetadata>) {
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

