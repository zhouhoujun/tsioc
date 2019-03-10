import { IIocContainer } from '../IIocContainer';
import { isUndefined, lang, isFunction } from '../utils';
import { DecoratorRegisterer, BeforeInit } from '../services';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';

/**
 * component before init action, to run @Component decorator class before init hooks.
 *
 * @export
 * @class ComponentBeforeInitAction
 * @extends {ActionComposite}
 */
export class ComponentBeforeInitAction extends IocRegisterAction {

    constructor(container: IIocContainer) {
        super(container)
    }

    execute(ctx: RegisterActionContext, next: () => void) {
        if (isUndefined(ctx.targetReflect.compBeforeInit)) {
            let decors = this.container.resolve(DecoratorRegisterer).getClassDecorators(ctx.targetType, lang.getClass(this));
            ctx.targetReflect.compBeforeInit = decors.length > 0
        }
        if (ctx.targetReflect.compBeforeInit) {
            let component = ctx.target as BeforeInit;
            if (isFunction(component.beforeInit)) {
                this.container.syncInvoke(ctx.target || ctx.targetType, 'beforeInit', ctx.target);
            }

        }
        next();
    }
}

