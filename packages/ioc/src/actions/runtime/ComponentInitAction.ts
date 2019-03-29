import { isFunction } from '../../utils';
import { OnInit } from '../../services';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';

/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentInitAction
 * @extends {ActionComposite}
 */
export class ComponentInitAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void) {
        let component = ctx.target as OnInit;
        if (isFunction(component.onInit)) {
            this.container.invoke(ctx.target || ctx.targetType, 'onInit', ctx.target);
        }
        next();
    }
}
