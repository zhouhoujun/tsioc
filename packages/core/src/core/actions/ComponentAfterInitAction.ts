import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { AfterInit } from '../ComponentLifecycle';
import { isFunction } from '../../utils';
import { CoreActions } from './CoreActions';


/**
 * component after init action data.
 *
 * @export
 * @interface ComponentAfterInitActionData
 * @extends {ActionData<ClassMetadata>}
 */
export interface ComponentAfterInitActionData extends ActionData<ClassMetadata> {

}

/**
 * component after init action, to run @Component decorator class after init hooks.
 *
 * @export
 * @class ComponentAfterInitAction
 * @extends {ActionComposite}
 */
export class ComponentAfterInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentAfterInit)
    }

    protected working(container: IContainer, data: ComponentAfterInitActionData) {
        if (data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            let component = data.target as AfterInit;
            if (isFunction(component.afterInit)) {
                container.syncInvoke(data.targetType, 'afterInit', data.target);
            }
        }
    }
}

