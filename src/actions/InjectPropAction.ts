import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators';
import { IContainer } from '../IContainer';
import { ParamPropMetadata } from '../metadatas';


export interface InjectPropData extends ActionData<ParamPropMetadata> {
    props: ParamPropMetadata[];
}

export class InjectPropAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.injectProp.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: InjectPropData) {
        let restPropdata = data as InjectPropData;
        let props = restPropdata.props;
        let instance = restPropdata.instance;
        if (container && instance && Array.isArray(props) && props.length > 0) {
            props.forEach((prop, idx) => {
                instance[prop.propertyName] = container.get(prop.type);
            });
        }
    }
}

