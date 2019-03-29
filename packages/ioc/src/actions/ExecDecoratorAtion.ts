import { DecoratorScopeRegisterer } from '../services/DecoratorRegisterer';
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
            let decor = this.getScopeRegisterer();
            if (decor.has(ctx.currDecoractor, ctx.currDecorScope)) {
                let actions = decor.get(ctx.currDecoractor, ctx.currDecorScope);
                this.execActions(ctx, [...this.befores, ...actions, ...this.afters], next);
            } else {
                next && next();
            }
        } else {
            next && next();
        }
    }
    protected abstract getScopeRegisterer(): DecoratorScopeRegisterer;
}

