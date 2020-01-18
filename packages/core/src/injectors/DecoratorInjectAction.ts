import { DecoratorScopes, DesignRegisterer, CTX_CURR_DECOR, lang } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';

export const DecoratorInjectAction = function (ctx: InjectActionContext, next?: () => void): void {
    if (ctx.has(CTX_CURR_DECOR)) {
        let actInj = ctx.reflects.getActionInjector()
        let decRgr = actInj.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Inject);
        lang.execAction(decRgr.getFuncs(actInj, ctx.get(CTX_CURR_DECOR)), ctx, next);
    } else {
        next && next();
    }
};
