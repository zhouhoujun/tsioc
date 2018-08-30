import { ActionComposite } from './ActionComposite';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { getPropertyMetadata, hasPropertyMetadata } from '../factories';
import { PropertyMetadata } from '../metadatas';
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
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
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
            list.forEach(prop => {
                if (lifeScope.isVaildDependence(prop.provider)) {
                    if (!container.has(prop.provider, prop.alias)) {
                        container.register(container.getToken(prop.provider, prop.alias));
                    }
                }
                if (lifeScope.isVaildDependence(prop.type)) {
                    if (!container.has(prop.type)) {
                        container.register(prop.type);
                    }
                }
            });
        });

        data.execResult = list;
    }
}

