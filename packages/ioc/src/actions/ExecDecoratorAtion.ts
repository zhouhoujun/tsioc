import { IActionInjector } from './Action';
import { DecorsRegisterer } from './DecorsRegisterer';
import { CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from '../context-tokens';
import { RegContext, IocRegAction } from './IocRegAction';


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocAction<RegContext>}
 */
export abstract class ExecDecoratorAtion extends IocRegAction<RegContext> {

    constructor(protected actInjector: IActionInjector) {
        super();
    }

    execute(ctx: RegContext, next?: () => void): void {
        if (ctx.hasValue(CTX_CURR_DECOR)) {
            let decor = this.getScopeRegisterer();
            let currDec = ctx.getValue(CTX_CURR_DECOR);
            let currScope = ctx.getValue(CTX_CURR_DECOR_SCOPE);
            if (decor.has(currDec, currScope)) {
                let actions = decor.getFuncs(this.actInjector, currDec, currScope);
                this.execFuncs(ctx, actions);
            }
        }
        next && next();
    }
    protected abstract getScopeRegisterer(): DecorsRegisterer;
}

