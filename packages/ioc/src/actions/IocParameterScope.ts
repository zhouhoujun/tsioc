import { DecoratorType } from '../factories';
import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';



export abstract class IocParameterScope extends IocCompositeAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!ctx.paramDecors) {
            ctx.paramDecors = new Map();
            Array.from(ctx.targetReflect.annotations.keys()).forEach(decor => {
                ctx.paramDecors.set(decor, false);
            });
            ctx.paramDecors.forEach((val, dec) => {
                ctx.currDecoractor = dec;
                ctx.currDecorType = DecoratorType.Parameter;
                super.execute(ctx, next);
            });
        } else if (!ctx.isPropertyCompleted()) {
            ctx.paramDecors.forEach((val, dec) => {
                if (!val) {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = DecoratorType.Parameter;
                    super.execute(ctx, next);
                }
            });
        }
    }

    abstract setup();

}
