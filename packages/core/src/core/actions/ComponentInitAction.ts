import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { OnInit } from '../ComponentLifecycle';
import { isFunction } from '../../utils';
import { CoreActions } from './CoreActions';
import { DecoratorType } from '../factories';



/**
 * component init action data.
 *
 * @export
 * @interface ComponentInitActionData
 * @extends {ActionData<ClassMetadata>}
 */
export interface ComponentInitActionData extends ActionData<ClassMetadata> {

}

/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentInitAction
 * @extends {ActionComposite}
 */
export class ComponentInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentInit)
    }

    protected working(container: IContainer, data: ComponentInitActionData) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            if (container.getLifeScope().hasDecorator(data.targetType, DecoratorType.Class, surm => surm.actions.includes(CoreActions.componentInit))) {
                let component = data.target as OnInit;
                if (isFunction(component.onInit)) {
                    container.syncInvoke(data.target || data.targetType, 'onInit', data.target);
                }
            }
        }
    }
}

