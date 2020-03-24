import { ResolveContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';

export const ResolveInRootAction = function (ctx: ResolveContext, next: () => void): void {
    let container = ctx.getContainer();
    if (container.has(ctx.token)) {
        ctx.instance = container.get(ctx.token, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

