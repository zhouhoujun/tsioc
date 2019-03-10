import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';


export class ContainerCheckerAction extends IocRegisterAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        let raiseContainer = ctx.getRaiseContainer();
        if (raiseContainer === this.container) {
            next();
        }
    }
}
