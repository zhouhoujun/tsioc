import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';





export interface ComponentBeforeInitActionData extends ActionData<ClassMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class ComponentBeforeInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentBeforeInit)
    }

    protected working(container: IContainer, data: ComponentBeforeInitActionData) {

        if (data.targetType && data.target) {
            let component = data.target as ComponentLifecycle;
            if (isFunction(component.beforeInit)) {
                container.syncInvoke(data.targetType, 'beforeInit', data.target);
            }
        }
    }
}

