import { DesignRegisterer, CTX_CURR_DECOR, chain, DecoratorScopes } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';

export const DecoratorInjectAction = function (ctx: InjectActionContext, next?: () => void): void {
    if (ctx.hasValue(CTX_CURR_DECOR)) {
        let actInj = ctx.reflects.getActionInjector()
        let decRgr = actInj.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Inject);
        chain(decRgr.getFuncs(actInj, ctx.getValue(CTX_CURR_DECOR)), ctx, next);
    } else {
        next && next();
    }
};
