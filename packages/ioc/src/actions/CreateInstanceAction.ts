import { IocRegisterAction, IocActionContext } from './Action';


export class CreateInstanceAction extends IocRegisterAction {
    execute(ctx: IocActionContext, next: () => void): void {

        if (!ctx.target) {
            ctx.target = new ctx.targetType(...ctx.args);
        }
        next();
    }
}
