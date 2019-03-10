import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';


export class CreateInstanceAction extends IocRegisterAction {
    execute(ctx: RegisterActionContext, next: () => void): void {

        if (!ctx.target) {
            ctx.target = new ctx.targetType(...ctx.args);
        }
        next();
    }
}
