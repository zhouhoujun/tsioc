import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
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
        if (data.raiseContainer !== container) {
            return;
        }
        if (data.tokenKey && data.target && data.singleton) {
            container.registerValue(data.tokenKey, data.target);
        }
    }
}

