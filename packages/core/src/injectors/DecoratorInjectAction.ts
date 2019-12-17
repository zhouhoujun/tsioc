import { DecoratorScopes, DesignRegisterer, CTX_CURR_DECOR, ActionInjectorToken } from '@tsdi/ioc';
import { InjectAction } from './InjectAction';
import { InjectActionContext } from './InjectActionContext';

export class DecoratorInjectAction extends InjectAction {
    execute(ctx: InjectActionContext, next?: () => void): void {
        if (ctx.has(CTX_CURR_DECOR)) {
            let register = ctx.get(ActionInjectorToken);
            let decRgr = register.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Injector);
            let actions = decRgr.getFuncs(register, ctx.get(CTX_CURR_DECOR));
            this.execFuncs(ctx, actions, next);
        } else {
            next && next();
        }
    }
}
