import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';

export class ResolveInRootAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        let container = ctx.getContainer();
        if (container.has(ctx.token)) {
            ctx.instance = container.get(ctx.token, ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}

