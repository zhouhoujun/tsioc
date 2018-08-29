import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { BeforeInit } from '../ComponentLifecycle';
import { isFunction } from '../../utils';
import { CoreActions } from './CoreActions';



/**
 * component before init action data.
 *
 * @export
 * @interface ComponentBeforeInitActionData
 * @extends {ActionData<ClassMetadata>}
 */
export interface ComponentBeforeInitActionData extends ActionData<ClassMetadata> {

}

/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentBeforeInitAction
 * @extends {ActionComposite}
 */
export class ComponentBeforeInitAction extends ActionComposite {

    constructor() {
        super(CoreActions.componentBeforeInit)
    }

    protected working(container: IContainer, data: ComponentBeforeInitActionData) {
        if (data.raiseContainer && data.raiseContainer !== container) {
            return;
        }
        if (data.targetType && data.target) {
            let component = data.target as BeforeInit;
            if (isFunction(component.beforeInit)) {
                container.syncInvoke(data.targetType, 'beforeInit', data.target);
            }
        }
    }
}

