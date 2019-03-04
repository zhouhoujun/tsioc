import { IocAction, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';
import { DecoratorRegisterer, AfterInit } from '../services';
import { lang } from '@ts-ioc/core';
import { isFunction, isUndefined } from '../utils';

/**
 * component after init action, to run @Component decorator class after init hooks.
 *
 * @export
 * @class ComponentAfterInitAction
 * @extends {ActionComposite}
 */
export class ComponentAfterInitAction extends IocAction {

    execute(ctx: IocActionContext, next: () => void) {
        if (isUndefined(ctx.targetReflect.compAfterInit)) {
            let decors = this.container.resolve(DecoratorRegisterer).getClassDecorators(ctx.targetType, lang.getClass(this));
            ctx.targetReflect.compAfterInit = decors.length > 0
        }

        if (ctx.targetReflect.compAfterInit) {
            let component = ctx.target as AfterInit;
            if (isFunction(component.afterInit)) {
                this.container.syncInvoke(ctx.target || ctx.targetType, 'afterInit', ctx.target);
            }
        }
        next();
    }
}

