import { isFunction } from '../../utils';
import { BeforeInit } from '../../services';
import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';

/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentBeforeInitAction
 * @extends {ActionComposite}
 */
export class ComponentBeforeInitAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        let component = ctx.target as BeforeInit;
        if (isFunction(component.beforeInit)) {
            this.container.invoke(ctx.target || ctx.targetType, 'beforeInit', ctx.target);
        }
        next();
    }
}

