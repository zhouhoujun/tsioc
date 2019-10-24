import { DecoratorScopes, DesignRegisterer } from '@tsdi/ioc';
import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';

export class DecoratorInjectAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (ctx.currDecoractor) {
            let decRgr = this.container.getInstance(DesignRegisterer).getRegisterer(DecoratorScopes.Injector);
            let actions = decRgr.getFuncs(this.container, ctx.currDecoractor);
            this.execFuncs(ctx, actions, next);
        } else {
            next && next();
        }
    }
}
