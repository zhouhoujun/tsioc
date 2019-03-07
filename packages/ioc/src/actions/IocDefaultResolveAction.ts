import { IocResolveAction, IResovleContext } from './Action';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: IResovleContext, next: () => void): void {
        if(ctx.raiseContainer.has(ctx.key)){
            ctx.raiseContainer.
        }

        next();
    }
}
