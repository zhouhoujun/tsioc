import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';





export interface ComponentInitActionData extends ActionData<ClassMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class ComponentInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentInit)
    }

    protected working(container: IContainer, data: ComponentInitActionData) {
        if (data.targetType && data.target) {
            let component = data.target as ComponentLifecycle;
            if (isFunction(component.onInit)) {
                container.syncInvoke(data.targetType, 'onInit', data.target);
            }
        }
    }
}

