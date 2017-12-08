import { BindPropertyTypeActionData, BindPropertyTypeAction } from './BindPropertyTypeAction';
import { DecoratorType } from '../factories';
import { IContainer } from '../../IContainer';
import { PropertyMetadata } from '../metadatas';
import { CoreActions } from './CoreActions';


export interface BindPropertyActionData extends BindPropertyTypeActionData {

}

/**
 * bind property vaule action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyAction extends BindPropertyTypeAction {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(decorName, decorType, CoreActions.bindProperty.toString())
    }

    protected working(container: IContainer, data: BindPropertyTypeActionData) {
        super.working(container, data);

        if (data.target && data.props && data.props.length) {
            data.props.forEach((prop, idx) => {
                if (prop) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    if (container.has(token)) {
                        data.target[prop.propertyKey] = container.get(token);
                    }
                }
            });
        }
    }
}

