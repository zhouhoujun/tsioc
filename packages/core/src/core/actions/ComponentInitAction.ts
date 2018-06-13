import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { OnInit } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';



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
        if (data.targetType && data.target) {
            let component = data.target as OnInit;
            if (isFunction(component.onInit)) {
                container.syncInvoke(data.targetType, 'onInit', data.target);
            }
        }
    }
}

