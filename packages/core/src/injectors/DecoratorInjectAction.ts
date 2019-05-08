import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { ModuleDecoratorRegisterer } from '../services';

export class DecoratorInjectAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (ctx.currDecoractor) {
            let decRgr = this.container.get(ModuleDecoratorRegisterer);
            if (decRgr.has(ctx.currDecoractor)) {
                let actions = decRgr.getFuncs(this.container, ctx.currDecoractor);
                this.execFuncs(ctx, actions, next);
            } else {
                next && next();
            }
        } else {
            next && next();
        }
    }
}
