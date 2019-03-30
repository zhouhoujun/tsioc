import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';

export class InjectCompleteCheckAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        if (!ctx.injected) {
            next();
        }
    }
}
