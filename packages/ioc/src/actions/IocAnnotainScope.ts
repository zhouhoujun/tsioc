import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorType } from '../factories';


export abstract class IocAnnoationScope extends IocCompositeAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!ctx.classDecors) {
            ctx.classDecors = new Map();
            Array.from(ctx.targetReflect.annotations.keys()).forEach(decor => {
                ctx.classDecors.set(decor, false);
            });
            ctx.classDecors.forEach((val, dec) => {
                ctx.currDecoractor = dec;
                ctx.currDecorType = DecoratorType.Class;
                super.execute(ctx, next);
            });
        } else if (!ctx.isClassCompleted()) {
            ctx.classDecors.forEach((val, dec) => {
                if (!val) {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = DecoratorType.Class;
                    super.execute(ctx, next);
                }
            });
        }
    }

    abstract setup();

}
