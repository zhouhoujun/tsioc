import { DecoratorScopes, DesignRegisterer, CTX_CURR_DECOR, ActionInjectorToken, lang } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';

export const DecoratorInjectAction = function (ctx: InjectActionContext, next?: () => void): void {
    if (ctx.has(CTX_CURR_DECOR)) {
        let register = ctx.get(ActionInjectorToken);
        let decRgr = register.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Inject);
        lang.execAction(decRgr.getFuncs(register, ctx.get(CTX_CURR_DECOR)), ctx, next);
    } else {
        next && next();
    }
};
