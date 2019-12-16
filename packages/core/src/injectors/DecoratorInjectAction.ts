import { DecoratorScopes, DesignRegisterer, CTX_CURR_DECOR, ActionInjector } from '@tsdi/ioc';
import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';

export class DecoratorInjectAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (ctx.has(CTX_CURR_DECOR)) {
            let register = ctx.getContainer().getInstance(ActionInjector);
            let decRgr = register.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Injector);
            let actions = decRgr.getFuncs(register, ctx.get(CTX_CURR_DECOR));
            this.execFuncs(ctx, actions, next);
        } else {
            next && next();
        }
    }
}
