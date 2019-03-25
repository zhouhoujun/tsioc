import { DecoratorType } from '../factories';
import { RegisterActionContext } from './RegisterActionContext';
import { IocCompositeAction } from './IocCompositeAction';

/**
 * ioc bind method actions scope.
 *
 * @export
 * @class IocBindMethodScope
 * @extends {IocRuntimeScopeAction}
 */
export abstract class IocMethodScope extends IocCompositeAction<RegisterActionContext>  {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!ctx.methodDecors) {
            ctx.methodDecors = new Map();
            Array.from(ctx.targetReflect.methodParamProviders.keys()).forEach(decor => {
                ctx.methodDecors.set(decor, false);
            });
            ctx.methodDecors.forEach((val, dec) => {
                ctx.currDecoractor = dec;
                ctx.currDecorType = DecoratorType.Method;
                super.execute(ctx, next);
            });
        } else if (!ctx.isMethodCompleted()) {
            ctx.methodDecors.forEach((val, dec) => {
                if (!val) {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = DecoratorType.Method;
                    super.execute(ctx, next);
                }
            });
        }
    }

    abstract setup();
}
