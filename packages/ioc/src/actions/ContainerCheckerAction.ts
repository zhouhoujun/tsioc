import { IocAction, IocActionContext } from './Action';


export class ContainerCheckerAction extends IocAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (ctx.raiseContainer && ctx.raiseContainer === this.container) {
            next();
        }
    }
}
