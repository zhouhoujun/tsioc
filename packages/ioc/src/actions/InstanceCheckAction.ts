import { IocRegisterAction, IocActionContext } from './Action';

export class InstanceCheckAction  extends IocRegisterAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.target) {
            return;
        }
        next();
    }
}
