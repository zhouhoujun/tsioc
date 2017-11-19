import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType} from './ActionType';
import { DecoratorType } from '../decorators';
import { ParameterMetadata } from '../metadatas/index';


export interface ResetPropData extends  ActionData<ParameterMetadata> {
    props: ParameterMetadata[];
}

export class ResetPropAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.resetPropType.toString(), decorName, decorType)
    }

    protected working(data: ActionData<ParameterMetadata>) {
        let restPropdata = data as ResetPropData;
        let props = data.metadata;
        if (Array.isArray(props)) {
            props = {};
        }
        let list = [];
        for (let n in props) {
            list = list.concat(props[n]);
        }

       restPropdata.props = (restPropdata.props || []).concat(list);
    }
}

