import { isNullOrUndefined } from '../../utils';
import { ResovleActionContext } from './ResovleActionContext';
import { IocResolveAction } from './IocResolveAction';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResovleActionContext, next: () => void): void {
        if (ctx.has(ctx.token)) {
            ctx.instance = ctx.resolve(ctx.token, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
