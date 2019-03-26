import { DecoratorRegisterer } from '../services/DecoratorRegisterer';
import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocCompositeAction<RegisterActionContext>}
 */
export abstract class ExecDecoratorAtion extends IocCompositeAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (ctx.currDecoractor) {
            let decor = this.getRegisterer();
            if (decor.has(ctx.currDecoractor, ctx.currDecorType)) {
                let actions = decor.get(ctx.currDecoractor, ctx.currDecorType);
                this.execActions(ctx, [...this.befores, ...actions, ...this.afters], next);
            } else {
                next && next();
            }
        } else {
            next && next();
        }
    }
    protected abstract getRegisterer(): DecoratorRegisterer;
}

