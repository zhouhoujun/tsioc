import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';



/**
 * singleton action data.
 *
 * @export
 * @interface SingletionActionData
 * @extends {ActionData<ClassMetadata>}
 */
export interface SingletionActionData extends ActionData<ClassMetadata> {

}

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {ActionComposite}
 */
export class SingletionAction extends ActionComposite {

    constructor() {
        super(CoreActions.singletion)
    }

    protected working(container: IContainer, data: SingletionActionData) {
        if (data.tokenKey && data.target && data.singleton) {
            container.registerValue(data.tokenKey, data.target);
        }
    }
}

