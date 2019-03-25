import { DecoratorType } from '../factories';
import { RegisterActionContext } from './RegisterActionContext';
import { IocCompositeAction } from './IocCompositeAction';

export abstract class IocPropertyScope extends IocCompositeAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!ctx.propsDecors) {
            ctx.propsDecors = new Map();
            Array.from(ctx.targetReflect.annotations.keys()).forEach(decor => {
                ctx.propsDecors.set(decor, false);
            });
            ctx.propsDecors.forEach((val, dec) => {
                ctx.currDecoractor = dec;
                ctx.currDecorType = DecoratorType.Property;
                super.execute(ctx, next);
            });
        } else if (!ctx.isPropertyCompleted()) {
            ctx.propsDecors.forEach((val, dec) => {
                if (!val) {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = DecoratorType.Property;
                    super.execute(ctx, next);
                }
            });
        }
    }

    abstract setup()

}
