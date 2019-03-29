import { AfterInit } from '../../services';
import { isFunction } from '../../utils';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';

/**
 * component after init action, to run @Component decorator class after init hooks.
 *
 * @export
 * @class ComponentAfterInitAction
 * @extends {ActionComposite}
 */
export class ComponentAfterInitAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let component = ctx.target as AfterInit;
        if (isFunction(component.afterInit)) {
            this.container.invoke(ctx.target || ctx.targetType, 'afterInit', ctx.target);
        }
        next();
    }
}
