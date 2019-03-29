import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { isClass, Singleton } from '@ts-ioc/ioc';


@Singleton
export class ModuleInjectorAction extends InjectorAction<InjectorActionContext> {
    execute(ctx: InjectorActionContext, next: () => void): void {
        if (isClass(ctx.targetType) && !this.container.has(ctx.targetType)) {
            this.container.register(ctx.targetType);
        }
        next();
    }
}
