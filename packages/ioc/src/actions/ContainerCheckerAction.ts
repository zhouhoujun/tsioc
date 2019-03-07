import { IocRegisterAction, IocActionContext } from './Action';


export class ContainerCheckerAction extends IocRegisterAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (ctx.raiseContainer && ctx.raiseContainer === this.container) {
            next();
        }
    }
}
