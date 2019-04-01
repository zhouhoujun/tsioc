import { DecoratorScopeRegisterer } from '../services/DecoratorRegisterer';
import { RegisterActionContext } from './RegisterActionContext';
import { IocAction } from './Action';


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocAction<RegisterActionContext>}
 */
export abstract class ExecDecoratorAtion extends IocAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (ctx.currDecoractor) {
            let decor = this.getScopeRegisterer();
            if (decor.has(ctx.currDecoractor, ctx.currDecorScope)) {
                let actions = decor.get(ctx.currDecoractor, ctx.currDecorScope);
                this.execActions(ctx, actions, next);
            } else {
                next && next();
            }
        } else {
            next && next();
        }
    }
    protected abstract getScopeRegisterer(): DecoratorScopeRegisterer;
}

