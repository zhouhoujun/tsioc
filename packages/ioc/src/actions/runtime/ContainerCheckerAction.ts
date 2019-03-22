import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';


export class ContainerCheckerAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        let raiseContainer = ctx.getRaiseContainer();
        if (raiseContainer === this.container) {
            next();
        }
    }
}
