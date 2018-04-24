import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { DecoratorType, getPropertyMetadata, hasPropertyMetadata } from '../factories/index';
import { PropertyMetadata } from '../metadatas/index';
import { IContainer } from '../../IContainer';

/**
 * bind property type action data.
 * 
 * @export
 * @interface BindPropertyTypeActionData
 * @extends {ActionData<PropertyMetadata[]>}
 */
export interface BindPropertyTypeActionData extends ActionData<PropertyMetadata[]> {

}

/**
 * bind property type action. to get the property autowride token of Type calss.  
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class BindPropertyTypeAction extends ActionComposite {

    constructor() {
        super(CoreActions.bindPropertyType)
    }

    protected working(container: IContainer, data: BindPropertyTypeActionData) {
        let target = data.target
        let type = data.targetType;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getPropertyDecorators(surm => surm.actions.includes(CoreActions.bindPropertyType) && hasPropertyMetadata(surm.name, type));
        let list: PropertyMetadata[] = [];
        matchs.forEach(surm => {
            let propMetadata = getPropertyMetadata<PropertyMetadata>(surm.name, type);

            for (let n in propMetadata) {
                list = list.concat(propMetadata[n]);
            }
            list = list.filter(n => !!n);
            list.forEach(parm => {
                if (lifeScope.isVaildDependence(parm.provider)) {
                    if (!container.has(parm.provider, parm.alias)) {
                        container.register(container.getToken(parm.provider, parm.alias));
                    }
                }
                if (lifeScope.isVaildDependence(parm.type)) {
                    if (!container.has(parm.type)) {
                        container.register(parm.type);
                    }
                }
            });
        });

        data.execResult = list;
    }
}

