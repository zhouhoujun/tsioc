import { BindPropertyTypeActionData, BindPropertyTypeAction } from './BindPropertyTypeAction';
import { DecoratorType } from '../factories/index';
import { IContainer } from '../../IContainer';
import { PropertyMetadata } from '../metadatas/index';
import { CoreActions } from './CoreActions';
import { ActionComposite } from './ActionComposite';
import { ActionComponent } from './ActionComponent';


export interface BindPropertyActionData extends BindPropertyTypeActionData {

}

/**
 * bind property vaule action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class InjectPropertyAction extends ActionComposite {

    constructor() {
        super(CoreActions.injectProperty)
    }

    protected working(container: IContainer, data: BindPropertyTypeActionData) {
        if (!data.execResult) {
            this.parent.find<ActionComponent>(act => act.name === CoreActions.bindPropertyType).execute(container, data);
        }

        if (data.target && data.execResult && data.execResult.length) {
            data.execResult.forEach((prop, idx) => {
                if (prop) {
                    let token = prop.provider ? container.getToken(prop.provider, prop.alias) : prop.type;
                    console.log('inject Property', prop.propertyKey, token)
                    if (container.has(token)) {
                        data.target[prop.propertyKey] = container.get(token);
                    }
                }
            });
        }
    }
}

