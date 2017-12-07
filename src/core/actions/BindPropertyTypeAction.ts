import { ActionComposite } from './ActionComposite';
import { ActionData } from './ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType } from '../factories';
import { PropertyMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';


export interface BindPropertyTypeActionData extends ActionData<PropertyMetadata> {
    props: PropertyMetadata[];
}

/**
 * set property type action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyTypeAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType, name?: string) {
        super(name || CoreActions.bindPropertyType.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: BindPropertyTypeActionData) {
        let restPropdata = data as BindPropertyTypeActionData;
        let props = data.propMetadata;
        if (Array.isArray(props)) {
            props = {};
        }
        let list: PropertyMetadata[] = [];
        for (let n in props) {
            list = list.concat(props[n]);
        }
        list = list.filter(n => !!n);
        list.forEach(parm => {
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
        });

        restPropdata.props = (restPropdata.props || []).concat(list);
    }
}

