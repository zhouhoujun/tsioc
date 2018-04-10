import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { ComponentLifecycle } from '../ComponentLifecycle';
import { isFunction } from '../../utils/index';
import { CoreActions } from './CoreActions';





export interface SingletionActionData extends ActionData<ClassMetadata> {

}

/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {ActionComposite}
 */
export class SingletionAction extends ActionComposite {

    constructor() {
        super(CoreActions.singletion)
    }

    protected working(container: IContainer, data: SingletionActionData) {
        if (data.tokenKey && data.target) {
            container.registerValue(data.tokenKey, data.target);
        }
    }
}

