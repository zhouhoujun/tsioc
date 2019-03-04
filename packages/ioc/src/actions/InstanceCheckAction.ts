import { IocAction, IocActionContext } from './Action';

export class InstanceCheckAction  extends IocAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.target) {
            return;
        }
        next();
    }
}
