import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType} from './ActionType';
import { DecoratorType } from '../decorators';
import { ParameterMetadata } from '../metadatas/index';

export class ResetParamAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.resetParamType.toString(), decorName, decorType)
    }

    protected working(data: ActionData<ParameterMetadata>) {
        let parameters = data.paramMetadata;
        let designParams = data.designMetadata;
        if (Array.isArray(parameters) && parameters.length > 0) {
            parameters.forEach(params => {
                let parm = Array.isArray(params) && params.length > 0 ? params[0] : null;
                if (parm && parm.index >= 0 && parm.type) {
                    designParams[parm.index] = parm.type;
                }
            });
        }
    }
}

