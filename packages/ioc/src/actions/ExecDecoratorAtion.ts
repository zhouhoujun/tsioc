import { IActionInjector } from './Action';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorsRegisterer } from './DecoratorsRegisterer';
import { CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from '../context-tokens';
import { IocAction } from './IocAction';


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocAction<RegisterActionContext>}
 */
export abstract class ExecDecoratorAtion extends IocAction<RegisterActionContext> {

    constructor(protected actInjector: IActionInjector) {
        super();
    }

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (ctx.has(CTX_CURR_DECOR)) {
            let decor = this.getScopeRegisterer();
            let currDec = ctx.get(CTX_CURR_DECOR);
            let currScope = ctx.get(CTX_CURR_DECOR_SCOPE);
            if (decor.has(currDec, currScope)) {
                let actions = decor.getFuncs(this.actInjector, currDec, currScope);
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

