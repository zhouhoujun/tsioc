import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators';
import { IContainer } from '../IContainer';
import { ParamPropMetadata } from '../metadatas';


export interface InjectPropData extends ActionData<ParamPropMetadata> {
    props: ParamPropMetadata[];
    container: IContainer;
}

export class InjectPropAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.injectProp.toString(), decorName, decorType)
    }

    protected working(data: InjectPropData) {
        let restPropdata = data as InjectPropData;
        let props = restPropdata.props;
        let instance = restPropdata.instance;
        let container = restPropdata.container;
        if (container && instance && Array.isArray(props) && props.length > 0) {
            props.forEach((prop, idx) => {
                instance[prop.propertyName] = container.get(prop.type);
            });
        }
    }
}

