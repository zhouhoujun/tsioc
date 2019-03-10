import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';

export class InstanceCheckAction  extends IocRegisterAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.target) {
            return;
        }
        next();
    }
}
