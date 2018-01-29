import { ActionData } from '../ActionData';
import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { IContainer } from '../../IContainer';
import { Component } from '../decorators/index';
import { hasClassMetadata, getTypeMetadata } from '../factories/index';
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

        if (data.targetType && data.target && hasClassMetadata(Component, data.targetType)) {
            let component = data.target as ComponentLifecycle;
            let metas = getTypeMetadata<ClassMetadata>(Component, data.targetType);
            if (isFunction(component.beforeInit)) {
                component.beforeInit();
            }
        }
    }
}

