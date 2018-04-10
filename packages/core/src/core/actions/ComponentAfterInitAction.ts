import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';





export interface ComponentAfterInitActionData extends ActionData<ClassMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class ComponentAfterInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentAfterInit)
    }

    protected working(container: IContainer, data: ComponentAfterInitActionData) {
        if (data.targetType && data.target) {
            let component = data.target as ComponentLifecycle;
            if (isFunction(component.afterInit)) {
                container.syncInvoke(data.targetType, 'afterInit', data.target);
            }
        }
    }
}

