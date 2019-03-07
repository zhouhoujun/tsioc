import { IocResolveAction, IResovleContext } from './Action';
import { isNullOrUndefined } from '../utils';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: IResovleContext, next: () => void): void {
        if (ctx.raiseContainer.has(ctx.key)) {
            ctx.instance = ctx.factory(ctx.key)(...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
