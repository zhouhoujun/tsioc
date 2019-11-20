import { DecoratorScopes, DesignRegisterer, CTX_CURR_DECOR } from '@tsdi/ioc';
import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';

export class DecoratorInjectAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (ctx.hasContext(CTX_CURR_DECOR)) {
            let decRgr = this.container.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Injector);
            let actions = decRgr.getFuncs(this.container, ctx.getContext(CTX_CURR_DECOR));
            this.execFuncs(ctx, actions, next);
        } else {
            next && next();
        }
    }
}
