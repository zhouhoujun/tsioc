import { IocAction } from './Action';
import { RegisterActionContext, CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from './RegisterActionContext';
import { DecoratorsRegisterer } from './DecoratorsRegisterer';


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocAction<RegisterActionContext>}
 */
export abstract class ExecDecoratorAtion extends IocAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (ctx.hasContext(CTX_CURR_DECOR)) {
            let decor = this.getScopeRegisterer();
            let currDec = ctx.getContext(CTX_CURR_DECOR);
            let currScope = ctx.getContext(CTX_CURR_DECOR_SCOPE);
            if (decor.has(currDec, currScope)) {
                let actions = decor.getFuncs(this.container, currDec, currScope);
                this.execFuncs(ctx, actions, next);
            } else {
                next && next();
            }
        } else {
            next && next();
        }
    }
    protected abstract getScopeRegisterer(): DecoratorsRegisterer;
}

