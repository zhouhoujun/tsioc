import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { isClass } from '@tsdi/ioc';

export class RegisterTypeAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        if (isClass(ctx.currType)) {
            this.container.register(ctx.currType);
            ctx.registered.push(ctx.currType);
        }
        next();
    }
}
